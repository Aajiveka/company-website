import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/shared/roles';
import { AdminService } from './admin.service';
import {
  AdminJobsQueryDto,
  AdminUsersQueryDto,
  BulkDeleteUsersDto,
  BulkModerateJobsDto,
  BulkUpdateUsersDto,
  CreateBlogPostDto,
  UpdateBlogPostDto,
  UpdateSettingsDto,
  UpdateUserDto,
} from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@Roles(Role.Admin)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  /* ─── Stats ─── */

  @Get('stats')
  @ApiOperation({ summary: 'Platform-wide statistics for the admin dashboard' })
  stats() {
    return this.admin.stats();
  }

  /* ─── Users ─── */

  @Get('users')
  @ApiOperation({ summary: 'List all users with optional search/filter' })
  users(@Query() query: AdminUsersQueryDto) {
    return this.admin.users(query);
  }

  @Patch('users/:userId')
  @ApiOperation({ summary: 'Update a user role or active status' })
  updateUser(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateUserDto,
  ) {
    return this.admin.updateUser(userId, dto, user.userId);
  }

  @Post('users/bulk-delete')
  @ApiOperation({ summary: 'Bulk soft-delete users (set inactive)' })
  bulkDeleteUsers(@CurrentUser() user: RequestUser, @Body() dto: BulkDeleteUsersDto) {
    return this.admin.bulkDeleteUsers(dto.userIds, user.userId);
  }

  @Post('users/bulk-update')
  @ApiOperation({ summary: 'Bulk update user roles or status' })
  bulkUpdateUsers(@CurrentUser() user: RequestUser, @Body() dto: BulkUpdateUsersDto) {
    return this.admin.bulkUpdateUsers(dto.userIds, { isActive: dto.isActive, roleId: dto.roleId }, user.userId);
  }

  /* ─── Jobs ─── */

  @Get('jobs')
  @ApiOperation({ summary: 'List all jobs with optional search/filter' })
  jobs(@Query() query: AdminJobsQueryDto) {
    return this.admin.jobs(query);
  }

  @Post('jobs/:jobId/approve')
  @ApiOperation({ summary: 'Approve a job listing' })
  approveJob(@Param('jobId', ParseIntPipe) jobId: number, @CurrentUser() user: RequestUser) {
    return this.admin.approveJob(jobId, user.userId);
  }

  @Post('jobs/:jobId/reject')
  @ApiOperation({ summary: 'Reject a job listing' })
  rejectJob(@Param('jobId', ParseIntPipe) jobId: number, @CurrentUser() user: RequestUser) {
    return this.admin.rejectJob(jobId, user.userId);
  }

  @Post('jobs/bulk-moderate')
  @ApiOperation({ summary: 'Bulk approve or reject job listings' })
  bulkModerate(@CurrentUser() user: RequestUser, @Body() dto: BulkModerateJobsDto) {
    return this.admin.bulkModerateJobs(dto.jobIds, dto.action, user.userId);
  }

  /* ─── Settings ─── */

  @Get('settings')
  @ApiOperation({ summary: 'Get platform settings' })
  getSettings() {
    return this.admin.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update platform settings' })
  updateSettings(@CurrentUser() user: RequestUser, @Body() dto: UpdateSettingsDto) {
    return this.admin.updateSettings(dto, user.userId);
  }

  /* ─── Blog Posts ─── */

  @Get('blog-posts')
  @ApiOperation({ summary: 'List all blog posts' })
  blogPosts() {
    return this.admin.blogPosts();
  }

  @Post('blog-posts')
  @ApiOperation({ summary: 'Create a blog post' })
  createBlogPost(@CurrentUser() user: RequestUser, @Body() dto: CreateBlogPostDto) {
    return this.admin.createBlogPost(dto, user.userId);
  }

  @Patch('blog-posts/:id')
  @ApiOperation({ summary: 'Update a blog post' })
  updateBlogPost(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateBlogPostDto,
  ) {
    return this.admin.updateBlogPost(id, dto, user.userId);
  }

  @Delete('blog-posts/:id')
  @ApiOperation({ summary: 'Delete a blog post' })
  deleteBlogPost(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.admin.deleteBlogPost(id, user.userId);
  }
}
