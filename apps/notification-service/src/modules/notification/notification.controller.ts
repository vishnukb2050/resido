import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';
import { NotificationService } from './notification.service';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

class SendNotificationDto {
    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tokens?: string[];

    @IsString()
    title: string;

    @IsString()
    body: string;

    @IsOptional()
    @IsObject()
    data?: Record<string, string>;
}

@Controller()
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    // Internal-only: callable by backend services with the shared secret, not
    // by end users through the public gateway.
    @UseGuards(InternalAuthGuard)
    @Post('send')
    @HttpCode(HttpStatus.OK)
    async sendNotification(@Body() dto: SendNotificationDto) {
        return this.notificationService.sendNotification(dto);
    }
}
