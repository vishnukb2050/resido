import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

export const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000';

/**
 * The Socket.IO host. In production, nginx only proxies `/socket.io/` to the
 * chat-service from the root domain (NOT the `/api/` path), so we must connect
 * to the root host. Falls back to deriving from `API_URL` by stripping a
 * trailing `/api` so local development with `http://10.0.2.2:3000` keeps working.
 */
export const SOCKET_URL: string =
    (Constants.expoConfig?.extra as any)?.socketUrl ||
    API_URL.replace(/\/api\/?$/, '') ||
    API_URL;

export const api = axios.create({ baseURL: API_URL });

// Inject auth token and tenantId from secure store on every request.
//
// The chat-service and several other tenant-scoped services REQUIRE the
// `x-db-name` header. In MySpace mode (no active workspace) we used to send
// the request without those headers, which broke chat ("could not start chat")
// and any other tenant-scoped call. As a fallback, we use the first
// workspace the user belongs to, then finally a synthetic `personal_<userId>`
// db name so the request still reaches the service with something to scope on.
api.interceptors.request.use(async (config) => {
    try {
        const authDataRaw = await SecureStore.getItemAsync('resido-auth-secure-storage');
        if (authDataRaw) {
            const authData = JSON.parse(authDataRaw);
            const state = authData.state;
            
            if (state.token) {
                config.headers.set('Authorization', `Bearer ${state.token}`);
            }

            if (state.user?.id) {
                config.headers.set('x-user-id', state.user.id);
            }

            const active = state.activeWorkspace;
            const firstWs = Array.isArray(state.workspaces) && state.workspaces.length > 0 ? state.workspaces[0] : null;

            const tenantId = active?.tenantId || firstWs?.tenantId;
            // Tenant-scoped services (chat-service in particular) look up an actual
            // Postgres database with this name, so we MUST point at a real tenant.
            // Fall back to the user's first workspace; if they have none, leave
            // both headers off so the backend can respond with a clear error.
            const dbName = active?.dbName || firstWs?.dbName || tenantId;

            if (tenantId) config.headers.set('x-tenant-id', tenantId);
            if (dbName) config.headers.set('x-db-name', dbName);
        }
    } catch (error) {
        console.error('Error reading auth state for interceptor:', error);
    }
    return config;
});

// Response interceptor for better error visibility
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.warn('[API Error] 401 Unauthorized - Token may be invalid or expired');
        }
        console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, error.response?.status, error.response?.data);
        return Promise.reject(error);
    }
);

// Auth APIs
export const authApi = {
    sendOtp: (phone: string) => api.post('/auth/send-otp', { phone }),
    verifyOtp: (phone: string, otp: string) => api.post('/auth/verify-otp', { phone, otp }),
    getWorkspaces: () => api.get('/auth/workspaces'),
    switchWorkspace: (tenantId: string, role?: string) => api.post('/auth/switch-workspace', { tenantId, role }),
    refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
    createClient: (data: any) => api.post('/clients', data),
    getClient: (id: string) => api.get(`/clients/${id}`),
    updateClient: (id: string, data: any) => api.patch(`/clients/${id}`, data),
    getClientStaff: (id: string) => api.get(`/clients/${id}/staff`),
    addClientStaff: (id: string, data: any) => api.post(`/clients/${id}/staff`, data),
    removeClientStaff: (id: string, membershipId: string) => api.delete(`/clients/${id}/staff/${membershipId}`),
    deleteClient: (id: string, data: { confirmName: string }) => api.delete(`/clients/${id}`, { data }),
    leaveClient: (id: string) => api.post(`/clients/${id}/leave`),
    syncContacts: (phones: string[]) => api.post('/auth/sync-contacts', { phones }),
    searchUsers: (query: string) => api.get(`/profile/users/search?query=${query}`),
    searchUsersPublic: (query: string, limit = 10) =>
        api.get('/profile/users/search-public', { params: { query, limit } }),
    // Batch lookup of public identities (name, handle, photo, visibility,
    // linkBusinessProfile). Only returns users who opted in to "Link
    // Business Profile", so callers can use presence in the map as a
    // shortcut for "render the linked-owner chip on this business card".
    getPublicIdentitiesBatch: (ids: string[]) =>
        api.get('/profile/users/identities/batch', {
            params: { ids: (ids || []).filter(Boolean).join(',') },
        }),
    createMember: (data: any) => api.post('/members', data),
    syncMembership: (data: any) => api.post('/auth/sync-membership', data),
    syncMembershipDeactivation: (data: { phone: string; tenantId: string; role: string }) => api.post('/auth/sync-membership-deactivation', data),
    getUser: (id: string) => api.get(`/auth/users/${id}`),
    toggleFollow: (id: string, isFollowing: boolean) => isFollowing ? api.delete(`/profile/follow/${id}`) : api.post(`/profile/follow/${id}`),
    follow: (id: string) => api.post(`/profile/follow/${id}`),
    unfollow: (id: string) => api.delete(`/profile/follow/${id}`),
    getFollowing: () => api.get('/profile/following'),
    getFollowers: () => api.get('/profile/followers'),
    getFollowCounts: (id: string) => api.get(`/profile/follow/counts/${id}`),
    getUserFollowers: (id: string) => api.get(`/profile/follow/followers/${id}`),
    getUserFollowing: (id: string) => api.get(`/profile/follow/following/${id}`),
    getFollowStatus: (id: string) => api.get(`/profile/follow/status/${id}`),
    listFollowRequests: () => api.get('/profile/follow-requests'),
    acceptFollowRequest: (requestId: string) => api.post(`/profile/follow-requests/${requestId}/accept`),
    rejectFollowRequest: (requestId: string) => api.post(`/profile/follow-requests/${requestId}/reject`),
    getPublicProfile: (id: string) => api.get(`/profile/users/${id}`),
    getProfile: () => api.get('/profile/user'),
    updateProfile: (data: any, config?: any) => api.put('/profile/user', data, config),
    getPresignedUrl: (fileName: string, contentType: string, resourceType?: string) => 
        api.get('/profile/storage/presigned-url', { params: { fileName, contentType, resourceType } }),
    searchLocations: (query: string) => api.get('/profile/locations/search', { params: { query } }),
    reverseGeocode: (lat: number, lng: number) => api.get('/profile/locations/reverse-geocode', { params: { lat, lng } }),
    searchServiceProfiles: (params: { category?: string, pincode?: string, district?: string, state?: string, lat?: number, lng?: number, radius?: number }) => 
        api.get('/profile/search', { params }),
};

// Community APIs
export const communityApi = {
    getNotices: () => api.get('/community/notices'),
    createNotice: (data: any) => api.post('/community/notices', data),
    getPolls: () => api.get('/community/polls'),
    votePoll: (memberId: string, optionId: string) => api.post('/community/polls/vote', { memberId, optionId }),
    getComplaints: (memberId: string) => api.get(`/community/complaints?memberId=${memberId}`),
    getComplaintsAdmin: (params?: any) => api.get('/community/complaints', { params }),
    assignComplaint: (id: string, staffId: string) => api.post(`/community/complaints/${id}/assign`, { staffId }),
    updateComplaintStatus: (id: string, status: string) => api.post(`/community/complaints/${id}/status`, { status }),
    addComplaintProgress: (id: string, data: { message: string; photos?: string[]; status?: string; updatedBy?: string }) => 
        api.post(`/community/complaints/${id}/progress`, data),
    createComplaint: (data: any) => api.post('/community/complaints', data),
    getVisitors: (memberId: string) => api.get(`/community/visitors?memberId=${memberId}`),
    createGatepass: (data: any) => api.post('/community/visitors/gatepass', data),
    getGatepassDetails: (id: string) => api.get(`/community/visitors/${id}`),
    approveGatepassEntry: (id: string, securityMemberId: string, updates?: any) => api.patch(`/community/visitors/${id}/approve`, { securityMemberId, ...updates }),
    getEvents: (memberId: string) => api.get(`/community/events?memberId=${memberId}`),
    createEvent: (data: any) => api.post('/community/events', data),
    deleteEvent: (id: string) => api.delete(`/community/events/${id}`),
    getRules: (memberId?: string) => api.get(`/community/rules${memberId ? `?memberId=${memberId}` : ''}`),
    createRule: (data: any) => api.post('/community/rules', data),
    updateRule: (id: string, data: any) => api.patch(`/community/rules/${id}`, data),
    deleteRule: (id: string) => api.delete(`/community/rules/${id}`),
    getMembers: () => api.get('/community/members'),
    getGallery: () => api.get('/community/gallery'),
    getSummaryStats: () => api.get('/community/stats/summary'),

    // Attendance
    getAttendanceConfig: () => api.get('/community/attendance/config'),
    setAttendanceConfig: (data: { latitude: number; longitude: number; radiusMeters?: number; address?: string }) =>
        api.put('/community/attendance/config', data),
    markAttendance: (data: { latitude: number; longitude: number; notes?: string }) =>
        api.post('/community/attendance/mark', data),
    listAttendance: (params?: { from?: string; to?: string; date?: string; memberId?: string }) =>
        api.get('/community/attendance/records', { params }),
    listOwnAttendance: (params?: { from?: string; to?: string; date?: string }) =>
        api.get('/community/attendance/me', { params }),
    
    // Blocks & Units
    getBlocks: () => api.get('/community/blocks'),
    createBlock: (data: any) => api.post('/community/blocks', data),
    updateBlock: (id: string, data: any) => api.patch(`/community/blocks/${id}`, data),
    deleteBlock: (id: string) => api.delete(`/community/blocks/${id}`),
    getUnits: (blockId?: string) => api.get(`/community/units`, { params: { blockId } }),
    createUnit: (data: any) => api.post('/community/units', data),
    updateUnit: (id: string, data: any) => api.patch(`/community/units/${id}`, data),
    deleteUnit: (id: string) => api.delete(`/community/units/${id}`),
};


export const visitorApi = {
    verifyGatepass: (id: string) => api.get(`/visitors/gatepass/${id}`),
    getRegister: () => api.get('/visitors/register'),
    createEntry: (data: any) => api.post('/visitors', data),
    getEntries: (params?: any) => api.get('/visitors/register', { params }),
    checkoutVisitor: (id: string) => api.post(`/visitors/${id}/checkout`),
};

// Resident APIs (Proxy to resident-service via /members, /community, etc)
export const residentApi = {
    getMembers: (params?: any) => api.get('/members', { params }),
    getMember: (id: string) => api.get(`/members/${id}`),
    createMember: (data: any) => api.post('/members', data),
    updateMember: (id: string, data: any) => api.patch(`/members/${id}`, data),
    deleteMember: (id: string) => api.delete(`/members/${id}`),
    getFamilies: () => api.get('/members/families'), // Adjust if needed
    getUnits: () => api.get('/members/units'),
    getNotices: () => api.get('/community/notices'),
    createNotice: (data: any) => api.post('/community/notices', data),
    getPolls: () => api.get('/community/polls'),
    createPoll: (data: any) => api.post('/community/polls', data),
    votePoll: (pollId: string, optionId: string) => api.post(`/community/polls/${pollId}/vote`, { optionId }),
    getGroups: () => api.get('/community/groups'),
};

export const amenitiesApi = {
    getAmenities: () => api.get('/community/amenities'),
    getAmenity: (id: string, date?: string) => api.get(`/community/amenities/${id}`, { params: { date } }),
    createAmenity: (data: any) => api.post('/community/amenities', data),
    updateAmenity: (id: string, data: any) => api.patch(`/community/amenities/${id}`, data),
    deleteAmenity: (id: string) => api.delete(`/community/amenities/${id}`),
    bookAmenity: (id: string, data: any) => api.post(`/community/amenities/${id}/book`, data),
    getAmenityBookings: (id: string, date: string) => api.get(`/community/amenities/${id}/bookings`, { params: { date } }),
    getMyBookings: () => api.get('/community/amenities/my-bookings'),
};

// Business APIs
/** Normalize list response from GET /business/profiles (array legacy or paginated object). */
export function unpackBusinessProfileList(data: any): { items: any[]; total: number; hasMore: boolean } {
    if (data && Array.isArray(data.items)) {
        return {
            items: data.items,
            total: typeof data.total === 'number' ? data.total : data.items.length,
            hasMore: !!data.hasMore,
        };
    }
    const items = Array.isArray(data) ? data : [];
    return { items, total: items.length, hasMore: false };
}

export const businessApi = {
    createProfile: (data: any) => api.post('/business/profiles', data),
    getProfiles: (params?: any) => api.get('/business/profiles', { params }),
    suggestProfiles: (q: string, limit = 10) => api.get('/business/suggest', { params: { q, limit } }),
    getMyProfiles: () => api.get('/business/profiles/my'),
    getProfile: (id: string) => api.get(`/business/profiles/${id}`),
    updateProfile: (id: string, data: any) => api.patch(`/business/profiles/${id}`, data),
    deleteProfile: (id: string) => api.delete(`/business/profiles/${id}`),
    getCategories: () => api.get('/business/categories'),

    // Slots
    createSlot: (profileId: string, data: any) => api.post(`/business/profiles/${profileId}/slots`, data),
    updateSlot: (profileId: string, slotId: string, data: any) => api.patch(`/business/profiles/${profileId}/slots/${slotId}`, data),
    deleteSlot: (profileId: string, slotId: string) => api.delete(`/business/profiles/${profileId}/slots/${slotId}`),
    getSlots: (profileId: string, date?: string) => api.get(`/business/profiles/${profileId}/slots`, { params: { date } }),
    getSlot: (profileId: string, slotId: string, date?: string) => api.get(`/business/profiles/${profileId}/slots/${slotId}`, { params: { date } }),
    
    // Bookings
    bookSlot: (profileId: string, slotId: string, data: any) => api.post(`/business/profiles/${profileId}/slots/${slotId}/book`, data),
    getSlotBookings: (profileId: string, slotId: string, date: string) => api.get(`/business/profiles/${profileId}/slots/${slotId}/bookings`, { params: { date } }),
    getProfileBookings: (profileId: string) => api.get(`/business/profiles/${profileId}/bookings`),
    getMyBookings: () => api.get('/business/bookings/my'),
    cancelBooking: (bookingId: string) => api.patch(`/business/bookings/${bookingId}/cancel`),
    addBookingUpdate: (bookingId: string, data: { message?: string; photoUrl?: string }) =>
        api.post(`/business/bookings/${bookingId}/updates`, data),
    listBookingUpdates: (bookingId: string) =>
        api.get(`/business/bookings/${bookingId}/updates`),
    deleteBookingUpdate: (bookingId: string, updateId: string) =>
        api.delete(`/business/bookings/${bookingId}/updates/${updateId}`),
    // Analytics — view-count + owner-only booking report
    trackProfileView: (profileId: string) =>
        api.post(`/business/profiles/${profileId}/view`),
    getBookingReport: (profileId: string, params?: { from?: string; to?: string }) =>
        api.get(`/business/profiles/${profileId}/report`, { params }),
};

// Accounting APIs
export const accountingApi = {
    getTransactions: (params?: any) => api.get('/accounting/transactions', { params }),
    createTransaction: (data: any) => api.post('/accounting/transactions', data),
    getMonthlyReport: (year: number, month: number) => api.get('/accounting/reports/monthly', { params: { year, month } }),
};

// Thread & Flare APIs
export const threadApi = {
    getThreads: (params?: { feedType?: 'PUBLIC' | 'FOLLOWING' | 'MY' | 'RESHARE' | 'SAVED' | 'HASHTAG' | 'AUTHOR'; followingIds?: string[]; category?: string; businessProfileId?: string; hashtag?: string; authorId?: string }) => {
        const p = { ...params, followingIds: params?.followingIds?.join(',') };
        return api.get('/threads', { params: p });
    },
    getFlares: (params?: { feedType?: 'PUBLIC' | 'FOLLOWING' | 'MY' | 'RESHARE' | 'SAVED' | 'HASHTAG' | 'AUTHOR'; followingIds?: string[]; category?: string; businessProfileId?: string; hashtag?: string; authorId?: string }) => {
        const p = { ...params, followingIds: params?.followingIds?.join(',') };
        return api.get('/flares', { params: p });
    },
    getBusinessPosts: (businessProfileId: string) =>
        api.get('/blogs', { params: { businessProfileId } }),
    // Public profile timeline: returns the author's threads + flares with
    // per-post visibility still enforced server-side (so a non-follower
    // never sees a FOLLOWERS post even though it's filtered by authorId).
    getAuthorThreads: (authorId: string) =>
        api.get('/threads', { params: { feedType: 'AUTHOR', authorId } }),
    getAuthorFlares: (authorId: string) =>
        api.get('/flares', { params: { feedType: 'AUTHOR', authorId } }),
    // Hashtag-filtered feed. The backend ignores the tenant scope for this
    // call so public posts from other communities also show up.
    getThreadsByHashtag: (tag: string, followingIds?: string[]) =>
        api.get('/threads', { params: { feedType: 'HASHTAG', hashtag: tag, followingIds: (followingIds || []).join(',') } }),
    getFlaresByHashtag: (tag: string, followingIds?: string[]) =>
        api.get('/flares', { params: { feedType: 'HASHTAG', hashtag: tag, followingIds: (followingIds || []).join(',') } }),
    // Hashtag suggestions for the search dropdowns. `type` narrows the
    // suggested tags to THREAD-only or FLARE-only so each screen's
    // search popover only surfaces tags it can actually navigate to.
    suggestHashtags: (q: string, type: 'THREAD' | 'FLARE') => {
        const path = type === 'FLARE' ? '/flares/hashtags/suggest' : '/threads/hashtags/suggest';
        return api.get(path, { params: { q, type } });
    },
    getThread: (id: string) => api.get(`/blogs/${id}`),
    createThread: (data: any) => api.post('/threads', data),
    createFlare: (data: any) => api.post('/flares', data),
    toggleLike: (id: string) => api.post(`/blogs/${id}/like`),
    addComment: (id: string, data: any) => api.post(`/blogs/${id}/comment`, data),
    getComments: (id: string) => api.get(`/blogs/${id}/comments`),
    reshare: (id: string, data?: any) => api.post(`/blogs/${id}/reshare`, data),
    toggleSave: (id: string) => api.post(`/blogs/${id}/save`),
    votePoll: (pollId: string, optionId: string) => api.post(`/blogs/polls/${pollId}/vote`, { optionId }),
    updateBlog: (id: string, data: any) => api.patch(`/blogs/${id}`, data),
    deleteBlog: (id: string) => api.delete(`/blogs/${id}`),
};

// Chat APIs
export const chatApi = {
    getConversations: () => api.get('/chat/conversations'),
    getMessages: (conversationId: string) => api.get(`/chat/conversations/${conversationId}/messages`),
    sendMessage: (
        conversationId: string,
        data: { content?: string; type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'AUDIO' | 'POLL'; mediaUrl?: string; poll?: any },
    ) => api.post(`/chat/conversations/${conversationId}/messages`, data),
    createConversation: (memberIds: string[], extra?: { name?: string; type?: 'DIRECT' | 'GROUP'; groupId?: string }) =>
        api.post('/chat/conversations', { memberIds, ...(extra || {}) }),
    startDirect: (otherUserId: string) =>
        api.post('/chat/conversations', { memberIds: [otherUserId], type: 'DIRECT' }),
    createGroup: (name: string, memberIds: string[]) =>
        api.post('/chat/conversations', { memberIds, name, type: 'GROUP' }),
    votePoll: (pollId: string, optionId: string) => api.post(`/chat/polls/${pollId}/vote`, { optionId }),
};

// Complaint APIs
export const complaintApi = {
    getComplaints: (params?: any) => api.get('/complaint/complaints', { params }),
    createComplaint: (data: any) => api.post('/complaint/complaints', data),
    updateStatus: (id: string, status: string) => api.patch(`/complaint/complaints/${id}/status`, { status }),
    addComment: (id: string, message: string) => api.post(`/complaint/complaints/${id}/comments`, { message }),
};

// My Space APIs
export const mySpaceApi = {
    getNoteFolders: () => api.get('/profile/notes/folders'),
    createNoteFolder: (name: string) => api.post('/profile/notes/folders', { name }),
    getNoteFolder: (id: string) => api.get(`/profile/notes/folders/${id}`),
    deleteNoteFolder: (id: string) => api.delete(`/profile/notes/folders/${id}`),
    createNotePage: (data: { folderId: string, title: string, content: string, color?: string }) => api.post('/profile/notes/pages', data),
    updateNotePage: (id: string, data: { title?: string, content?: string, color?: string }) => api.patch(`/profile/notes/pages/${id}`, data),
    deleteNotePage: (id: string) => api.delete(`/profile/notes/pages/${id}`),
    
    getDocumentFolders: () => api.get('/profile/documents/folders'),
    createDocumentFolder: (data: { name: string, color?: string, icon?: string }) => api.post('/profile/documents/folders', data),
    getDocumentFolder: (id: string) => api.get(`/profile/documents/folders/${id}`),
    deleteDocumentFolder: (id: string) => api.delete(`/profile/documents/folders/${id}`),
    addDocumentFile: (data: { folderId?: string, name: string, url: string, type: string, size?: number, title?: string, description?: string }) => api.post('/profile/documents/files', data),
    deleteDocumentFile: (id: string) => api.delete(`/profile/documents/files/${id}`),
    
    shareItem: (data: { type: 'NOTE' | 'DOC', itemId: string, targetType: 'COMMUNITY' | 'GROUP' | 'CONTACT', targetId: string, isFolder: boolean }) => api.post('/profile/share', data),
    getSharedNotes: () => api.get('/profile/notes/shared'),
    getSharedDocuments: () => api.get('/profile/documents/shared'),

    addIncome: (data: { source: string, amount: number, date: string, description?: string, receiptUrl?: string }) => api.post('/profile/finance/income', data),
    updateIncome: (id: string, data: { source?: string, amount?: number, date?: string, description?: string, receiptUrl?: string | null }) => api.patch(`/profile/finance/income/${id}`, data),
    deleteIncome: (id: string) => api.delete(`/profile/finance/income/${id}`),
    addExpense: (data: { amount: number, category: string, date: string, paymentMethod: string, description?: string, billUrl?: string }) => api.post('/profile/finance/expense', data),
    updateExpense: (id: string, data: { amount?: number, category?: string, date?: string, paymentMethod?: string, description?: string | null, billUrl?: string | null }) => api.patch(`/profile/finance/expense/${id}`, data),
    deleteExpense: (id: string) => api.delete(`/profile/finance/expense/${id}`),
    getFinanceReport: (params: { period: string, startDate?: string, endDate?: string }) => api.get('/profile/finance/report', { params }),
};

export const communityFinanceApi = {
    getConfig: () => api.get('/community/finance/maintenance/config'),
    updateConfig: (data: any) => api.post('/community/finance/maintenance/config', data),
    getTransactions: (params?: any) => api.get('/community/finance/transactions', { params }),
    addTransaction: (data: any) => api.post('/community/finance/transactions', data),
    generateBills: (month: number, year: number) => api.post('/community/finance/maintenance/generate', { month, year }),
    getStatus: (month: number, year: number) => api.get('/community/finance/maintenance/status', { params: { month, year } }),
    getResidentBills: () => api.get('/community/finance/maintenance/my-bills'),
    submitProof: (billId: string, data: { receiptUrl: string; paymentMethod: string; description?: string; amountPaid?: number }) =>
        api.post(`/community/finance/maintenance/submit-proof/${billId}`, data),
    verifyPayment: (billId: string, action: 'APPROVE' | 'REJECT', rejectionReason?: string, adminNote?: string) =>
        api.post(`/community/finance/maintenance/verify/${billId}`, { action, rejectionReason, adminNote }),
    getReports: (params: { period: 'day' | 'week' | 'month', year: number }) => api.get('/community/finance/reports', { params }),
};

export const communitySplitsApi = {
    create: (data: {
        purpose: string;
        description?: string;
        totalAmount: number;
        splitMode?: 'EQUAL' | 'CUSTOM';
        targetType: 'ALL' | 'BLOCKS' | 'UNITS';
        targetBlocks?: string[];
        targetUnits?: string[];
        customShares?: Record<string, number>;
        dueDate?: string | null;
    }) => api.post('/community/finance/splits', data),
    list: () => api.get('/community/finance/splits'),
    remove: (id: string) => api.delete(`/community/finance/splits/${id}`),
    mine: () => api.get('/community/finance/splits/mine'),
    submitProof: (shareId: string, data: { receiptUrl: string; paymentMethod: string; description?: string; amountPaid?: number }) =>
        api.post(`/community/finance/splits/submit-proof/${shareId}`, data),
    verify: (shareId: string, action: 'APPROVE' | 'REJECT', rejectionReason?: string, adminNote?: string) =>
        api.post(`/community/finance/splits/verify/${shareId}`, { action, rejectionReason, adminNote }),
};

export const communityAssetsApi = {
    getAssets: (params?: any) => api.get('/community/assets', { params }),
    getAsset: (id: string) => api.get(`/community/assets/${id}`),
    createAsset: (data: any) => api.post('/community/assets', data),
    updateAsset: (id: string, data: any) => api.patch(`/community/assets/${id}`, data),
    deleteAsset: (id: string) => api.delete(`/community/assets/${id}`),
};

export const communityRemindersApi = {
    getReminders: () => api.get('/community/reminders'),
    getMyReminders: () => api.get('/community/reminders/mine'),
    createReminder: (data: any) => api.post('/community/reminders', data),
    updateReminder: (id: string, data: any) => api.patch(`/community/reminders/${id}`, data),
    triggerReminder: (id: string) => api.post(`/community/reminders/${id}/trigger`),
    deleteReminder: (id: string) => api.delete(`/community/reminders/${id}`),
};
