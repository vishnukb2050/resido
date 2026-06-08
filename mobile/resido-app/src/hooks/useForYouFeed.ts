import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import { authApi, threadApi, unpackFeedPage } from '../services/api';
import { useAuthStore, type Workspace } from '../store/authStore';

export const forYouFeedQueryKey = (userId?: string) => ['forYouFeed', userId] as const;

const FOR_YOU_STALE_MS = 1000 * 60 * 3;
const FOR_YOU_PAGE_LIMIT = 20;

/** Mirrors HomeScreen: only DefaultDashboard shows the For You feed. */
export function shouldPrefetchForYouFeed(activeWorkspace: Workspace | null): boolean {
    const role = activeWorkspace?.role;
    if (!activeWorkspace || !role) return true;
    return role === 'RESIDENT';
}

export function needsProfileOnboarding(user: { name?: string; profileName?: string } | null): boolean {
    return !!user && (!user.name?.trim() || !user.profileName?.trim());
}

type ForYouPage = {
    items: any[];
    nextCursor: string | null;
    hasMore: boolean;
};

function mergeAndSortForYou(rawItems: any[], followingSet: Set<string>): any[] {
    const combined = rawItems.map((item: any) => ({
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

async function fetchForYouPage(cursor: string | null): Promise<ForYouPage> {
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

    let page = { items: [] as any[], nextCursor: null as string | null, hasMore: false };
    try {
        const res = await threadApi.getForYou({
            followingIds: following,
            limit: FOR_YOU_PAGE_LIMIT,
            cursor: cursor || undefined,
        });
        page = unpackFeedPage(res.data);
    } catch {
        page = { items: [], nextCursor: null, hasMore: false };
    }

    return {
        items: mergeAndSortForYou(page.items, followingSet),
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
    };
}

export async function loadForYouFeed(_userId?: string): Promise<ForYouPage> {
    // ONE request for the whole merged feed (threads + flares, public +
    // followed), replacing the previous 4 parallel calls.
    return fetchForYouPage(null);
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
    const query = useQuery(forYouFeedQueryOptions(user?.id));

    const [pages, setPages] = useState<any[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const loadingMoreRef = useRef(false);

    // Reset the appended pages whenever the base (cached) page changes — a fresh
    // load or background refetch — so we never show stale appended items and the
    // cursor always tracks the latest first page.
    const base = query.data;
    useEffect(() => {
        setPages([]);
        setNextCursor(base?.nextCursor ?? null);
        setHasMore(!!base?.hasMore);
    }, [base]);

    const items = useMemo(() => {
        const baseItems = base?.items ?? [];
        if (pages.length === 0) return baseItems;
        const map = new Map<string, any>();
        for (const it of [...baseItems, ...pages]) map.set(it.id, it);
        return Array.from(map.values());
    }, [base, pages]);

    const loadMore = useCallback(async () => {
        if (loadingMoreRef.current) return;
        if (!hasMore || !nextCursor) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
        try {
            const page = await fetchForYouPage(nextCursor);
            setPages((prev) => [...prev, ...page.items]);
            setNextCursor(page.nextCursor);
            setHasMore(page.hasMore);
        } catch {
            // Best-effort; the user can scroll again to retry.
        } finally {
            loadingMoreRef.current = false;
            setLoadingMore(false);
        }
    }, [hasMore, nextCursor]);

    return { ...query, data: items, hasMore, loadingMore, loadMore };
}
