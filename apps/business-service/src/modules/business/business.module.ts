import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { LocationResolverService } from './location-resolver.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [BusinessController],
    providers: [BusinessService, LocationResolverService],
})
export class BusinessModule {}
