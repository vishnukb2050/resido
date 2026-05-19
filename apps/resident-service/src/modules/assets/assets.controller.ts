import { Controller, Get, Post, Patch, Delete, Body, Query, Headers, Param, UseInterceptors } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';

@Controller('community/assets')
@UseInterceptors(TenantInterceptor)
export class AssetsController {
    constructor(private readonly assetsService: AssetsService) {}

    @Post()
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
    async updateAsset(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string,
        @Body() data: any
    ) {
        return this.assetsService.updateAsset(tenantId, id, data);
    }

    @Delete(':id')
    async deleteAsset(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string
    ) {
        return this.assetsService.deleteAsset(tenantId, id);
    }
}
