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
import { AccessWaitlistOfferDto } from './dto/access-waitlist-offer.dto';
import { CreateWaitlistSuggestionOfferDto } from './dto/create-waitlist-suggestion-offer.dto';
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

  @Post('offers/access')
  @HttpCode(200)
  async accessOffer(
    @Body() dto: AccessWaitlistOfferDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.waitlist.accessOffer(dto.token);
    response.setHeader(
      'Set-Cookie',
      this.waitlist.offerSessionCookie(dto.token, result.expiresAt),
    );
    return result.offer;
  }

  @Get('offers/current')
  currentOffer(@Req() request: Request) {
    return this.waitlist.currentOffer(
      this.waitlist.readOfferCookie(request.header('cookie')),
    );
  }

  @Post('offers/current/accept')
  @HttpCode(200)
  acceptCurrentOffer(@Req() request: Request) {
    return this.waitlist.acceptCurrentOffer(
      this.waitlist.readOfferCookie(request.header('cookie')),
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

  @Get('suggestions')
  suggestions(@Req() request: AdminRequest) {
    return this.waitlist.listAdminSuggestions(request.adminIdentity!.branchId);
  }

  @Post('suggestions/:id/offers')
  createSuggestionOffer(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: CreateWaitlistSuggestionOfferDto,
  ) {
    return this.waitlist.createSuggestionOffer(
      request.adminIdentity!,
      id,
      dto.entryId,
    );
  }

  @Delete(':id')
  @HttpCode(200)
  cancel(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.waitlist.cancelAdmin(request.adminIdentity!, id, dto.reason);
  }
}
