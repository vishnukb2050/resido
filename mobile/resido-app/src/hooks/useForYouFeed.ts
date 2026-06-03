import { useQuery } from '@tanstack/react-query';
import { authApi, threadApi, unpackFeedPage } from '../services/api';
import { useAuthStore } from '../store/authStore';

async function loadForYouFeed(userId: string | undefined) {
    let following: string[] = [];
    try {
        const { data: followList } = await authApi.getFollowing();
        following = followList || [];
    } catch {
        following = [];
    }
    const followingSet = new Set(following);

    const [followingThreadsRes, publicThreadsRes, followingFlaresRes, publicFlaresRes] =
        await Promise.all([
            threadApi.getThreads({ feedType: 'FOLLOWING', followingIds: following, limit: 10 }).catch(() => ({ data: { items: [] } })),
            threadApi.getThreads({ feedType: 'PUBLIC', limit: 10 }).catch(() => ({ data: { items: [] } })),
            threadApi.getFlares({ feedType: 'FOLLOWING', followingIds: following, limit: 10 }).catch(() => ({ data: { items: [] } })),
            threadApi.getFlares({ feedType: 'PUBLIC', limit: 10 }).catch(() => ({ data: { items: [] } })),
        ]);

    const allThreads = [
        ...unpackFeedPage(followingThreadsRes.data).items,
        ...unpackFeedPage(publicThreadsRes.data).items,
    ];
    const allFlares = [
        ...unpackFeedPage(followingFlaresRes.data).items,
        ...unpackFeedPage(publicFlaresRes.data).items,
    ];

    const combined = [
        ...allThreads.map((t: any) => ({ ...t, itemType: 'THREAD' })),
        ...allFlares.map((f: any) => ({ ...f, itemType: 'FLARE' })),
    ];

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

export function useForYouFeed() {
    const user = useAuthStore((s) => s.user);
    return useQuery({
        queryKey: ['forYouFeed', user?.id],
        queryFn: () => loadForYouFeed(user?.id),
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 3,
    });
}
