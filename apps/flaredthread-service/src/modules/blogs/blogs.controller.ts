import { Controller, Get, Post, Body, Param, Patch, Delete, Req, UseInterceptors, Query } from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';

@Controller(['threads', 'flares', 'blogs'])
@UseInterceptors(TenantInterceptor)
export class BlogsController {
    constructor(private blogsService: BlogsService) {}

    @Get()
    listBlogs(@Req() req: any, @Query('feedType') feedType: 'PUBLIC' | 'FOLLOWING' | 'MY', @Query('followingIds') followingIds: string) {
        const userId = req.headers['x-user-id'] as string;
        const tenantId = req.tenantId as string;
        const fIds = followingIds ? followingIds.split(',') : [];
        // Determine type from path
        const path = req.url || '';
        const type = path.includes('threads') ? 'THREAD' : path.includes('flares') ? 'FLARE' : undefined;
        return this.blogsService.listBlogs(type as any, userId, feedType, fIds, tenantId);
    }

    @Post('upload-url')
    async getUploadUrl(
        @Req() req: any,
        @Body() body: { fileName: string; contentType: string; blogType: 'THREAD' | 'FLARE'; mediaType: 'IMAGE' | 'VIDEO' }
    ) {
        const tenantId = req.tenantId as string;
        const userId = req.headers['x-user-id'] as string;
        return this.blogsService.generateUploadUrl(tenantId, userId, body.fileName, body.contentType, body.blogType, body.mediaType);
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

    @Post(':id/like')
    toggleLike(@Req() req: any, @Param('id') id: string) {
        const userId = req.headers['x-user-id'] as string;
        return this.blogsService.toggleLike(id, userId);
    }

    @Post(':id/comment')
    addComment(@Req() req: any, @Param('id') id: string, @Body() body: any) {
        const userId = req.headers['x-user-id'] as string;
        return this.blogsService.addComment(id, userId, body);
    }

    @Get(':id/comments')
    getComments(@Param('id') id: string) {
        return this.blogsService.getComments(id);
    }

    @Post(':id/reshare')
    reshare(@Req() req: any, @Param('id') id: string) {
        const userId = req.headers['x-user-id'] as string;
        return this.blogsService.reshare(id, userId);
    }

    @Post(':id/save')
    toggleSave(@Req() req: any, @Param('id') id: string) {
        const userId = req.headers['x-user-id'] as string;
        return this.blogsService.toggleSave(id, userId);
    }
}
