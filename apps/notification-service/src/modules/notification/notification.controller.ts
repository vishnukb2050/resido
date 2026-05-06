import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationService } from './notification.service';

class SendNotificationDto {
    userId?: string;
    tokens?: string[];
    title: string;
    body: string;
    data?: Record<string, string>;
}

@Controller()
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Post('send')
    @HttpCode(HttpStatus.OK)
    async sendNotification(@Body() dto: SendNotificationDto) {
        return this.notificationService.sendNotification(dto);
    }
}
