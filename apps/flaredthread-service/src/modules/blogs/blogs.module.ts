import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BlogsController } from './blogs.controller';
import { BlogsService } from './blogs.service';
import { StorageModule } from '../storage/storage.module';
import { FlareGateway } from './flare.gateway';

@Module({
    imports: [HttpModule, StorageModule],
    controllers: [BlogsController],
    providers: [BlogsService, FlareGateway],
})
export class BlogsModule {}
