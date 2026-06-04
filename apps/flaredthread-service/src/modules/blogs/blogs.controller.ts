import { Controller, Get, Post, Body, Param, Patch, Delete, Req, Query } from '@nestjs/common';
import { BlogsService } from './blogs.service';

// Tenant context is established per-request by TenantMiddleware (als.run),
// which also sets req.tenantId / req.tenantDbName.
@Controller(['threads', 'flares', 'blogs'])
export class BlogsController {
    constructor(private blogsService: BlogsService) {}

    @Get()
    listBlogs(
        @Req() req: any, 
        @Query('feedType') feedType: 'PUBLIC' | 'FOLLOWING' | 'MY' | 'SAVED' | 'RESHARE' | 'AUTHOR' | 'HASHTAG', 
        @Query('followingIds') followingIds: string,
        @Query('category') category?: string,
        @Query('businessProfileId') businessProfileId?: string,
        @Query('authorId') authorId?: string,
        @Query('hashtag') hashtag?: string,
        @Query('limit') limit?: string,
        @Query('cursor') cursor?: string,
    ) {
        const userId = req.headers['x-user-id'] as string;
        const tenantId = req.tenantId as string;
        const fIds = followingIds ? followingIds.split(',').filter(Boolean) : [];
        const path = req.url || '';
        const type = path.includes('threads') ? 'THREAD' : path.includes('flares') ? 'FLARE' : undefined;
        const parsedLimit = limit ? parseInt(limit, 10) : 15;
        return this.blogsService.listBlogs(
            type as any,
            userId,
            feedType,
            fIds,
            tenantId,
            category,
            businessProfileId,
            authorId,
            hashtag,
            parsedLimit,
            cursor,
        );
    }

    /**
     * Returns up to 12 distinct hashtags that match the given prefix /
     * substring across recently published posts, optionally narrowed to
     * THREAD or FLARE so the search popovers on each screen surface only
     * the relevant tags. Used by ThreadScreen / FlaresScreen to power the
     * "search a hashtag" dropdown — selecting one of these strings then
     * issues `feedType=HASHTAG` to filter the feed itself.
     */
    @Get('hashtags/suggest')
    suggestHashtags(
        @Req() req: any,
        @Query('q') q: string,
        @Query('type') type?: 'THREAD' | 'FLARE',
    ) {
        // The route is mounted under threads/flares/blogs. When the client
        // hits `/threads/hashtags/suggest` we infer the THREAD scope even
        // if they didn't pass ?type — same for flares.
        const path: string = req.url || '';
        const inferred: 'THREAD' | 'FLARE' | undefined = path.includes('/threads/')
            ? 'THREAD'
            : path.includes('/flares/')
                ? 'FLARE'
                : undefined;
        return this.blogsService.suggestHashtags(q, type || inferred);
    }

    /**
     * Unified "For You" feed: one request returns the merged, visibility-gated
     * stream of public posts + posts from followed authors, across BOTH threads
     * and flares, ordered newest-first with a cursor. Replaces the 4 separate
     * feed calls the mobile home screen used to make. Declared before `:id` so
     * the literal path isn't captured by the `@Get(':id')` route.
     */
    @Get('for-you')
    forYouFeed(
        @Req() req: any,
        @Query('followingIds') followingIds: string,
        @Query('limit') limit?: string,
        @Query('cursor') cursor?: string,
    ) {
        const userId = req.headers['x-user-id'] as string;
        const tenantId = req.tenantId as string;
        const fIds = followingIds ? followingIds.split(',').filter(Boolean) : [];
        const parsedLimit = limit ? parseInt(limit, 10) : 20;
        return this.blogsService.listBlogs(
            undefined, // both threads and flares
            userId,
            'FORYOU',
            fIds,
            tenantId,
            undefined,
            undefined,
            undefined,
            undefined,
            parsedLimit,
            cursor,
        );
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
        const tenantId = req.tenantId as string;
        return this.blogsService.createBlog(userId, data, tenantId);
    }

    @Get(':id')
    getBlog(@Req() req: any, @Param('id') id: string) {
        const userId = req.headers['x-user-id'] as string;
        return this.blogsService.getBlog(id, userId);
    }

    @Patch(':id')
    updateBlog(@Req() req: any, @Param('id') id: string, @Body() data: any) {
        const userId = req.headers['x-user-id'] as string;
        const tenantId = req.tenantId as string;
        return this.blogsService.updateBlog(id, data, userId, tenantId);
    }

    @Delete(':id')
    deleteBlog(@Req() req: any, @Param('id') id: string) {
        const userId = req.headers['x-user-id'] as string;
        const tenantId = req.tenantId as string;
        return this.blogsService.deleteBlog(id, userId, tenantId);
    }

    @Post(':id/like')
    toggleLike(@Req() req: any, @Param('id') id: string) {
        const userId = req.headers['x-user-id'] as string;
        const tenantId = req.tenantId as string;
        return this.blogsService.toggleLike(id, userId, tenantId);
    }

    @Post(':id/comment')
    addComment(@Req() req: any, @Param('id') id: string, @Body() body: any) {
        const userId = req.headers['x-user-id'] as string;
        const tenantId = req.tenantId as string;
        return this.blogsService.addComment(id, userId, body, tenantId);
    }

    @Get(':id/comments')
    getComments(@Param('id') id: string) {
        return this.blogsService.getComments(id);
    }

    @Post(':id/reshare')
    reshare(@Req() req: any, @Param('id') id: string, @Body() userData: any) {
        const userId = req.headers['x-user-id'] as string;
        const tenantId = req.tenantId as string;
        return this.blogsService.reshareBlog(id, userId, tenantId, userData);
    }

    @Post('polls/:id/vote')
    votePoll(@Req() req: any, @Param('id') pollId: string, @Body() body: { optionId: string }) {
        const userId = req.headers['x-user-id'] as string;
        const tenantId = req.tenantId as string;
        return this.blogsService.votePoll(pollId, body.optionId, userId, tenantId);
    }

    @Post(':id/save')
    toggleSave(@Req() req: any, @Param('id') id: string) {
        const userId = req.headers['x-user-id'] as string;
        const tenantId = req.tenantId as string;
        return this.blogsService.toggleSave(id, userId, tenantId);
    }
}
