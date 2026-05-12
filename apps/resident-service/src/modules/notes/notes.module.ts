import { Module } from '@nestjs/common';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { TenantPrismaModule } from '../prisma/tenant-prisma.module';

@Module({
    imports: [TenantPrismaModule],
    controllers: [NotesController],
    providers: [NotesService],
})
export class NotesModule {}
