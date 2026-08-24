import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AdminRole, WaitlistEntryStatus } from '@prisma/client';
import type { Request, Response } from 'express';
import {
  AdminSessionGuard,
  type AdminRequest,
} from '../admin/admin-session.guard';
import { CancelBookingDto } from '../bookings/dto/cancel-booking.dto';
import { ManualWaitlistOfferDto } from './dto/manual-waitlist-offer.dto';
import { RequestWaitlistCodeDto } from './dto/request-waitlist-code.dto';
import { VerifyWaitlistCodeDto } from './dto/verify-waitlist-code.dto';
import { WaitlistService } from './waitlist.service';
import { AdminRoles } from '../admin/admin-authorization';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  @Post('request-code')
  @HttpCode(200)
  requestCode(@Body() dto: RequestWaitlistCodeDto, @Req() request: Request) {
    return this.waitlist.requestCode(dto, request.ip ?? 'unknown');
  }

  @Post('verify-code')
  @HttpCode(200)
  async verifyCode(
    @Body() dto: VerifyWaitlistCodeDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.waitlist.verifyCode(dto);
    response.setHeader('Set-Cookie', this.waitlist.sessionCookie(result.token));
    return { authenticated: true, entry: result.entry };
  }

  @Get('current')
  current(@Req() request: Request) {
    return this.waitlist.current(
      this.waitlist.readCookie(request.header('cookie')),
    );
  }

  @Post('offers/:id/accept')
  @HttpCode(200)
  accept(@Req() request: Request, @Param('id') id: string) {
    return this.waitlist.acceptOffer(
      this.waitlist.readCookie(request.header('cookie')),
      id,
    );
  }

  @Delete('current')
  @HttpCode(200)
  async cancel(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.waitlist.cancelCurrent(
      this.waitlist.readCookie(request.header('cookie')),
    );
    response.setHeader('Set-Cookie', this.waitlist.clearCookie());
    return result;
  }
}

@Controller('admin/waitlist')
@UseGuards(AdminSessionGuard)
@AdminRoles(AdminRole.RECEPTIONIST)
export class AdminWaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  @Get()
  list(
    @Req() request: AdminRequest,
    @Query('branchId') _branchId: string,
    @Query('status') status?: WaitlistEntryStatus,
  ) {
    return this.waitlist.listAdmin(request.adminIdentity!.branchId, status);
  }

  @Post(':id/offers')
  createOffer(@Param('id') id: string, @Body() dto: ManualWaitlistOfferDto) {
    return this.waitlist.createManualOffer(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  cancel(@Param('id') id: string, @Body() dto: CancelBookingDto) {
    return this.waitlist.cancelAdmin(id, dto.reason);
  }
}
