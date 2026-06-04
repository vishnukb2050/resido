import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

export interface CanMessageResult {
    allowed: boolean;
    reason:
        | 'GLOBAL'
        | 'FOLLOWING'
        | 'FOLLOWED_BY'
        | 'COMMUNITY'
        | 'SELF'
        | 'NOT_FOUND'
        | 'FOLLOW_REQUIRED';
    followStatus?: 'FOLLOWING' | 'REQUESTED' | 'NOT_FOLLOWING' | 'SELF';
}

/**
 * Asks auth-service whether `fromUserId` is allowed to start a direct chat with
 * `toUserId`. Auth-service owns profiles, follows, contacts and community
 * memberships, so the relationship rules live there. We only proxy the verdict.
 */
@Injectable()
export class PermissionService {
    private readonly logger = new Logger(PermissionService.name);

    constructor(
        private http: HttpService,
        private config: ConfigService,
    ) {}

    private authBaseUrl(): string {
        return (
            this.config.get<string>('AUTH_SERVICE_URL') ||
            process.env.AUTH_SERVICE_URL ||
            'http://auth-service:3001'
        );
    }

    private internalHeaders(): Record<string, string> {
        const secret =
            this.config.get<string>('INTERNAL_SERVICE_SECRET') ||
            process.env.INTERNAL_SERVICE_SECRET;
        return secret ? { 'x-internal-secret': secret } : {};
    }

    async canMessage(fromUserId: string, toUserId: string): Promise<CanMessageResult> {
        if (!fromUserId || !toUserId) return { allowed: false, reason: 'NOT_FOUND' };
        if (fromUserId === toUserId) return { allowed: false, reason: 'SELF' };

        const url = `${this.authBaseUrl()}/profile/chat/can-message`;
        try {
            const res = await lastValueFrom(
                this.http.get<CanMessageResult>(url, {
                    params: { fromUserId, toUserId },
                    headers: this.internalHeaders(),
                    timeout: 8000,
                }),
            );
            return res.data;
        } catch (e: any) {
            // Fail closed for restricted profiles is preferable, but a transient
            // auth-service hiccup should not hard-block existing relationships.
            // We log and deny with a generic follow-required so the client can
            // recover, rather than throwing a 500 that surfaces as a chat 502.
            this.logger.warn(`canMessage check failed: ${e?.message}`);
            return { allowed: false, reason: 'FOLLOW_REQUIRED' };
        }
    }
}
