import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { TenantPrismaModule } from '../prisma/tenant-prisma.module';

@Module({
    imports: [TenantPrismaModule],
    controllers: [DocumentsController],
    providers: [DocumentsService],
})
export class DocumentsModule {}
