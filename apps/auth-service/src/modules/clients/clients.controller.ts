import { Controller, Post, Get, Body, Param, Patch, UseGuards, Req, Delete } from '@nestjs/common';
import { ClientsService, CreateClientDto } from './clients.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
    constructor(private clientsService: ClientsService) {}

    // SuperAdmin, authenticated mobile user, or public landing page creates a community
    @Public()
    @Post()
    createClient(@Body() dto: CreateClientDto, @Req() req: any) {
        // If request comes from an authenticated user (e.g. mobile app)
        if (req.user) {
            dto.createdByMobile = req.user.role === 'RESIDENT' || req.user.role === 'APARTMENT_ADMIN';
            dto.createdByUserId = req.user.sub;
        }
        return this.clientsService.createClient(dto);
    }

    // List communities the caller belongs to (not the entire catalog).
    @Get()
    listClients(@Req() req: any) {
        return this.clientsService.listClients(req.user);
    }

    @Get(':id')
    getClient(@Param('id') id: string, @Req() req: any) {
        return this.clientsService.getClient(id, req.user);
    }

    @Patch(':id')
    updateClient(@Param('id') id: string, @Body() body: { name?: string; photoUrl?: string }, @Req() req: any) {
        return this.clientsService.updateClient(id, body, req.user);
    }

    @Get(':id/staff')
    getClientStaff(@Param('id') id: string, @Req() req: any) {
        return this.clientsService.getClientStaff(id, req.user);
    }

    @Post(':id/staff')
    addClientStaff(@Param('id') id: string, @Body() body: { phone: string; role: 'APARTMENT_ADMIN' | 'CARETAKER' | 'ADMIN_STAFF'; name?: string }, @Req() req: any) {
        return this.clientsService.addClientStaff(id, body, req.user);
    }

    @Delete(':id/staff/:membershipId')
    removeClientStaff(@Param('id') id: string, @Param('membershipId') membershipId: string, @Req() req: any) {
        return this.clientsService.removeClientStaff(id, membershipId, req.user);
    }

    @Patch(':id/toggle')
    toggleClient(@Param('id') id: string, @Body() body: { isActive: boolean }, @Req() req: any) {
        return this.clientsService.toggleClient(id, body.isActive, req.user);
    }

    @Delete(':id')
    deleteClient(
        @Param('id') id: string,
        @Body() body: { confirmName?: string },
        @Req() req: any,
    ) {
        return this.clientsService.deleteClient(id, body, req.user);
    }

    // Any non-admin member can call this to exit a community they belong to.
    // APARTMENT_ADMIN cannot use it — the service enforces that.
    @Post(':id/leave')
    leaveClient(@Param('id') id: string, @Req() req: any) {
        return this.clientsService.leaveClient(id, req.user);
    }
}
