import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000';

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
            }
            
            if (state.activeWorkspace?.tenantId) {
                config.headers['x-tenant-id'] = state.activeWorkspace.tenantId;
            }
        }
    } catch (error) {
        console.error('Error reading auth state for interceptor:', error);
    }
    return config;
});

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
};

// Community APIs
export const communityApi = {
    getNotices: () => api.get('/community/notices'),
    getPolls: () => api.get('/community/polls'),
    votePoll: (memberId: string, optionId: string) => api.post('/community/polls/vote', { memberId, optionId }),
    getComplaints: (memberId: string) => api.get(`/community/complaints?memberId=${memberId}`),
    createComplaint: (data: any) => api.post('/community/complaints', data),
    getVisitors: (memberId: string) => api.get(`/community/visitors?memberId=${memberId}`),
    createGatepass: (data: any) => api.post('/community/visitors/gatepass', data),
    getEvents: (memberId: string) => api.get(`/community/events?memberId=${memberId}`),
    createEvent: (data: any) => api.post('/community/events', data),
    getMembers: () => api.get('/community/members'),
    getGallery: () => api.get('/community/gallery'),
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
    getMyProfile: () => api.get('/business/profiles/me'),
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
    getThreads: (params?: { feedType?: 'PUBLIC' | 'FOLLOWING' | 'MY'; followingIds?: string[] }) => api.get('/threads', { params }),
    getFlares: (params?: { feedType?: 'PUBLIC' | 'FOLLOWING' | 'MY'; followingIds?: string[] }) => api.get('/flares', { params }),
    getThread: (id: string) => api.get(`/blogs/${id}`),
    createThread: (data: any) => api.post('/threads', data),
    createFlare: (data: any) => api.post('/flares', data),
    toggleLike: (id: string) => api.post(`/blogs/${id}/like`),
    addComment: (id: string, data: any) => api.post(`/blogs/${id}/comment`, data),
    getComments: (id: string) => api.get(`/blogs/${id}/comments`),
    reshare: (id: string) => api.post(`/blogs/${id}/reshare`),
    toggleSave: (id: string) => api.post(`/blogs/${id}/save`),
    updateBlog: (id: string, data: any) => api.patch(`/blogs/${id}`, data),
    deleteBlog: (id: string) => api.delete(`/blogs/${id}`),
};

// Chat APIs
export const chatApi = {
    getConversations: () => api.get('/chat/conversations'),
    getMessages: (conversationId: string) => api.get(`/chat/conversations/${conversationId}/messages`),
    sendMessage: (conversationId: string, data: { content: string }) => api.post(`/chat/conversations/${conversationId}/messages`, data),
    createConversation: (memberIds: string[]) => api.post('/chat/conversations', { memberIds }),
};
// Visitor APIs
export const visitorApi = {
    createEntry: (data: any) => api.post('/visitor/entries', data),
    getEntries: (params?: any) => api.get('/visitor/entries', { params }),
};

// Complaint APIs
export const complaintApi = {
    getComplaints: (params?: any) => api.get('/complaint/complaints', { params }),
    createComplaint: (data: any) => api.post('/complaint/complaints', data),
    updateStatus: (id: string, status: string) => api.patch(`/complaint/complaints/${id}/status`, { status }),
    addComment: (id: string, message: string) => api.post(`/complaint/complaints/${id}/comments`, { message }),
};
