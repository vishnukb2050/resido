import { Controller, Get, Post, Patch, Delete, Body, Query, Headers, Param, UseInterceptors, UseGuards } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';

const MANAGE_ROLES = ['APARTMENT_ADMIN', 'ADMIN_STAFF'];

@Controller('community/assets')
@UseInterceptors(TenantInterceptor)
export class AssetsController {
    constructor(private readonly assetsService: AssetsService) {}

    @Post()
    @UseGuards(RolesGuard)
    @Roles(...MANAGE_ROLES)
    async createAsset(
        @Headers('x-tenant-id') tenantId: string,
        @Body() data: any
    ) {
        return this.assetsService.createAsset(tenantId, data);
    }

    @Get()
    async getAssets(
        @Headers('x-tenant-id') tenantId: string,
        @Query() query: any
    ) {
        return this.assetsService.getAssets(tenantId, query);
    }

    @Get(':id')
    async getAsset(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string
    ) {
        return this.assetsService.getAsset(tenantId, id);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(...MANAGE_ROLES)
    async updateAsset(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string,
        @Body() data: any
    ) {
        return this.assetsService.updateAsset(tenantId, id, data);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(...MANAGE_ROLES)
    async deleteAsset(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string
    ) {
        return this.assetsService.deleteAsset(tenantId, id);
    }
}
