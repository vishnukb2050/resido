import { Controller, Get, Post, Body, UseInterceptors, UseGuards, Req, Patch, Param, Query, Delete, Headers } from '@nestjs/common';
import { MembersService } from './members.service';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';

// Managing the member directory (create/edit/deactivate/delete) is an admin
// operation. Residents may only read.
const MANAGE_ROLES = ['APARTMENT_ADMIN', 'ADMIN_STAFF'];

@Controller('members')
@UseInterceptors(TenantInterceptor)
export class MembersController {
    constructor(private membersService: MembersService) {}

    @Get()
    listMembers(
        @Query('role') role?: string,
        @Query('skip') skip?: string,
        @Query('take') take?: string,
    ) {
        return this.membersService.listMembers(role, Number(skip) || 0, Number(take) || 0);
    }

    @Get('units')
    getUnits() {
        return this.membersService.getUnits();
    }

    @Get(':id')
    getMember(@Param('id') id: string) {
        return this.membersService.getMember(id);
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(...MANAGE_ROLES)
    createMember(@Body() data: any) {
        return this.membersService.createMember(data);
    }

    @Patch(':id/profile-photo')
    updateProfilePhoto(
        @Param('id') id: string,
        @Headers('x-user-id') actingUserId: string,
        @Headers('x-user-role') actingRole: string,
        @Body() body: { profilePhoto: string },
    ) {
        // A member may update their own photo; admins may update anyone's.
        return this.membersService.updateProfilePhoto(id, body.profilePhoto, { actingUserId, actingRole, manageRoles: MANAGE_ROLES });
    }

    @Patch(':id/status')
    @UseGuards(RolesGuard)
    @Roles(...MANAGE_ROLES)
    updateStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
        return this.membersService.updateStatus(id, body.isActive);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(...MANAGE_ROLES)
    updateMember(@Param('id') id: string, @Body() data: any) {
        return this.membersService.updateMember(id, data);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(...MANAGE_ROLES)
    deleteMember(@Param('id') id: string) {
        return this.membersService.deleteMember(id);
    }
}
