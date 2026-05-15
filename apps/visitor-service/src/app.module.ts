import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './modules/prisma/prisma.module';
import { GatepassModule } from './modules/gatepass/gatepass.module';
import { VisitorsModule } from './modules/visitors/visitors.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GatepassModule,
    VisitorsModule,
  ],
})
export class AppModule {}
