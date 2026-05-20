import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

export const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000';

export const api = axios.create({ baseURL: API_URL });

// Inject auth token and tenantId from secure store on every request
api.interceptors.request.use(async (config) => {
    try {
        const authDataRaw = await SecureStore.getItemAsync('resido-auth-secure-storage');
        if (authDataRaw) {
            const authData = JSON.parse(authDataRaw);
            const state = authData.state;
            
            if (state.token) {
                config.headers.set('Authorization', `Bearer ${state.token}`);
            } else {
                // console.warn(`[API Request] No token found for ${config.url}`);
            }
            
            if (state.user?.id) {
                config.headers.set('x-user-id', state.user.id);
            }
            
            if (state.activeWorkspace?.tenantId) {
                config.headers.set('x-tenant-id', state.activeWorkspace.tenantId);
            }
            if (state.activeWorkspace?.dbName) {
                config.headers.set('x-db-name', state.activeWorkspace.dbName);
            } else if (state.activeWorkspace?.tenantId) {
                config.headers.set('x-db-name', state.activeWorkspace.tenantId);
            }

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
    syncContacts: (phones: string[]) => api.post('/auth/sync-contacts', { phones }),
    searchUsers: (query: string) => api.get(`/profile/users/search?query=${query}`),
    createMember: (data: any) => api.post('/members', data),
    syncMembership: (data: any) => api.post('/auth/sync-membership', data),
    getUser: (id: string) => api.get(`/auth/users/${id}`),
    toggleFollow: (id: string, isFollowing: boolean) => isFollowing ? api.delete(`/profile/follow/${id}`) : api.post(`/profile/follow/${id}`),
    getFollowing: () => api.get('/profile/following'),
    getProfile: () => api.get('/profile/user'),
    updateProfile: (data: any, config?: any) => api.put('/profile/user', data, config),
    getPresignedUrl: (fileName: string, contentType: string, resourceType?: string) => 
        api.get('/profile/storage/presigned-url', { params: { fileName, contentType, resourceType } }),
    searchLocations: (query: string) => api.get('/profile/locations/search', { params: { query } }),
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
    approveGatepassEntry: (id: string, securityMemberId: string) => api.patch(`/community/visitors/${id}/approve`, { securityMemberId }),
    getEvents: (memberId: string) => api.get(`/community/events?memberId=${memberId}`),
    createEvent: (data: any) => api.post('/community/events', data),
    getRules: () => api.get('/community/rules'),
    createRule: (data: any) => api.post('/community/rules', data),
    getMembers: () => api.get('/community/members'),
    getGallery: () => api.get('/community/gallery'),
    getSummaryStats: () => api.get('/community/stats/summary'),
    
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
export const businessApi = {
    createProfile: (data: any) => api.post('/business/profiles', data),
    getProfiles: (params?: any) => api.get('/business/profiles', { params }),
    getMyProfiles: () => api.get('/business/profiles/my'),
    getProfile: (id: string) => api.get(`/business/profiles/${id}`),
    updateProfile: (id: string, data: any) => api.patch(`/business/profiles/${id}`, data),
};

// Accounting APIs
export const accountingApi = {
    getTransactions: (params?: any) => api.get('/accounting/transactions', { params }),
    createTransaction: (data: any) => api.post('/accounting/transactions', data),
    getMonthlyReport: (year: number, month: number) => api.get('/accounting/reports/monthly', { params: { year, month } }),
};

// Thread & Flare APIs
export const threadApi = {
    getThreads: (params?: { feedType?: 'PUBLIC' | 'FOLLOWING' | 'MY' | 'RESHARE' | 'SAVED'; followingIds?: string[]; category?: string }) => {
        const p = { ...params, followingIds: params?.followingIds?.join(',') };
        return api.get('/threads', { params: p });
    },
    getFlares: (params?: { feedType?: 'PUBLIC' | 'FOLLOWING' | 'MY' | 'RESHARE' | 'SAVED'; followingIds?: string[]; category?: string }) => {
        const p = { ...params, followingIds: params?.followingIds?.join(',') };
        return api.get('/flares', { params: p });
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
    sendMessage: (conversationId: string, data: { content: string }) => api.post(`/chat/conversations/${conversationId}/messages`, data),
    createConversation: (memberIds: string[]) => api.post('/chat/conversations', { memberIds }),
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
    createNotePage: (data: { folderId: string, title: string, content: string, color?: string }) => api.post('/profile/notes/pages', data),
    updateNotePage: (id: string, data: { title?: string, content?: string, color?: string }) => api.patch(`/profile/notes/pages/${id}`, data),
    
    getDocumentFolders: () => api.get('/profile/documents/folders'),
    createDocumentFolder: (data: { name: string, color?: string, icon?: string }) => api.post('/profile/documents/folders', data),
    getDocumentFolder: (id: string) => api.get(`/profile/documents/folders/${id}`),
    addDocumentFile: (data: { folderId: string, name: string, url: string, type: string, size?: number }) => api.post('/profile/documents/files', data),
    
    shareItem: (data: { type: 'NOTE' | 'DOC', itemId: string, targetType: 'COMMUNITY' | 'GROUP' | 'CONTACT', targetId: string, isFolder: boolean }) => api.post('/profile/share', data),
    getSharedNotes: () => api.get('/profile/notes/shared'),
    getSharedDocuments: () => api.get('/profile/documents/shared'),

    addIncome: (data: { source: string, amount: number, date: string }) => api.post('/profile/finance/income', data),
    addExpense: (data: { amount: number, category: string, date: string, paymentMethod: string, description?: string, billUrl?: string }) => api.post('/profile/finance/expense', data),
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
    submitProof: (billId: string, data: { receiptUrl: string, paymentMethod: string, description?: string }) => 
        api.post(`/community/finance/maintenance/submit-proof/${billId}`, data),
    verifyPayment: (billId: string, action: 'APPROVE' | 'REJECT', rejectionReason?: string) => 
        api.post(`/community/finance/maintenance/verify/${billId}`, { action, rejectionReason }),
    getReports: (params: { period: 'day' | 'week' | 'month', year: number }) => api.get('/community/finance/reports', { params }),
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
    createReminder: (data: any) => api.post('/community/reminders', data),
    triggerReminder: (id: string) => api.post(`/community/reminders/${id}/trigger`),
    deleteReminder: (id: string) => api.delete(`/community/reminders/${id}`),
};
