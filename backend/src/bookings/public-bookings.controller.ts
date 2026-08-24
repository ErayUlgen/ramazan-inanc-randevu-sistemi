import { Body, Controller, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CustomerAuthService } from '../customer-account/customer-auth.service';
import { CustomerSessionService } from '../customer-account/customer-session.service';
import { RequestBookingCodeDto } from '../customer-account/dto/request-booking-code.dto';
import { BookingsService } from './bookings.service';
import { ConfirmHoldDto } from './dto/confirm-hold.dto';
import { CreateHoldDto } from './dto/create-hold.dto';

@Controller('public/bookings')
export class PublicBookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly auth: CustomerAuthService,
    private readonly sessions: CustomerSessionService,
  ) {}

  @Post('holds')
  createHold(@Body() dto: CreateHoldDto) {
    return this.bookings.createHold(dto);
  }

  @Post('holds/:id/request-code')
  requestCode(
    @Param('id') id: string,
    @Body() dto: RequestBookingCodeDto,
    @Req() request: Request,
  ) {
    return this.auth.requestBookingCode(
      id,
      dto.phone,
      dto.holdToken,
      request.ip ?? 'unknown',
    );
  }

  @Post('holds/:id/confirm')
  async confirmHold(
    @Param('id') id: string,
    @Body() dto: ConfirmHoldDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = this.sessions.readCookie(request.header('cookie'));
    const identity = await this.sessions.verify(token).catch(() => null);
    const result = await this.bookings.confirmHold(
      id,
      dto,
      identity?.customerId,
      {
        ip: request.ip,
        userAgent: request.header('user-agent'),
      },
    );
    if (result.customerSession) {
      response.setHeader(
        'Set-Cookie',
        this.sessions.sessionCookie(result.customerSession.token),
      );
    }
    const { customerId, customerSession, ...publicResult } = result;
    void customerId;
    void customerSession;
    return publicResult;
  }
}
