import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { StaffService } from './staff.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('staff')
export class StaffController {
    constructor(private staffService: StaffService) {}

    // Web panel email+password login
    @Public()
    @Post('login')
    login(@Body() body: { email: string; password: string }) {
        return this.staffService.emailLogin(body.email, body.password);
    }

    // Accept invite & set password
    @Public()
    @Post('accept-invite')
    acceptInvite(@Body() body: { inviteToken: string; password: string }) {
        return this.staffService.acceptInvite(body.inviteToken, body.password);
    }

    // Validate invite token (for pre-fill on invite page)
    @Public()
    @Get('invite/:token')
    validateInvite(@Param('token') token: string) {
        return this.staffService.validateInviteToken(token);
    }

    // Get current staff profile
    @UseGuards(JwtAuthGuard)
    @Get('me')
    getMe(@Req() req: any) {
        return this.staffService.getMe(req.user.sub);
    }
}
