import { Controller, Post, Get, Body, Param, Patch } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';

@Controller('clients')
export class WorkspaceController {
    constructor(private workspaceService: WorkspaceService) { }

    @Post()
    onboardClient(@Body() body: {
        name: string;
        slug: string;
        adminEmail: string;
        adminPhone: string;
        plan?: string;
    }) {
        return this.workspaceService.onboardClient(body);
    }

    @Get()
    listClients() {
        return this.workspaceService.listClients();
    }

    @Get(':id')
    getClient(@Param('id') id: string) {
        return this.workspaceService.getClient(id);
    }

    @Patch(':id/toggle')
    toggleClient(@Param('id') id: string, @Body() body: { isActive: boolean }) {
        return this.workspaceService.toggleClient(id, body.isActive);
    }
}
