import { Controller, Get, Post, Body, UseInterceptors, Req, Patch, Param } from '@nestjs/common';
import { MembersService } from './members.service';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';

@Controller('members')
@UseInterceptors(TenantInterceptor)
export class MembersController {
    constructor(private membersService: MembersService) {}

    @Get()
    listMembers(@Req() req: any) {
        return this.membersService.listMembers(req.tenantDbName);
    }

    @Post()
    createMember(@Req() req: any, @Body() data: any) {
        return this.membersService.createMember(req.tenantDbName, data);
    }

    @Patch(':id/profile-photo')
    updateProfilePhoto(@Req() req: any, @Param('id') id: string, @Body() body: { profilePhoto: string }) {
        return this.membersService.updateProfilePhoto(req.tenantDbName, id, body.profilePhoto);
    }
}
