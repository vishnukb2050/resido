/**
 * Fire-and-forget helper to deliver a push notification to a single user via
 * the notification-service's internal `/send` endpoint.
 *
 * Uses Node's built-in `fetch` (Node 18+) so no extra dependency is needed.
 * Errors are caught and logged but NEVER thrown — a notification failure must
 * never break the main business operation that triggered it.
 */
export async function pushNotification(payload: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, string>;
}): Promise<void> {
    if (!payload.userId) return;
    const base = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3005';
    const secret = process.env.INTERNAL_SERVICE_SECRET;
    try {
        await fetch(`${base}/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(secret ? { 'x-internal-secret': secret } : {}),
            },
            body: JSON.stringify(payload),
        });
    } catch (e: any) {
        console.warn('[notify] push failed for userId', payload.userId, ':', e?.message);
    }
}

/**
 * Push the same notification to many users in parallel (fire-and-forget).
 * Caps concurrency at 20 to avoid overwhelming the notification-service when
 * targeting an entire community (potentially thousands of members).
 */
export async function pushNotificationMany(
    userIds: string[],
    notification: { title: string; body: string; data?: Record<string, string> },
): Promise<void> {
    const unique = Array.from(new Set(userIds.filter(Boolean)));
    if (unique.length === 0) return;

    const CONCURRENCY = 20;
    for (let i = 0; i < unique.length; i += CONCURRENCY) {
        const chunk = unique.slice(i, i + CONCURRENCY);
        await Promise.all(chunk.map((userId) => pushNotification({ userId, ...notification })));
    }
}
