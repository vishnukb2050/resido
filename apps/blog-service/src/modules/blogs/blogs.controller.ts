import { Controller, Get, Post, Body, Param, Patch, Delete, Req, UseInterceptors } from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';

@Controller('blogs')
@UseInterceptors(TenantInterceptor)
export class BlogsController {
    constructor(private blogsService: BlogsService) {}

    @Get()
    listBlogs() {
        return this.blogsService.listBlogs();
    }

    @Post()
    createBlog(@Req() req: any, @Body() data: any) {
        const userId = req.headers['x-user-id'] as string;
        return this.blogsService.createBlog(userId, data);
    }

    @Get(':id')
    getBlog(@Param('id') id: string) {
        return this.blogsService.getBlog(id);
    }

    @Patch(':id')
    updateBlog(@Param('id') id: string, @Body() data: any) {
        return this.blogsService.updateBlog(id, data);
    }

    @Delete(':id')
    deleteBlog(@Param('id') id: string) {
        return this.blogsService.deleteBlog(id);
    }
}
