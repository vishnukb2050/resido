import { Controller, Post, Get, Body, Param, Patch, UseGuards, Req } from '@nestjs/common';
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

    @Patch(':id/toggle')
    toggleClient(@Param('id') id: string, @Body() body: { isActive: boolean }) {
        return this.clientsService.toggleClient(id, body.isActive);
    }
}
