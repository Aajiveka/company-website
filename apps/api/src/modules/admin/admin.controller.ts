import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/shared/roles';
import { AdminService } from './admin.service';
import {
  AdminApplicationsQueryDto,
  AdminAuditQueryDto,
  AdminCompaniesQueryDto,
  AdminJobsQueryDto,
  AdminUsersQueryDto,
  BulkDeleteUsersDto,
  BulkModerateJobsDto,
  BulkUpdateUsersDto,
  CreateBlogPostDto,
  CreateStaffUserDto,
  EmployerRegistrationsQueryDto,
  JobStatusActionDto,
  ReviewEmployerDto,
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
  @ApiOperation({ summary: 'Paginated logins — search by username, name, email or mobile' })
  users(@Query() query: AdminUsersQueryDto) {
    return this.admin.users(query);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create a staff login (QC1, QC2, Q3 or Admin) and send a set-password link' })
  @ApiResponse({ status: 409, description: 'Username already in use' })
  createStaffUser(@CurrentUser() user: RequestUser, @Body() dto: CreateStaffUserDto) {
    return this.admin.createStaffUser(dto, user.userId);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'One login: profile, sessions, login history, audit trail, applications' })
  @ApiResponse({ status: 404, description: 'User not found' })
  userDetail(@Param('userId', ParseIntPipe) userId: number) {
    return this.admin.userDetail(userId);
  }

  @Post('users/:userId/password-reset')
  @ApiOperation({ summary: 'Mail the user a single-use set-password link' })
  sendPasswordReset(@Param('userId', ParseIntPipe) userId: number, @CurrentUser() user: RequestUser) {
    return this.admin.sendPasswordReset(userId, user.userId);
  }

  @Patch('users/:userId')
  @ApiOperation({ summary: 'Update a user role or active status' })
  @ApiResponse({ status: 404, description: 'User not found' })
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
  @ApiOperation({ summary: 'Paginated jobs with per-status counts' })
  jobs(@Query() query: AdminJobsQueryDto) {
    return this.admin.jobs(query);
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'One job with its applicants, pipeline breakdown and history' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  jobDetail(@Param('jobId', ParseIntPipe) jobId: number) {
    return this.admin.jobDetail(jobId);
  }

  @Post('jobs/:jobId/status')
  @ApiOperation({ summary: 'Close an Active job or reopen a Closed one' })
  @ApiResponse({ status: 400, description: 'The job is not in the state the action starts from' })
  jobStatus(
    @Param('jobId', ParseIntPipe) jobId: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: JobStatusActionDto,
  ) {
    return this.admin.moderateJobs([jobId], dto.action, user.userId);
  }

  @Post('jobs/bulk-moderate')
  @ApiOperation({ summary: 'Close or reopen several jobs; all must start in the right state' })
  bulkModerate(@CurrentUser() user: RequestUser, @Body() dto: BulkModerateJobsDto) {
    return this.admin.moderateJobs(dto.jobIds, dto.action, user.userId);
  }

  /* ─── Applications (read-only pipeline) ─── */

  @Get('applications')
  @ApiOperation({ summary: 'Paginated applications with stage, status and the workspace that owns the next step' })
  applications(@Query() query: AdminApplicationsQueryDto) {
    return this.admin.applications(query);
  }

  @Get('applications/:mapId')
  @ApiOperation({ summary: 'One application: status timeline, referrals, rounds, documents, offer, audit' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  applicationDetail(@Param('mapId', ParseIntPipe) mapId: number) {
    return this.admin.applicationDetail(mapId);
  }

  /* ─── Companies ─── */

  @Get('companies')
  @ApiOperation({ summary: 'Paginated companies with job and application counts' })
  companies(@Query() query: AdminCompaniesQueryDto) {
    return this.admin.companies(query);
  }

  /* ─── Audit trail ─── */

  @Get('audit-logs')
  @ApiOperation({ summary: 'Paginated audit trail, filterable by action prefix, entity and actor' })
  auditLogs(@Query() query: AdminAuditQueryDto) {
    return this.admin.auditLogs(query);
  }

  /* ─── Employer Registrations ─── */

  @Get('employer-registrations')
  @ApiOperation({ summary: 'List pending/all employer registrations' })
  employerRegistrations(@Query() query: EmployerRegistrationsQueryDto) {
    return this.admin.employerRegistrations(query.status);
  }

  @Post('employer-registrations/:id/review')
  @ApiOperation({ summary: 'Approve or reject an employer registration' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  reviewEmployer(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: ReviewEmployerDto,
  ) {
    return this.admin.reviewEmployer(id, dto.decision, user.userId, dto.notes, dto.cityId);
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
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  updateBlogPost(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateBlogPostDto,
  ) {
    return this.admin.updateBlogPost(id, dto, user.userId);
  }

  @Delete('blog-posts/:id')
  @ApiOperation({ summary: 'Delete a blog post' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  deleteBlogPost(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.admin.deleteBlogPost(id, user.userId);
  }
}
