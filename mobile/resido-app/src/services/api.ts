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

// Resident APIs
export const residentApi = {
    getMembers: () => api.get('/resident/members'),
    getMember: (id: string) => api.get(`/resident/members/${id}`),
    getFamilies: () => api.get('/resident/families'),
    getNotices: () => api.get('/resident/notices'),
    createNotice: (data: any) => api.post('/resident/notices', data),
    getPolls: () => api.get('/resident/polls'),
    createPoll: (data: any) => api.post('/resident/polls', data),
    votePoll: (pollId: string, optionId: string) => api.post(`/resident/polls/${pollId}/vote`, { optionId }),
    getGroups: () => api.get('/resident/groups'),
};

// Accounting APIs
export const accountingApi = {
    getTransactions: (params?: any) => api.get('/accounting/transactions', { params }),
    createTransaction: (data: any) => api.post('/accounting/transactions', data),
    getMonthlyReport: (year: number, month: number) => api.get('/accounting/reports/monthly', { params: { year, month } }),
};

// Chat APIs
export const chatApi = {
    getConversations: () => api.get('/chat/conversations'),
    getMessages: (conversationId: string) => api.get(`/chat/conversations/${conversationId}/messages`),
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
