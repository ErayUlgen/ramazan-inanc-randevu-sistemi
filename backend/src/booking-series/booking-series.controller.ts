import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { AdminRoles } from '../admin/admin-authorization';
import { AdminSessionGuard } from '../admin/admin-session.guard';
import type { AdminRequest } from '../admin/admin-session.guard';
import { CustomerSessionGuard } from '../customer-account/customer-session.guard';
import type { CustomerRequest } from '../customer-account/customer-session.guard';
import { BookingSeriesService } from './booking-series.service';
import {
  CreateAdminBookingSeriesDto,
  CreateBookingSeriesDto,
  PreviewBookingSeriesDto,
} from './dto/create-booking-series.dto';

@Controller('customer-account/booking-series')
@UseGuards(CustomerSessionGuard)
export class CustomerBookingSeriesController {
  constructor(private readonly series: BookingSeriesService) {}

  @Post('preview')
  preview(
    @Req() request: CustomerRequest,
    @Body() dto: PreviewBookingSeriesDto,
  ) {
    return this.series.previewCustomer(
      request.customerIdentity!.customerId,
      dto,
    );
  }

  @Post()
  create(@Req() request: CustomerRequest, @Body() dto: CreateBookingSeriesDto) {
    return this.series.createCustomer(
      request.customerIdentity!.customerId,
      dto,
    );
  }

  @Get(':id')
  get(@Req() request: CustomerRequest, @Param('id') id: string) {
    return this.series.getCustomer(request.customerIdentity!.customerId, id);
  }

  @Delete(':id')
  cancel(
    @Req() request: CustomerRequest,
    @Param('id') id: string,
    @Query('fromOccurrence') fromOccurrence?: string,
  ) {
    return this.series.cancelCustomer(
      request.customerIdentity!.customerId,
      id,
      Math.max(1, Number(fromOccurrence) || 1),
    );
  }
}

@Controller('admin/booking-series')
@UseGuards(AdminSessionGuard)
@AdminRoles(AdminRole.RECEPTIONIST)
export class AdminBookingSeriesController {
  constructor(private readonly series: BookingSeriesService) {}

  @Post()
  create(
    @Req() request: AdminRequest,
    @Body() dto: CreateAdminBookingSeriesDto,
  ) {
    const identity = request.adminIdentity!;
    return this.series.createAdmin(identity.branchId, identity.userId, dto);
  }

  @Get(':id')
  get(@Req() request: AdminRequest, @Param('id') id: string) {
    return this.series.getAdmin(request.adminIdentity!.branchId, id);
  }

  @Delete(':id')
  cancel(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Query('fromOccurrence') fromOccurrence?: string,
  ) {
    const identity = request.adminIdentity!;
    return this.series.cancelAdmin(
      identity.branchId,
      identity.userId,
      id,
      Math.max(1, Number(fromOccurrence) || 1),
    );
  }
}
