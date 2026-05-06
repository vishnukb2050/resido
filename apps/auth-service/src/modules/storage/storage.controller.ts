import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('storage')
export class StorageController {
    constructor(private readonly storageService: StorageService) {}

    @UseGuards(JwtAuthGuard)
    @Post('presigned-url')
    async getPresignedUrl(
        @Body('fileName') fileName: string,
        @Body('contentType') contentType: string,
    ) {
        return this.storageService.getPresignedUrl(fileName, contentType);
    }
}
