import { Controller, Post, Get, Body, Headers, UseGuards, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ProfileService } from '../profile/profile.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private profileService: ProfileService,
    ) { }

    @Public()
    @Post('send-otp')
    sendOtp(@Body() body: { phone: string }) {
        return this.authService.sendOtp(body.phone);
    }

    @Public()
    @Post('verify-otp')
    verifyOtp(@Body() body: { phone: string; otp: string }) {
        return this.authService.verifyOtp(body.phone, body.otp);
    }

    @Public()
    @Post('login')
    adminLogin(@Body() body: { email: string; password: string }) {
        return this.authService.adminLogin(body.email, body.password);
    }

    @Get('workspaces')
    getWorkspaces(@Headers('x-user-id') userId: string) {
        return this.authService.getWorkspaces(userId);
    }

    @Post('switch-workspace')
    switchWorkspace(
        @Headers('x-user-id') userId: string,
        @Body() body: { tenantId: string; role?: string },
    ) {
        return this.authService.switchWorkspace(userId, body.tenantId, body.role);
    }

    @Public()
    @Post('refresh')
    refresh(@Body() body: { refreshToken: string }) {
        return this.authService.refreshToken(body.refreshToken);
    }

    @Get('me')
    getMe(@Headers('x-user-id') userId: string) {
        return this.authService.getMe(userId);
    }

    @Get('users/:id')
    getUser(@Headers('x-user-id') viewerId: string, @Param('id') id: string) {
        // Respect profile/phone visibility — never return raw PII to arbitrary callers.
        return this.profileService.getPublicProfile(id, viewerId);
    }

    @Post('sync-contacts')
    syncContacts(@Headers('x-user-id') userId: string, @Body() body: { phones: string[] }) {
        return this.authService.syncContacts(userId, body.phones);
    }

    // Membership sync is triggered by an authenticated admin/manager from the
    // app (e.g. after creating a member). The gateway requires a valid JWT for
    // these paths (they are NOT in its public allowlist), so they are no longer
    // anonymously callable. We pass the caller's id so the service can authorize.
    @Post('sync-membership')
    syncMembership(
        @Headers('x-user-id') actingUserId: string,
        @Headers('x-user-phone') actingUserPhone: string,
        @Body() body: { phone: string; tenantId: string; tenantName: string; role: string; name?: string; age?: number; address?: string },
    ) {
        return this.authService.syncMembership(actingUserId, actingUserPhone, body);
    }

    @Post('sync-membership-deactivation')
    syncMembershipDeactivation(
        @Headers('x-user-id') actingUserId: string,
        @Headers('x-user-phone') actingUserPhone: string,
        @Body() body: { phone: string; tenantId: string; role: string },
    ) {
        return this.authService.syncMembershipDeactivation(actingUserId, actingUserPhone, body);
    }

    /**
     * Register or refresh the FCM device token for the authenticated user.
     * Called by the mobile app on startup / token refresh.
     * POST /auth/fcm-token  { token: string }
     */
    @Post('fcm-token')
    registerFcmToken(
        @Headers('x-user-id') userId: string,
        @Body() body: { token: string },
    ) {
        return this.authService.registerFcmToken(userId, body.token);
    }
}
