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
                config.headers.Authorization = `Bearer ${state.token}`;
                // console.log(`[API Request] Token attached for ${config.url}`);
            } else {
                // console.warn(`[API Request] No token found for ${config.url}`);
            }
            
            if (state.user?.id) {
                config.headers['x-user-id'] = state.user.id;
            }
            
            if (state.activeWorkspace?.tenantId) {
                config.headers['x-tenant-id'] = state.activeWorkspace.tenantId;
            }
            if (state.activeWorkspace?.dbName) {
                config.headers['x-db-name'] = state.activeWorkspace.dbName;
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
    switchWorkspace: (tenantId: string) => api.post('/auth/switch-workspace', { tenantId }),
    refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
    createClient: (data: any) => api.post('/clients', data),
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
    
    // Blocks & Units
    getBlocks: () => api.get('/community/blocks'),
    createBlock: (data: any) => api.post('/community/blocks', data),
    getUnits: (blockId: string) => api.get(`/community/units`, { params: { blockId } }),
    createUnit: (data: any) => api.post('/community/units', data),
};


export const visitorApi = {
    verifyGatepass: (id: string) => api.get(`/visitors/gatepass/${id}`),
    getRegister: () => api.get('/visitors/register'),
    createEntry: (data: any) => api.post('/visitors/register', data),
    getEntries: (params?: any) => api.get('/visitors/register', { params }),
};

// Resident APIs (Proxy to resident-service via /members, /community, etc)
export const residentApi = {
    getMembers: () => api.get('/members'),
    getMember: (id: string) => api.get(`/members/${id}`),
    createMember: (data: any) => api.post('/members', data),
    getFamilies: () => api.get('/members/families'), // Adjust if needed
    getNotices: () => api.get('/community/notices'),
    createNotice: (data: any) => api.post('/community/notices', data),
    getPolls: () => api.get('/community/polls'),
    createPoll: (data: any) => api.post('/community/polls', data),
    votePoll: (pollId: string, optionId: string) => api.post(`/community/polls/${pollId}/vote`, { optionId }),
    getGroups: () => api.get('/community/groups'),
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
