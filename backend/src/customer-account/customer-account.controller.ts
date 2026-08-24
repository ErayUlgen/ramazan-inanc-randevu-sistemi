import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CustomerCancelBookingDto } from '../booking-changes/dto/customer-cancel-booking.dto';
import { CreateBookingChangeRequestDto } from '../booking-changes/dto/create-booking-change-request.dto';
import { GetBookingChangeAvailabilityDto } from '../booking-access/dto/get-booking-change-availability.dto';
import { CustomerAccountService } from './customer-account.service';
import { CustomerAuthService } from './customer-auth.service';
import {
  CustomerSessionGuard,
  type CustomerRequest,
} from './customer-session.guard';
import { CustomerSessionService } from './customer-session.service';
import { ListCustomerBookingsDto } from './dto/list-customer-bookings.dto';
import { RequestCustomerCodeDto } from './dto/request-customer-code.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { VerifyCustomerCodeDto } from './dto/verify-customer-code.dto';

@Controller('customer-account')
export class CustomerAccountController {
  constructor(
    private readonly auth: CustomerAuthService,
    private readonly sessions: CustomerSessionService,
    private readonly account: CustomerAccountService,
  ) {}

  @Post('auth/request-code')
  @HttpCode(200)
  requestCode(@Body() dto: RequestCustomerCodeDto, @Req() request: Request) {
    return this.auth.requestAccountCode(dto.phone, request.ip ?? 'unknown');
  }

  @Post('auth/verify-code')
  @HttpCode(200)
  async verifyCode(
    @Body() dto: VerifyCustomerCodeDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const customerId = await this.auth.verifyAccountCode(dto);
    const session = await this.sessions.create(customerId, {
      ip: request.ip,
      userAgent: request.header('user-agent'),
    });
    response.setHeader(
      'Set-Cookie',
      this.sessions.sessionCookie(session.token),
    );
    return {
      authenticated: true,
      expiresAt: session.expiresAt,
      customer: session.identity.customer,
    };
  }

  @Get('session')
  async session(@Req() request: Request) {
    try {
      const identity = await this.sessions.verify(
        this.sessions.readCookie(request.header('cookie')),
      );
      return {
        authenticated: true as const,
        expiresAt: identity.expiresAt,
        customer: identity.customer,
      };
    } catch {
      return { authenticated: false as const };
    }
  }

  @Delete('session')
  @HttpCode(200)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.sessions.revoke(
      this.sessions.readCookie(request.header('cookie')),
    );
    response.setHeader('Set-Cookie', this.sessions.clearCookie());
    return { authenticated: false };
  }

  @Get('profile')
  @UseGuards(CustomerSessionGuard)
  profile(@Req() request: CustomerRequest) {
    return this.account.profile(request.customerIdentity!.customerId);
  }

  @Patch('profile')
  @UseGuards(CustomerSessionGuard)
  updateProfile(
    @Req() request: CustomerRequest,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.account.updateProfile(
      request.customerIdentity!.customerId,
      dto,
    );
  }

  @Get('bookings')
  @UseGuards(CustomerSessionGuard)
  bookings(
    @Req() request: CustomerRequest,
    @Query() query: ListCustomerBookingsDto,
  ) {
    return this.account.listBookings(
      request.customerIdentity!.customerId,
      query,
    );
  }

  @Get('bookings/:publicCode')
  @UseGuards(CustomerSessionGuard)
  booking(
    @Req() request: CustomerRequest,
    @Param('publicCode') publicCode: string,
  ) {
    return this.account.booking(
      request.customerIdentity!.customerId,
      publicCode,
    );
  }

  @Get('bookings/:publicCode/rebook')
  @UseGuards(CustomerSessionGuard)
  rebook(
    @Req() request: CustomerRequest,
    @Param('publicCode') publicCode: string,
  ) {
    return this.account.rebookSuggestion(
      request.customerIdentity!.customerId,
      publicCode,
    );
  }

  @Get('bookings/:publicCode/availability')
  @UseGuards(CustomerSessionGuard)
  availability(
    @Req() request: CustomerRequest,
    @Param('publicCode') publicCode: string,
    @Query() query: GetBookingChangeAvailabilityDto,
  ) {
    return this.account.availability(
      request.customerIdentity!.customerId,
      publicCode,
      query,
    );
  }

  @Post('bookings/:publicCode/change-requests')
  @UseGuards(CustomerSessionGuard)
  changeRequest(
    @Req() request: CustomerRequest,
    @Param('publicCode') publicCode: string,
    @Body() dto: CreateBookingChangeRequestDto,
  ) {
    return this.account.createChangeRequest(
      request.customerIdentity!.customerId,
      publicCode,
      dto,
    );
  }

  @Post('bookings/:publicCode/cancel')
  @UseGuards(CustomerSessionGuard)
  @HttpCode(200)
  cancel(
    @Req() request: CustomerRequest,
    @Param('publicCode') publicCode: string,
    @Body() dto: CustomerCancelBookingDto,
  ) {
    return this.account.cancel(
      request.customerIdentity!.customerId,
      publicCode,
      dto,
    );
  }

  @Get('bookings/:publicCode/calendar.ics')
  @UseGuards(CustomerSessionGuard)
  async calendar(
    @Req() request: CustomerRequest,
    @Param('publicCode') publicCode: string,
    @Res() response: Response,
  ) {
    const file = await this.account.calendar(
      request.customerIdentity!.customerId,
      publicCode,
    );
    response.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    response.send(file.content);
  }
}
