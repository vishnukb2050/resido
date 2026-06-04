import { useQuery, type QueryClient } from '@tanstack/react-query';
import { authApi, threadApi, unpackFeedPage } from '../services/api';
import { useAuthStore, type Workspace } from '../store/authStore';

export const forYouFeedQueryKey = (userId?: string) => ['forYouFeed', userId] as const;

const FOR_YOU_STALE_MS = 1000 * 60 * 3;

/** Mirrors HomeScreen: only DefaultDashboard shows the For You feed. */
export function shouldPrefetchForYouFeed(activeWorkspace: Workspace | null): boolean {
    const role = activeWorkspace?.role;
    if (!activeWorkspace || !role) return true;
    return role === 'RESIDENT';
}

export function needsProfileOnboarding(user: { name?: string; profileName?: string } | null): boolean {
    return !!user && (!user.name?.trim() || !user.profileName?.trim());
}

export async function loadForYouFeed(_userId?: string) {
    // Resolve the follow graph (normalized to ids) so the backend can include
    // followed authors' FOLLOWERS/CONTACTS posts and the client can prioritize
    // them in the sort below.
    let following: string[] = [];
    try {
        following = await authApi.getFollowingIds();
    } catch {
        following = [];
    }
    const followingSet = new Set(following);

    // ONE request for the whole merged feed (threads + flares, public +
    // followed), replacing the previous 4 parallel calls.
    let items: any[] = [];
    try {
        const res = await threadApi.getForYou({ followingIds: following, limit: 20 });
        items = unpackFeedPage(res.data).items;
    } catch {
        items = [];
    }

    const combined = items.map((item: any) => ({
        ...item,
        itemType: item.type === 'FLARE' ? 'FLARE' : 'THREAD',
    }));

    const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());

    unique.sort((a, b) => {
        const getPriority = (item: any) => {
            if (item.visibility === 'CONTACTS') return 3;
            if (item.visibility === 'FOLLOWERS' || followingSet.has(item.authorId)) return 2;
            return 1;
        };
        const priorityA = getPriority(a);
        const priorityB = getPriority(b);
        if (priorityA !== priorityB) return priorityB - priorityA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return unique;
}

export function forYouFeedQueryOptions(userId: string | undefined) {
    return {
        queryKey: forYouFeedQueryKey(userId),
        queryFn: () => loadForYouFeed(userId),
        enabled: !!userId,
        staleTime: FOR_YOU_STALE_MS,
    };
}

/** Warm the For You cache during splash so DefaultDashboard renders without a spinner. */
export function prefetchForYouFeed(queryClient: QueryClient, userId: string) {
    return queryClient.prefetchQuery(forYouFeedQueryOptions(userId));
}

export function useForYouFeed() {
    const user = useAuthStore((s) => s.user);
    return useQuery(forYouFeedQueryOptions(user?.id));
}
