import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AdminSessionGuard,
  type AdminRequest,
} from '../admin/admin-session.guard';
import { AdminNotificationsService } from './admin-notifications.service';
import { AdminRole } from '@prisma/client';
import { AdminRoles } from '../admin/admin-authorization';
import {
  ListNotificationsDto,
  UpsertNotificationRuleDto,
} from './dto/notification-rule.dto';
import { NotificationRulesService } from './notification-rules.service';

@UseGuards(AdminSessionGuard)
@AdminRoles(AdminRole.RECEPTIONIST)
@Controller('admin')
export class AdminNotificationsController {
  constructor(
    private readonly notifications: AdminNotificationsService,
    private readonly rules: NotificationRulesService,
  ) {}

  @Get('notifications')
  all(@Req() request: AdminRequest, @Query() query: ListNotificationsDto) {
    return this.notifications.listAll(request.adminIdentity!.branchId, query);
  }

  @Get('bookings/:bookingId/notifications')
  list(@Param('bookingId') bookingId: string) {
    return this.notifications.list(bookingId);
  }

  @Post('notifications/:id/retry')
  retry(@Req() request: AdminRequest, @Param('id') id: string) {
    return this.notifications.retry(id, request.adminIdentity);
  }

  @Get('notification-rules')
  listRules(@Req() request: AdminRequest) {
    return this.rules.list(request.adminIdentity!.branchId);
  }

  @Post('notification-rules')
  createRule(
    @Req() request: AdminRequest,
    @Body() dto: UpsertNotificationRuleDto,
  ) {
    return this.rules.create(
      request.adminIdentity!.branchId,
      dto,
      request.adminIdentity!,
    );
  }

  @Patch('notification-rules/:id')
  updateRule(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: UpsertNotificationRuleDto,
  ) {
    return this.rules.update(
      request.adminIdentity!.branchId,
      id,
      dto,
      request.adminIdentity!,
    );
  }
}
