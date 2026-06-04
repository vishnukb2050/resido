import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/authStore';

export const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000';

/**
 * The Socket.IO host. In production, the ALB proxies `/socket.io/` to chat and
 * `/flares-io/` to flaredthread from the root domain (NOT the `/api/` path).
 * Falls back to deriving from `API_URL` by stripping a trailing `/api`.
 */
export const SOCKET_URL: string =
    (Constants.expoConfig?.extra as any)?.socketUrl ||
    API_URL.replace(/\/api\/?$/, '') ||
    API_URL;

/** Socket.IO HTTP path on flaredthread (must match flare.gateway.ts and ALB rule). */
export const FLARES_SOCKET_PATH = '/flares-io';

/** Host for flare live WebSockets (defaults to same root as chat). */
export const FLARES_SOCKET_URL: string =
    (Constants.expoConfig?.extra as any)?.flaresSocketUrl || SOCKET_URL;

/** Shared client options for flare Socket.IO (namespace `/flares`). */
export const flaresSocketOptions = {
    path: FLARES_SOCKET_PATH,
    transports: ['websocket'] as ('websocket' | 'polling')[],
};

/**
 * Flare socket options including the auth token. The flare gateway now rejects
 * unauthenticated connections, so the JWT must be supplied in the handshake.
 * Use this in place of the bare `flaresSocketOptions` for all connections.
 */
export const getFlaresSocketOptions = () => ({
    ...flaresSocketOptions,
    auth: { token: useAuthStore.getState().token || '' },
});

// A request timeout is essential on mobile: without it, a dropped/stalled
// connection (tunnel, lift, weak signal) leaves the request — and any loading
// spinner bound to it — hanging indefinitely, so the app feels frozen. 30s is
// generous for slow networks while still failing fast enough to show an error
// or let the user retry.
export const api = axios.create({ baseURL: API_URL, timeout: 30000 });

// Inject auth token and tenant headers from the in-memory Zustand store.
// Reading SecureStore on every request costs ~10–50ms per call (Keystore I/O);
// the store is already hydrated from SecureStore on cold start via persist.
api.interceptors.request.use((config) => {
    const state = useAuthStore.getState();
    if (state.token) {
        config.headers.set('Authorization', `Bearer ${state.token}`);
    }
    if (state.user?.id) {
        config.headers.set('x-user-id', state.user.id);
    }
    const active = state.activeWorkspace;
    const firstWs = Array.isArray(state.workspaces) && state.workspaces.length > 0
        ? state.workspaces[0]
        : null;
    const tenantId = active?.tenantId || firstWs?.tenantId;
    const dbName = active?.dbName || firstWs?.dbName || tenantId;
    if (tenantId) config.headers.set('x-tenant-id', tenantId);
    if (dbName) config.headers.set('x-db-name', dbName);
    return config;
});

// --- 401 handling: transparently refresh the access token once, retry the
// original request, and log the user out if the refresh also fails. ---
let isRefreshing = false;
let refreshWaiters: Array<(token: string | null) => void> = [];

function onRefreshed(token: string | null) {
    refreshWaiters.forEach((cb) => cb(token));
    refreshWaiters = [];
}

async function readAuthState(): Promise<any | null> {
    try {
        const raw = await SecureStore.getItemAsync('resido-auth-secure-storage');
        return raw ? JSON.parse(raw)?.state : null;
    } catch {
        return null;
    }
}

async function persistTokens(accessToken: string, refreshToken?: string) {
    try {
        const raw = await SecureStore.getItemAsync('resido-auth-secure-storage');
        const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
        parsed.state = {
            ...parsed.state,
            token: accessToken,
            personalToken: parsed.state?.activeWorkspace ? parsed.state?.personalToken : accessToken,
            ...(refreshToken ? { refreshToken } : {}),
        };
        await SecureStore.setItemAsync('resido-auth-secure-storage', JSON.stringify(parsed));
    } catch (e) {
        console.error('Failed to persist refreshed tokens', e);
    }
}

async function forceLogout() {
    try {
        const { useAuthStore } = require('../store/authStore');
        useAuthStore.getState().logout();
    } catch {
        // Store not available — clear the persisted blob directly.
        await SecureStore.deleteItemAsync('resido-auth-secure-storage');
    }
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original: any = error.config;
        const status = error.response?.status;
        const url: string = original?.url || '';

        // Don't try to refresh for the auth endpoints themselves or after a retry.
        const isAuthCall = url.includes('/auth/refresh') || url.includes('/auth/verify-otp') || url.includes('/auth/login') || url.includes('/auth/send-otp');

        if (status === 401 && original && !original._retry && !isAuthCall) {
            original._retry = true;

            if (isRefreshing) {
                // Queue until the in-flight refresh completes.
                return new Promise((resolve, reject) => {
                    refreshWaiters.push((token) => {
                        if (!token) return reject(error);
                        original.headers = original.headers || {};
                        original.headers['Authorization'] = `Bearer ${token}`;
                        resolve(api(original));
                    });
                });
            }

            isRefreshing = true;
            try {
                const state = await readAuthState();
                const refreshToken = state?.refreshToken;
                if (!refreshToken) throw new Error('No refresh token');

                const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
                const newAccess = data?.accessToken;
                const newRefresh = data?.refreshToken;
                if (!newAccess) throw new Error('No access token in refresh response');

                await persistTokens(newAccess, newRefresh);
                try {
                    const { useAuthStore } = require('../store/authStore');
                    useAuthStore.setState({ token: newAccess, ...(newRefresh ? { refreshToken: newRefresh } : {}) });
                } catch { /* store update is best-effort */ }

                onRefreshed(newAccess);
                original.headers = original.headers || {};
                original.headers['Authorization'] = `Bearer ${newAccess}`;
                return api(original);
            } catch (refreshErr) {
                onRefreshed(null);
                await forceLogout();
                return Promise.reject(refreshErr);
            } finally {
                isRefreshing = false;
            }
        }

        console.error(`[API Error] ${original?.method?.toUpperCase()} ${url}:`, status, error.response?.data);
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
    // Batch resolve chat counterpart display identities (name/phone/photo) for
    // any active user in a single request (chat list uses this instead of an
    // N+1 getUser fan-out).
    getChatIdentitiesBatch: (ids: string[]) =>
        api.get('/profile/users/chat-identities/batch', {
            params: { ids: (ids || []).filter(Boolean).join(',') },
        }),
    createMember: (data: any) => api.post('/members', data),
    syncMembership: (data: any) => api.post('/auth/sync-membership', data),
    syncMembershipDeactivation: (data: { phone: string; tenantId: string; role: string }) => api.post('/auth/sync-membership-deactivation', data),
    getUser: (id: string) => api.get(`/auth/users/${id}`),
    toggleFollow: (id: string, isFollowing: boolean) => isFollowing ? api.delete(`/profile/follow/${id}`) : api.post(`/profile/follow/${id}`),
    follow: (id: string) => api.post(`/profile/follow/${id}`),
    unfollow: (id: string) => api.delete(`/profile/follow/${id}`),
    getFollowing: (params?: { skip?: number; take?: number }) => api.get('/profile/following', { params }),
    /**
     * Pages through the FULL following list. The endpoint caps a single page at
     * 100, so a user following >50 people previously got a truncated list — and
     * an incomplete "Following" feed. Bounded to `maxItems` so accounts that
     * follow very many people can't trigger unbounded work.
     */
    getAllFollowing: async () => {
        const pageSize = 100;
        const maxItems = 2000;
        let skip = 0;
        let all: any[] = [];
        for (;;) {
            const { data } = await api.get('/profile/following', { params: { skip, take: pageSize } });
            const page: any[] = data || [];
            all = all.concat(page);
            if (page.length < pageSize || all.length >= maxItems) break;
            skip += pageSize;
        }
        return { data: all.slice(0, maxItems) };
    },
    /**
     * The full following list as a plain array of user IDs (string[]).
     *
     * `/profile/following` returns user OBJECTS, but the feed APIs expect a list
     * of author IDs. Consumers that fed the raw objects straight into
     * `followingIds` were sending `[object Object],...` to the backend (so the
     * FOLLOWING feed matched nothing) — this normalizes to ids in one place.
     */
    getFollowingIds: async (): Promise<string[]> => {
        const { data } = await authApi.getAllFollowing();
        return (data || [])
            .map((f: any) => (typeof f === 'string' ? f : f?.id))
            .filter((id: any): id is string => typeof id === 'string' && id.length > 0);
    },
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
    votePoll: (optionId: string) => api.post('/community/polls/vote', { optionId }),
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

export type FeedListParams = {
    feedType?: 'PUBLIC' | 'FOLLOWING' | 'MY' | 'RESHARE' | 'SAVED' | 'HASHTAG' | 'AUTHOR';
    followingIds?: string[];
    category?: string;
    businessProfileId?: string;
    hashtag?: string;
    authorId?: string;
    limit?: number;
    cursor?: string | null;
};

/** Normalise paginated feed `{ items, nextCursor, hasMore }` or legacy array responses. */
export function unpackFeedPage(data: unknown): {
    items: any[];
    nextCursor: string | null;
    hasMore: boolean;
} {
    if (data && typeof data === 'object' && Array.isArray((data as any).items)) {
        const d = data as { items: any[]; nextCursor?: string | null; hasMore?: boolean };
        return {
            items: d.items,
            nextCursor: d.nextCursor ?? null,
            hasMore: !!d.hasMore,
        };
    }
    if (Array.isArray(data)) {
        return { items: data, nextCursor: null, hasMore: false };
    }
    return { items: [], nextCursor: null, hasMore: false };
}

// Thread & Flare APIs
export const threadApi = {
    getThreads: (params?: FeedListParams) => {
        const p = { ...params, followingIds: params?.followingIds?.join(',') };
        return api.get('/threads', { params: p });
    },
    /**
     * Unified "For You" feed — one request returns the merged, visibility-gated
     * stream of public + followed-author posts across threads AND flares. This
     * replaces the previous 4 parallel calls (PUBLIC+FOLLOWING × threads+flares),
     * cutting home-screen gateway load. Returns the standard
     * `{ items, nextCursor, hasMore }` feed page.
     */
    getForYou: (params?: { followingIds?: string[]; limit?: number; cursor?: string | null }) =>
        api.get('/threads/for-you', {
            params: {
                followingIds: (params?.followingIds || []).join(','),
                limit: params?.limit ?? 20,
                cursor: params?.cursor || undefined,
            },
        }),
    getFlares: (params?: FeedListParams) => {
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
    getThreadsByHashtag: (tag: string, followingIds?: string[], cursor?: string | null) =>
        api.get('/threads', {
            params: {
                feedType: 'HASHTAG',
                hashtag: tag,
                followingIds: (followingIds || []).join(','),
                limit: 15,
                cursor: cursor || undefined,
            },
        }),
    getFlaresByHashtag: (tag: string, followingIds?: string[], cursor?: string | null) =>
        api.get('/flares', {
            params: {
                feedType: 'HASHTAG',
                hashtag: tag,
                followingIds: (followingIds || []).join(','),
                limit: 15,
                cursor: cursor || undefined,
            },
        }),
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
    getMessages: (conversationId: string, params?: { take?: number; before?: string }) =>
        api.get(`/chat/conversations/${conversationId}/messages`, { params }),
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
    // Mark a conversation read (clears the unread badge for this user).
    markRead: (conversationId: string) => api.post(`/chat/conversations/${conversationId}/read`),
    // Ensure the active community's default group chat exists and that the
    // current user is a member of it. Idempotent — safe to call on every load.
    ensureCommunityGroup: (name?: string) =>
        api.post('/chat/communities/ensure', { name }),
};

// My Space APIs (notes, documents, personal finance → auth-service /profile/*)
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
