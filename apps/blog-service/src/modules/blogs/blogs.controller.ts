import { Controller, Get, Post, Body, Param, Patch, Delete, Req, UseInterceptors } from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';

@Controller('blogs')
@UseInterceptors(TenantInterceptor)
export class BlogsController {
    constructor(private blogsService: BlogsService) {}

    @Get()
    listBlogs(@Req() req: any) {
        return this.blogsService.listBlogs(req.tenantDbName);
    }

    @Post()
    createBlog(@Req() req: any, @Body() data: any) {
        const userId = req.headers['x-user-id'] as string;
        return this.blogsService.createBlog(req.tenantDbName, userId, data);
    }

    @Get(':id')
    getBlog(@Req() req: any, @Param('id') id: string) {
        return this.blogsService.getBlog(req.tenantDbName, id);
    }

    @Patch(':id')
    updateBlog(@Req() req: any, @Param('id') id: string, @Body() data: any) {
        return this.blogsService.updateBlog(req.tenantDbName, id, data);
    }

    @Delete(':id')
    deleteBlog(@Req() req: any, @Param('id') id: string) {
        return this.blogsService.deleteBlog(req.tenantDbName, id);
    }
}
