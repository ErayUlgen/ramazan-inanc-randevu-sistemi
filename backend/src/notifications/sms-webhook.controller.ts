import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

type DeliveryPayload = {
  messageId?: string;
  status?: 'delivered' | 'failed' | 'sent';
  occurredAt?: string;
  errorCode?: string;
};

@Controller('notifications/sms')
export class SmsWebhookController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('webhook')
  async receive(
    @Req() request: RawBodyRequest<Request>,
    @Body() payload: DeliveryPayload,
    @Headers('x-sms-signature') signature?: string,
    @Headers('x-sms-timestamp') timestamp?: string,
  ) {
    this.verify(request.rawBody, signature, timestamp);
    if (!payload.messageId || !payload.status) {
      throw new BadRequestException('Webhook içeriği geçerli değil.');
    }
    const notification = await this.prisma.bookingNotification.findFirst({
      where: { providerMessageId: payload.messageId },
      select: { id: true, status: true },
    });
    if (!notification) return { accepted: true, matched: false };
    if (
      (payload.status === 'delivered' &&
        notification.status === NotificationStatus.DELIVERED) ||
      (payload.status === 'failed' &&
        notification.status === NotificationStatus.FAILED)
    ) {
      return { accepted: true, matched: true, changed: false };
    }
    const occurredAt = payload.occurredAt
      ? new Date(payload.occurredAt)
      : new Date();
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('Webhook tarihi geçerli değil.');
    }
    await this.prisma.bookingNotification.update({
      where: { id: notification.id },
      data:
        payload.status === 'delivered'
          ? {
              status: NotificationStatus.DELIVERED,
              providerStatus: payload.status,
              deliveredAt: occurredAt,
            }
          : payload.status === 'failed'
            ? {
                status: NotificationStatus.FAILED,
                providerStatus: payload.status,
                failedAt: occurredAt,
                lastErrorCode: payload.errorCode ?? 'PROVIDER_DELIVERY_FAILED',
              }
            : { providerStatus: payload.status },
    });
    return { accepted: true, matched: true, changed: true };
  }

  private verify(
    rawBody: Buffer | undefined,
    signature: string | undefined,
    timestamp: string | undefined,
  ) {
    const secret = process.env.SMS_WEBHOOK_SECRET;
    if (!secret || !rawBody || !signature || !timestamp) {
      throw new UnauthorizedException('Webhook imzası eksik.');
    }
    const timestampNumber = Number(timestamp);
    if (
      !Number.isFinite(timestampNumber) ||
      Math.abs(Date.now() - timestampNumber * 1000) > 5 * 60_000
    ) {
      throw new UnauthorizedException('Webhook zaman damgası geçersiz.');
    }
    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.`)
      .update(rawBody)
      .digest('hex');
    const actualBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Webhook imzası geçersiz.');
    }
  }
}
