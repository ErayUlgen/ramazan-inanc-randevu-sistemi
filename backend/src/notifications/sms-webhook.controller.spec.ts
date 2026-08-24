import { UnauthorizedException } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SmsWebhookController } from './sms-webhook.controller';

describe('SmsWebhookController', () => {
  const secret = 'sprint-06-webhook-test-secret';
  const originalSecret = process.env.SMS_WEBHOOK_SECRET;

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.SMS_WEBHOOK_SECRET;
    else process.env.SMS_WEBHOOK_SECRET = originalSecret;
  });

  function signed(rawBody: Buffer) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    return {
      timestamp,
      signature: createHmac('sha256', secret)
        .update(`${timestamp}.`)
        .update(rawBody)
        .digest('hex'),
    };
  }

  it('accepts a valid delivery report and persists delivered state', async () => {
    process.env.SMS_WEBHOOK_SECRET = secret;
    type UpdateInput = {
      where: { id: string };
      data: { status: NotificationStatus; providerStatus: string };
    };
    const update = jest.fn(
      (input: UpdateInput): Promise<Record<string, never>> => {
        expect(input.where.id).toBe('notification-1');
        expect(input.data.status).toBe(NotificationStatus.DELIVERED);
        expect(input.data.providerStatus).toBe('delivered');
        return Promise.resolve({});
      },
    );
    const prisma = {
      bookingNotification: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'notification-1',
          status: NotificationStatus.SENT,
        }),
        update,
      },
    };
    const controller = new SmsWebhookController(
      prisma as unknown as PrismaService,
    );
    const rawBody = Buffer.from(
      JSON.stringify({ messageId: 'provider-1', status: 'delivered' }),
    );
    const headers = signed(rawBody);

    const result = await controller.receive(
      { rawBody } as never,
      { messageId: 'provider-1', status: 'delivered' },
      headers.signature,
      headers.timestamp,
    );

    expect(result).toEqual({ accepted: true, matched: true, changed: true });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('rejects a tampered webhook before reading notification data', async () => {
    process.env.SMS_WEBHOOK_SECRET = secret;
    const prisma = {
      bookingNotification: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    const controller = new SmsWebhookController(
      prisma as unknown as PrismaService,
    );

    await expect(
      controller.receive(
        { rawBody: Buffer.from('{}') } as never,
        { messageId: 'provider-1', status: 'sent' },
        'invalid-signature',
        String(Math.floor(Date.now() / 1000)),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.bookingNotification.findFirst).not.toHaveBeenCalled();
  });
});
