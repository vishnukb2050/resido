import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';
import { TenantPrismaModule } from '../prisma/tenant-prisma.module';

@Module({
    imports: [
        TenantPrismaModule,
        ScheduleModule.forRoot(), // Enable NestJS Cron schedules
    ],
    controllers: [RemindersController],
    providers: [RemindersService],
    exports: [RemindersService],
})
export class RemindersModule {}
