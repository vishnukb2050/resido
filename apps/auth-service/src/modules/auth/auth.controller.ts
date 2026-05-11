import { Controller, Post, Get, Body, Headers, UseGuards, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

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
        @Body() body: { tenantId: string },
    ) {
        return this.authService.switchWorkspace(userId, body.tenantId);
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
    getUser(@Param('id') id: string) {
        return this.authService.getMe(id); // Reusing getMe logic as it returns same fields
    }

    @Post('sync-contacts')
    syncContacts(@Headers('x-user-id') userId: string, @Body() body: { phones: string[] }) {
        return this.authService.syncContacts(userId, body.phones);
    }

    @Public()
    @Post('sync-membership')
    syncMembership(@Body() body: { phone: string; tenantId: string; tenantName: string; role: string }) {
        return this.authService.syncMembership(body.phone, body.tenantId, body.tenantName, body.role);
    }
}
