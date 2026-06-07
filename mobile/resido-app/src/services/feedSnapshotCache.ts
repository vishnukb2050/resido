/**
 * Lightweight in-memory snapshot cache for paginated feed screens (Threads,
 * Flares). Returning to a tab seeds the previous list synchronously so the user
 * sees content instantly instead of a spinner + full refetch; the screen then
 * refreshes quietly in the background.
 *
 * This is intentionally simpler than a full React Query migration: those screens
 * carry sockets, dual-cursor "For You" merging, hashtag mode and optimistic
 * like/vote updates, so we keep their existing logic and just add an
 * instant-revisit cache on top.
 */

type Snapshot = { data: any; at: number };

const store = new Map<string, Snapshot>();
const DEFAULT_TTL_MS = 2 * 60 * 1000;

export function setFeedSnapshot(key: string, data: any) {
    if (!key) return;
    store.set(key, { data, at: Date.now() });
}

export function getFeedSnapshot<T = any>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | null {
    if (!key) return null;
    const hit = store.get(key);
    if (!hit) return null;
    if (Date.now() - hit.at > ttlMs) {
        store.delete(key);
        return null;
    }
    return hit.data as T;
}

export function clearFeedSnapshots() {
    store.clear();
}
