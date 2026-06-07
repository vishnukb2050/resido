import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(NotificationService.name);
    private redis: Redis;
    private fcmInitialized = false;

    constructor(
        private readonly prismaService: PrismaService,
        private readonly configService: ConfigService,
    ) { }

    onModuleInit() {
        // ── Redis (WebSocket broker) ─────────────────────────────────────────
        const url = this.configService.get<string>('REDIS_URL');
        if (url) {
            this.redis = new Redis(url, { maxRetriesPerRequest: 3 });
        } else {
            const redisTls = this.configService.get('REDIS_TLS') === 'true';
            this.redis = new Redis({
                host: this.configService.get('REDIS_HOST', 'redis'),
                port: parseInt(String(this.configService.get('REDIS_PORT', 6379)), 10),
                password: this.configService.get('REDIS_PASSWORD') || undefined,
                ...(redisTls ? { tls: {} } : {}),
            });
        }
        this.redis.on('error', (e) => this.logger.warn('[Redis] error: ' + e?.message));

        // ── Firebase Admin SDK (FCM push to device) ──────────────────────────
        // Set FIREBASE_SERVICE_ACCOUNT_JSON to the JSON string of your Firebase
        // service-account key (from Firebase Console → Project Settings → Service Accounts).
        // Without this, push delivery is skipped (WebSocket-only mode).
        const serviceAccountJson = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
        if (serviceAccountJson && !admin.apps.length) {
            try {
                const serviceAccount = JSON.parse(serviceAccountJson);
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                this.fcmInitialized = true;
                this.logger.log('Firebase Admin SDK initialized — FCM push delivery enabled');
            } catch (err: any) {
                this.logger.warn('Failed to initialize Firebase Admin SDK: ' + err?.message);
            }
        } else if (!serviceAccountJson) {
            this.logger.warn(
                'FIREBASE_SERVICE_ACCOUNT_JSON not set — FCM push disabled. ' +
                'Notifications will only reach open WebSocket connections.',
            );
        }
    }

    onModuleDestroy() {
        this.redis.disconnect();
    }

    /**
     * Send a notification to a user.
     *
     * Delivery strategy (both run in parallel for latency):
     *   1. Redis pub/sub → chat-service broadcasts to open WebSocket sockets (instant if app is open)
     *   2. FCM push      → Firebase delivers to device even when app is backgrounded/killed
     *
     * The `data` payload (string key/value map) is forwarded to both channels.
     * For FCM, string values in `data` can be read by the app in the notification tap handler.
     */
    async sendNotification({ userId, tokens, title, body, data }: {
        userId?: string;
        tokens?: string[];
        title: string;
        body: string;
        data?: Record<string, string>;
    }) {
        if (!userId && (!tokens || tokens.length === 0)) {
            return { success: false, message: 'userId or tokens required' };
        }

        let user: any = null;
        let fcmToken: string | null = null;

        if (userId) {
            // Cast to any: the generated @resido/notification-client type is
            // stale and doesn't reflect the current schema's User model yet.
            // At runtime this works correctly (same DB as auth-service).
            user = await (this.prismaService as any).user.findUnique({ where: { id: userId } });
            if (!user) return { success: false, message: 'User not found' };
            fcmToken = (user as any).fcmToken || null;
        }

        // ── 1. WebSocket delivery (Redis pub/sub) ────────────────────────────
        const wsPayload = JSON.stringify({ userId: userId ?? null, title, body, data });
        try {
            await this.redis.publish('resido_notifications', wsPayload);
        } catch (err: any) {
            this.logger.warn('[Redis pub/sub] publish failed: ' + err?.message);
        }

        // ── 2. FCM push delivery ──────────────────────────────────────────────
        let fcmResult: { success: boolean; sent?: number; failed?: number; error?: string } = { success: false };

        if (this.fcmInitialized) {
            // Collect all device tokens: from the user record OR explicitly supplied.
            const deviceTokens: string[] = [];
            if (fcmToken) deviceTokens.push(fcmToken);
            if (tokens && tokens.length > 0) deviceTokens.push(...tokens);

            const uniqueTokens = Array.from(new Set(deviceTokens.filter(Boolean)));

            if (uniqueTokens.length > 0) {
                try {
                    const message: admin.messaging.MulticastMessage = {
                        tokens: uniqueTokens,
                        notification: { title, body },
                        // `data` must be string→string; skip undefined values.
                        ...(data && Object.keys(data).length > 0 ? { data } : {}),
                        android: {
                            priority: 'high',
                            notification: { sound: 'default', clickAction: 'FLUTTER_NOTIFICATION_CLICK' },
                        },
                        apns: {
                            payload: {
                                aps: { sound: 'default', badge: 1 },
                            },
                        },
                    };

                    const batchResponse = await admin.messaging().sendEachForMulticast(message);
                    fcmResult = {
                        success: true,
                        sent: batchResponse.successCount,
                        failed: batchResponse.failureCount,
                    };

                    // Log stale/invalid tokens so they can be cleaned up.
                    if (batchResponse.failureCount > 0) {
                        batchResponse.responses.forEach((resp, idx) => {
                            if (!resp.success) {
                                this.logger.warn(
                                    `[FCM] token[${idx}] delivery failed: ${resp.error?.code} — ${resp.error?.message}`,
                                );
                            }
                        });
                    }
                } catch (fcmErr: any) {
                    this.logger.error('[FCM] sendEachForMulticast failed: ' + fcmErr?.message);
                    fcmResult = { success: false, error: fcmErr?.message };
                }
            } else {
                fcmResult = { success: false, error: 'No FCM tokens available for this user' };
                this.logger.debug(`[FCM] userId=${userId} has no fcmToken stored — skipping FCM push`);
            }
        }

        return {
            success: true,
            message: 'Notification dispatched',
            ws: { published: true },
            fcm: fcmResult,
        };
    }
}
