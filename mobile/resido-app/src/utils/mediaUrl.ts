import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra as any) || {};

/**
 * Base URL used to serve media stored in Cloudflare R2 / S3. Configured via
 * `expo.extra.mediaBaseUrl` in app.json. Falls back to the API host's `/media`
 * proxy path so legacy bare R2 keys still resolve to a loadable URL.
 */
const MEDIA_BASE_URL: string = (() => {
    const explicit = extra.mediaBaseUrl;
    if (typeof explicit === 'string' && explicit) return explicit.replace(/\/$/, '');
    const apiUrl: string = extra.apiUrl || '';
    if (apiUrl) return apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '') + '/media';
    return '';
})();

/** Append cache-bust query param without breaking existing query strings. */
export function withCacheBust(url: string, bust?: number): string {
    if (!bust || !url) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${bust}`;
}

/**
 * Normalize an image / media URL value coming from the API.
 *
 * Inputs that may show up:
 *   - Fully-qualified `https://…` URLs (returned unchanged).
 *   - Local `file://…` / `content://…` URIs from the image picker (unchanged).
 *   - Bare R2 keys like `resido/<tenant>/profiles/<user>/123_avatar.jpg` or
 *     `tenants/<id>/users/<id>/flares/...` — prefixed with the configured
 *     media base so the `<Image>` actually loads.
 */
export function resolveMediaUrl(url?: string | null): string | null {
    if (!url) return null;
    const trimmed = String(url).trim();
    if (!trimmed) return null;
    if (/^data:/i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('file://') || trimmed.startsWith('content://')) {
        return trimmed;
    }
    if (/^https?:\/\//i.test(trimmed)) {
        // Auto-heal legacy URLs that pointed at the auth-only
        // *.r2.cloudflarestorage.com endpoint (rendered as blank images).
        // Rewrite to the public R2.dev domain configured via mediaBaseUrl.
        if (MEDIA_BASE_URL && /\.r2\.cloudflarestorage\.com\//i.test(trimmed)) {
            // Path looks like: https://<acct>.r2.cloudflarestorage.com/<bucket>/<key>
            const match = trimmed.match(/r2\.cloudflarestorage\.com\/[^/]+\/(.+)$/i);
            if (match && match[1]) {
                return `${MEDIA_BASE_URL}/${match[1]}`;
            }
        }
        return trimmed;
    }
    if (!MEDIA_BASE_URL) return trimmed;
    const key = trimmed.replace(/^\/+/, '');
    return `${MEDIA_BASE_URL}/${key}`;
}
