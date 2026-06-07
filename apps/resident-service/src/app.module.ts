import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenantPrismaModule } from './modules/prisma/tenant-prisma.module';
import { MembersModule } from './modules/members/members.module';
import { StorageModule } from './modules/storage/storage.module';
import { CommunityModule } from './modules/community/community.module';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { FinanceModule } from './modules/finance/finance.module';
import { AmenitiesModule } from './modules/amenities/amenities.module';
import { AssetsModule } from './modules/assets/assets.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ParkingModule } from './modules/parking/parking.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TenantPrismaModule,
    MembersModule,
    StorageModule,
    CommunityModule,
    FinanceModule,
    AmenitiesModule,
    AssetsModule,
    RemindersModule,
    AttendanceModule,
    ParkingModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes('*');
  }
}
