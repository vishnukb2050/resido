/** Append cache-bust query param without breaking existing query strings. */
export function withCacheBust(url: string, bust?: number): string {
    if (!bust || !url) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${bust}`;
}

/** Normalize profile/community image URLs (full URL or legacy R2 key). */
export function resolveMediaUrl(url?: string | null): string | null {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('file://') || trimmed.startsWith('content://')) {
        return trimmed;
    }
    // Legacy keys are resolved server-side; pass through for debugging.
    return trimmed;
}
