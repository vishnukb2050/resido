import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule, HttpModule],
    controllers: [WorkspaceController],
    providers: [WorkspaceService],
})
export class WorkspaceModule { }
