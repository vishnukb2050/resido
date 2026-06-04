import { useQuery } from '@tanstack/react-query';
import { authApi, threadApi, unpackFeedPage } from '../services/api';
import { useAuthStore } from '../store/authStore';

async function loadForYouFeed(userId: string | undefined) {
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

export function useForYouFeed() {
    const user = useAuthStore((s) => s.user);
    return useQuery({
        queryKey: ['forYouFeed', user?.id],
        queryFn: () => loadForYouFeed(user?.id),
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 3,
    });
}
