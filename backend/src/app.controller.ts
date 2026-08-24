import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { SmsGatewayService } from './notifications/sms-gateway.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    private readonly smsGateway: SmsGatewayService,
  ) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('health/live')
  getLiveness() {
    return this.appService.getHealth();
  }

  @Get('ready')
  async getReadiness() {
    await this.prisma.$queryRaw`SELECT 1`;
    const staleProcessingBefore = new Date(Date.now() - 10 * 60_000);
    const [pending, retryScheduled, failed, staleProcessing] =
      await Promise.all([
        this.prisma.bookingNotification.count({
          where: { status: 'PENDING' },
        }),
        this.prisma.bookingNotification.count({
          where: { status: 'RETRY_SCHEDULED' },
        }),
        this.prisma.bookingNotification.count({
          where: { status: 'FAILED' },
        }),
        this.prisma.bookingNotification.count({
          where: {
            status: 'PROCESSING',
            processingStartedAt: { lt: staleProcessingBefore },
          },
        }),
      ]);
    const smsConfigured = this.smsGateway.isConfigured();
    const production = process.env.NODE_ENV === 'production';
    return {
      status: !production || smsConfigured ? 'ready' : 'degraded',
      database: 'connected',
      sms: this.smsGateway.isDevelopment()
        ? 'development'
        : smsConfigured
          ? 'configured'
          : 'not_configured',
      notificationQueue: {
        pending,
        retryScheduled,
        failed,
        staleProcessing,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
