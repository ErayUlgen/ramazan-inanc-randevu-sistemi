import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { SmsGatewayService } from './notifications/sms-gateway.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValue([{ value: 1 }]),
            bookingNotification: {
              count: jest.fn().mockResolvedValue(0),
            },
          },
        },
        {
          provide: SmsGatewayService,
          useValue: {
            isConfigured: jest.fn().mockReturnValue(true),
            isDevelopment: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('servis durumunu döndürür', () => {
      expect(appController.getHealth().status).toBe('ok');
    });
  });

  describe('liveness', () => {
    it('servis durumunu bağımlılıklardan bağımsız döndürür', () => {
      expect(appController.getLiveness().status).toBe('ok');
    });
  });

  describe('ready', () => {
    it('veritabanı hazır olduğunda readiness döndürür', async () => {
      await expect(appController.getReadiness()).resolves.toMatchObject({
        status: 'ready',
        database: 'connected',
        sms: 'development',
        notificationQueue: {
          pending: 0,
          retryScheduled: 0,
          failed: 0,
          staleProcessing: 0,
        },
      });
    });
  });
});
