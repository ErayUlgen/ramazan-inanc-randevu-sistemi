import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminRole } from '@prisma/client';
import { AdminRoles } from '../admin/admin-authorization';
import {
  AdminSessionGuard,
  type AdminRequest,
} from '../admin/admin-session.guard';
import { CalendarSubscriptionsService } from './calendar-subscriptions.service';
import { CreateCalendarSubscriptionDto } from './dto/calendar-subscription.dto';

@Controller()
export class CalendarSubscriptionsController {
  constructor(private readonly subscriptions: CalendarSubscriptionsService) {}

  @Get('admin/calendar-subscriptions')
  @UseGuards(AdminSessionGuard)
  @AdminRoles(AdminRole.OWNER)
  list(@Req() request: AdminRequest) {
    return this.subscriptions.list(request.adminIdentity!.branchId);
  }

  @Post('admin/calendar-subscriptions')
  @UseGuards(AdminSessionGuard)
  @AdminRoles(AdminRole.OWNER)
  create(
    @Req() request: AdminRequest,
    @Body() dto: CreateCalendarSubscriptionDto,
  ) {
    return this.subscriptions.create(
      request.adminIdentity!.branchId,
      dto,
      request.adminIdentity!,
    );
  }

  @Post('admin/calendar-subscriptions/:id/rotate')
  @UseGuards(AdminSessionGuard)
  @AdminRoles(AdminRole.OWNER)
  rotate(@Req() request: AdminRequest, @Param('id') id: string) {
    return this.subscriptions.rotate(
      request.adminIdentity!.branchId,
      id,
      request.adminIdentity!,
    );
  }

  @Delete('admin/calendar-subscriptions/:id')
  @UseGuards(AdminSessionGuard)
  @AdminRoles(AdminRole.OWNER)
  revoke(@Req() request: AdminRequest, @Param('id') id: string) {
    return this.subscriptions.revoke(
      request.adminIdentity!.branchId,
      id,
      request.adminIdentity!,
    );
  }

  @Get('calendar/subscriptions/:token.ics')
  async calendar(@Param('token') token: string, @Res() response: Response) {
    const content = await this.subscriptions.calendar(token);
    response.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    response.setHeader('Cache-Control', 'private, max-age=60');
    response.send(content);
  }
}
