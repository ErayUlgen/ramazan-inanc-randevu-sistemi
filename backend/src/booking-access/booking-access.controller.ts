import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  BookingAccessGuard,
  type BookingAccessRequest,
} from './booking-access.guard';
import { BookingAccessService } from './booking-access.service';
import { BookingAccessSessionService } from './booking-access-session.service';
import { BookingChangeRequestsService } from '../booking-changes/booking-change-requests.service';
import { CreateBookingChangeRequestDto } from '../booking-changes/dto/create-booking-change-request.dto';
import { CustomerCancelBookingDto } from '../booking-changes/dto/customer-cancel-booking.dto';
import { GetBookingChangeAvailabilityDto } from './dto/get-booking-change-availability.dto';
import { RequestBookingAccessCodeDto } from './dto/request-booking-access-code.dto';
import { VerifyBookingAccessCodeDto } from './dto/verify-booking-access-code.dto';

@Controller('booking-access')
export class BookingAccessController {
  constructor(
    private readonly access: BookingAccessService,
    private readonly sessions: BookingAccessSessionService,
    private readonly changes: BookingChangeRequestsService,
  ) {}

  @Post('request-code')
  @HttpCode(200)
  requestCode(
    @Body() dto: RequestBookingAccessCodeDto,
    @Req() request: Request,
  ) {
    return this.access.requestCode(dto, request.ip ?? 'unknown');
  }

  @Post('verify-code')
  @HttpCode(200)
  async verifyCode(
    @Body() dto: VerifyBookingAccessCodeDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.access.verifyCode(dto);
    response.setHeader('Set-Cookie', this.sessions.sessionCookie(result.token));
    return { authenticated: true, expiresAt: result.expiresAt };
  }

  @Get('current')
  @UseGuards(BookingAccessGuard)
  current(@Req() request: BookingAccessRequest) {
    return this.access.current(request.bookingAccess!.bookingId);
  }

  @Get('availability')
  @UseGuards(BookingAccessGuard)
  availability(
    @Req() request: BookingAccessRequest,
    @Query() query: GetBookingChangeAvailabilityDto,
  ) {
    return this.changes.customerAvailability(
      request.bookingAccess!.bookingId,
      query,
    );
  }

  @Post('change-requests')
  @UseGuards(BookingAccessGuard)
  createChangeRequest(
    @Req() request: BookingAccessRequest,
    @Body() dto: CreateBookingChangeRequestDto,
  ) {
    return this.changes.createForCustomer(
      request.bookingAccess!.bookingId,
      dto,
    );
  }

  @Post('cancel')
  @UseGuards(BookingAccessGuard)
  @HttpCode(200)
  cancel(
    @Req() request: BookingAccessRequest,
    @Body() dto: CustomerCancelBookingDto,
  ) {
    return this.changes.cancelForCustomer(
      request.bookingAccess!.bookingId,
      dto,
    );
  }

  @Get('calendar.ics')
  @UseGuards(BookingAccessGuard)
  async calendar(
    @Req() request: BookingAccessRequest,
    @Res() response: Response,
  ) {
    const file = await this.access.calendar(request.bookingAccess!.bookingId);
    response.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    response.send(file.content);
  }

  @Delete('session')
  @UseGuards(BookingAccessGuard)
  @HttpCode(200)
  remove(@Res({ passthrough: true }) response: Response) {
    response.setHeader('Set-Cookie', this.sessions.clearCookie());
    return { authenticated: false };
  }
}
