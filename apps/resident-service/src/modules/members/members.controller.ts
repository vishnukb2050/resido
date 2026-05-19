import { Controller, Get, Post, Body, UseInterceptors, Req, Patch, Param, Query, Delete } from '@nestjs/common';
import { MembersService } from './members.service';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';

@Controller('members')
@UseInterceptors(TenantInterceptor)
export class MembersController {
    constructor(private membersService: MembersService) {}

    @Get()
    listMembers(@Query('role') role?: string) {
        return this.membersService.listMembers(role);
    }

    @Get('units')
    getUnits() {
        return this.membersService.getUnits();
    }

    @Post()
    createMember(@Body() data: any) {
        return this.membersService.createMember(data);
    }

    @Patch(':id/profile-photo')
    updateProfilePhoto(@Param('id') id: string, @Body() body: { profilePhoto: string }) {
        return this.membersService.updateProfilePhoto(id, body.profilePhoto);
    }

    @Patch(':id/status')
    updateStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
        return this.membersService.updateStatus(id, body.isActive);
    }

    @Patch(':id')
    updateMember(@Param('id') id: string, @Body() data: any) {
        return this.membersService.updateMember(id, data);
    }

    @Delete(':id')
    deleteMember(@Param('id') id: string) {
        return this.membersService.deleteMember(id);
    }
}
