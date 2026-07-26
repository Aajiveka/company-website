import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { SseNotificationsService } from './sse-notifications.service';
import { NotificationsQueryDto } from './dto/notifications.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly sse: SseNotificationsService) {}

  /**
   * SSE endpoint. The client opens a persistent connection and receives
   * real-time notification events as `data:` frames.
   */
  @Get('stream')
  @ApiOperation({ summary: 'SSE stream of real-time notifications' })
  stream(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // nginx
    res.flushHeaders();

    // Register this connection
    this.sse.addClient(user.userId, user.roleId, res);

    // Send initial unread count so the client doesn't have to fetch separately
    const unreadCount = this.sse.getUnreadCount(user.userId);
    res.write(`event: connected\ndata: ${JSON.stringify({ unreadCount })}\n\n`);

    // Clean up when the client disconnects
    req.on('close', () => {
      this.sse.removeClient(user.userId);
    });
  }

  @Get()
  @ApiOperation({ summary: 'List notifications (paginated)' })
  list(@CurrentUser() user: RequestUser, @Query() query: NotificationsQueryDto) {
    return this.sse.getNotifications(user.userId, {
      page: query.page,
      pageSize: query.pageSize,
      type: query.type,
      unread: query.unread === 1,
    });
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  markRead(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): void {
    const ok = this.sse.markRead(user.userId, id);
    if (!ok) throw new NotFoundException('Notification not found');
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() user: RequestUser): void {
    this.sse.markAllRead(user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification' })
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): void {
    const ok = this.sse.deleteNotification(user.userId, id);
    if (!ok) throw new NotFoundException('Notification not found');
  }
}
