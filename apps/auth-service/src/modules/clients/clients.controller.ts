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

    // Superadmin or staff: list all clients
    @Get()
    listClients() {
        return this.clientsService.listClients();
    }

    @Get(':id')
    getClient(@Param('id') id: string) {
        return this.clientsService.getClient(id);
    }

    @Patch(':id')
    updateClient(@Param('id') id: string, @Body() body: { name?: string; photoUrl?: string }) {
        return this.clientsService.updateClient(id, body);
    }

    @Get(':id/staff')
    getClientStaff(@Param('id') id: string) {
        return this.clientsService.getClientStaff(id);
    }

    @Post(':id/staff')
    addClientStaff(@Param('id') id: string, @Body() body: { phone: string; role: 'APARTMENT_ADMIN' | 'CARETAKER' | 'ADMIN_STAFF'; name?: string }) {
        return this.clientsService.addClientStaff(id, body);
    }

    @Delete(':id/staff/:membershipId')
    removeClientStaff(@Param('id') id: string, @Param('membershipId') membershipId: string) {
        return this.clientsService.removeClientStaff(id, membershipId);
    }

    @Patch(':id/toggle')
    toggleClient(@Param('id') id: string, @Body() body: { isActive: boolean }) {
        return this.clientsService.toggleClient(id, body.isActive);
    }

    @Delete(':id')
    deleteClient(
        @Param('id') id: string,
        @Body() body: { confirmName?: string },
        @Req() req: any,
    ) {
        return this.clientsService.deleteClient(id, body, req.user);
    }
}
