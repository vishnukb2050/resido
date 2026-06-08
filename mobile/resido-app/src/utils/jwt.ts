// Minimal, dependency-free JWT payload decoder. We only ever read non-sensitive
// claims (the session id) for the single-device logout check — the token is
// still verified server-side, so this never trusts the token for auth.

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Decode(input: string): string {
    let str = input.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';

    let output = '';
    let buffer = 0;
    let bits = 0;
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (ch === '=') break;
        const idx = B64_ALPHABET.indexOf(ch);
        if (idx === -1) continue;
        buffer = (buffer << 6) | idx;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            output += String.fromCharCode((buffer >> bits) & 0xff);
        }
    }

    // Best-effort UTF-8 decode (claims we read are ASCII, so this is plenty).
    try {
        return decodeURIComponent(
            output
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join(''),
        );
    } catch {
        return output;
    }
}

export function decodeJwt(token?: string | null): Record<string, any> | null {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
        return JSON.parse(base64Decode(parts[1]));
    } catch {
        return null;
    }
}

/** Extract the session id (`sid`) claim used for single-device enforcement. */
export function getSessionId(token?: string | null): string | null {
    const payload = decodeJwt(token);
    return (payload?.sid as string) || null;
}
