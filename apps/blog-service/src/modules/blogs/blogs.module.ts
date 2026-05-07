import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BlogsController } from './blogs.controller';
import { BlogsService } from './blogs.service';

@Module({
    imports: [HttpModule],
    controllers: [BlogsController],
    providers: [BlogsService],
})
export class BlogsModule {}
