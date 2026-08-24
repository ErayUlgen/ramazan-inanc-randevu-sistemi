import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminRole, BookingChangeRequestStatus } from '@prisma/client';
import { AdminSessionGuard } from '../admin/admin-session.guard';
import type { AdminRequest } from '../admin/admin-session.guard';
import { BookingChangeRequestsService } from './booking-change-requests.service';
import { DecideBookingChangeRequestDto } from './dto/decide-booking-change-request.dto';
import { AdminRoles } from '../admin/admin-authorization';

@Controller('admin/booking-change-requests')
@UseGuards(AdminSessionGuard)
@AdminRoles(AdminRole.RECEPTIONIST)
export class BookingChangeRequestsController {
  constructor(private readonly changes: BookingChangeRequestsService) {}

  @Get()
  list(
    @Req() request: AdminRequest,
    @Query('branchId') _branchId: string,
    @Query('status') status?: BookingChangeRequestStatus,
  ) {
    return this.changes.list(request.adminIdentity!.branchId, status);
  }

  @Patch(':id/decision')
  decide(@Param('id') id: string, @Body() dto: DecideBookingChangeRequestDto) {
    return this.changes.decide(id, dto);
  }
}
