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
import { BookingsService } from './bookings.service';
import { BookingOperationsService } from './booking-operations.service';
import { BookingDecisionDto } from './dto/booking-decision.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { GetAdminBookingBoardDto } from './dto/get-admin-booking-board.dto';
import { CreateAdminBookingDto } from './dto/create-admin-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { UpdateBookingDetailsDto } from './dto/update-booking-details.dto';
import { MarkNoShowDto } from './dto/mark-no-show.dto';
import { RevertNoShowDto } from './dto/revert-no-show.dto';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { ListAdminBookingsDto } from './dto/list-admin-bookings.dto';
import { AdminRole } from '@prisma/client';
import { AdminRoles } from '../admin/admin-authorization';
import { GetAdminWeekBoardDto } from './dto/get-admin-week-board.dto';

@UseGuards(AdminSessionGuard)
@Controller('admin')
export class AdminBookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly operations: BookingOperationsService,
    private readonly audit: OperationsAuditService,
  ) {}

  @Get('booking-board')
  @AdminRoles(AdminRole.RECEPTIONIST, AdminRole.PROFESSIONAL)
  board(@Req() request: AdminRequest, @Query() query: GetAdminBookingBoardDto) {
    const identity = request.adminIdentity!;
    return this.bookings.getAdminBookingBoard(
      query.branchSlug,
      query.date,
      identity.role === AdminRole.PROFESSIONAL
        ? (identity.professionalId ?? undefined)
        : undefined,
    );
  }

  @Get('booking-board/week')
  @AdminRoles(AdminRole.RECEPTIONIST, AdminRole.PROFESSIONAL)
  weekBoard(
    @Req() request: AdminRequest,
    @Query() query: GetAdminWeekBoardDto,
  ) {
    const identity = request.adminIdentity!;
    return this.bookings.getAdminWeekBoard(
      query.branchSlug,
      query.date,
      identity.role === AdminRole.PROFESSIONAL
        ? (identity.professionalId ?? undefined)
        : query.professionalId,
    );
  }

  @Get('bookings')
  @AdminRoles(AdminRole.RECEPTIONIST, AdminRole.PROFESSIONAL)
  list(@Req() request: AdminRequest, @Query() query: ListAdminBookingsDto) {
    const identity = request.adminIdentity!;
    return this.bookings.listForAdmin(
      identity.branchId,
      query,
      identity.role === AdminRole.PROFESSIONAL
        ? (identity.professionalId ?? undefined)
        : undefined,
    );
  }

  @Post('bookings')
  @AdminRoles(AdminRole.RECEPTIONIST)
  create(@Body() dto: CreateAdminBookingDto) {
    return this.operations.create(dto);
  }

  @Patch('bookings/:id/reschedule')
  @AdminRoles(AdminRole.RECEPTIONIST)
  reschedule(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: RescheduleBookingDto,
  ) {
    return this.operations.reschedule(id, dto, request.adminIdentity);
  }

  @Post('bookings/:id/reschedule-preview')
  @AdminRoles(AdminRole.RECEPTIONIST)
  reschedulePreview(
    @Param('id') id: string,
    @Body() dto: RescheduleBookingDto,
  ) {
    return this.operations.previewReschedule(id, dto);
  }

  @Patch('bookings/:id/details')
  @AdminRoles(AdminRole.RECEPTIONIST)
  updateDetails(@Param('id') id: string, @Body() dto: UpdateBookingDetailsDto) {
    return this.operations.updateDetails(id, dto);
  }

  @Post('bookings/:id/no-show')
  @AdminRoles(AdminRole.RECEPTIONIST, AdminRole.PROFESSIONAL)
  markNoShow(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: MarkNoShowDto,
  ) {
    return this.operations.markNoShow(id, dto, request.adminIdentity);
  }

  @Post('bookings/:id/no-show/revert')
  @AdminRoles(AdminRole.RECEPTIONIST, AdminRole.PROFESSIONAL)
  revertNoShow(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: RevertNoShowDto,
  ) {
    return this.operations.revertNoShow(id, dto, request.adminIdentity);
  }

  @Get('bookings/:id/audit')
  @AdminRoles(AdminRole.RECEPTIONIST)
  auditHistory(@Param('id') id: string) {
    return this.audit.listForBooking(id);
  }

  @Patch('bookings/:id/decision')
  @AdminRoles(AdminRole.RECEPTIONIST)
  decide(@Param('id') id: string, @Body() dto: BookingDecisionDto) {
    return this.bookings.decide(id, dto);
  }

  @Patch('bookings/:id/cancel')
  @AdminRoles(AdminRole.RECEPTIONIST)
  cancel(@Param('id') id: string, @Body() dto: CancelBookingDto) {
    return this.bookings.cancel(id, dto);
  }
}
