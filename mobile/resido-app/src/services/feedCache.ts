/**
 * Tiny in-memory hand-off cache between the Flares grid and the full-screen
 * player. Router params can only carry strings, so instead of re-fetching the
 * whole feed when a user taps a flare we stash the already-loaded list here and
 * the player reads it back synchronously — no second network round-trip, no
 * cold start. The player still refreshes in the background to pick up new
 * likes/comments and to extend the list.
 *
 * Entries are intentionally short-lived; they exist only for the moment between
 * tapping a tile and the player mounting.
 */

type FlareFeedEntry = {
    feedType: string;
    items: any[];
    storedAt: number;
};

const STALE_MS = 60_000;

let current: FlareFeedEntry | null = null;

export function setFlareFeedCache(feedType: string, items: any[]) {
    current = { feedType, items: items.slice(), storedAt: Date.now() };
}

export function takeFlareFeedCache(feedType: string): any[] | null {
    if (!current) return null;
    const fresh = Date.now() - current.storedAt < STALE_MS;
    if (current.feedType === feedType && fresh && current.items.length) {
        return current.items;
    }
    return null;
}

export function clearFlareFeedCache() {
    current = null;
}
