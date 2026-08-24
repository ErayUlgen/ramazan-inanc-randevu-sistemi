import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AdminSessionGuard,
  type AdminRequest,
} from '../admin/admin-session.guard';
import { BookingPolicyService } from './booking-policy.service';
import { UpdateBookingPolicyDto } from './dto/update-booking-policy.dto';

@Controller()
export class BookingPolicyController {
  constructor(private readonly policies: BookingPolicyService) {}

  @Get('booking-policy/:branchSlug')
  publicPolicy(@Param('branchSlug') branchSlug: string) {
    return this.policies.getPublicBySlug(branchSlug);
  }

  @Get('admin/branches/:branchId/booking-policy')
  @UseGuards(AdminSessionGuard)
  adminPolicy(@Req() request: AdminRequest) {
    return this.policies.get(request.adminIdentity!.branchId);
  }

  @Put('admin/branches/:branchId/booking-policy')
  @UseGuards(AdminSessionGuard)
  update(@Req() request: AdminRequest, @Body() dto: UpdateBookingPolicyDto) {
    return this.policies.update(request.adminIdentity!.branchId, dto);
  }
}
