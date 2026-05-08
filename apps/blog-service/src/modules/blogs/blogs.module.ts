import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BlogsController } from './blogs.controller';
import { BlogsService } from './blogs.service';
import { StorageModule } from '../storage/storage.module';

@Module({
    imports: [HttpModule, StorageModule],
    controllers: [BlogsController],
    providers: [BlogsService],
})
export class BlogsModule {}
