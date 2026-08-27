import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { AuditActorType, BookingStatus } from '@prisma/client';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';

const EXPIRY_REASON =
  'Talep randevu saatinden önce yanıtlanamadığı için süresi doldu.';

@Injectable()
export class PendingBookingExpiryService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PendingBookingExpiryService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: OperationsAuditService,
  ) {}

  onModuleInit() {
    void this.runSweep();
    this.timer = setInterval(() => void this.runSweep(), 60_000);
    this.timer.unref();
  }

  private async runSweep() {
    await this.expireStaleHolds();
    await this.expirePastPending();
  }

  /**
   * Süresi dolmuş beş dakikalık hold'ları serbest bırakır.
   *
   * Bu iş eskiden müsaitlik ve randevu panosu okuma uçlarında yapılıyordu;
   * okuma isteğinin yazma yapması hem yoğun saatte kilitlenmeye yol açıyor hem
   * de müsaitlik tarafındaki sürüm şubeye kapsanmadığı için çok şubeli kurulumda
   * bir şubenin okuması diğerinin verisini güncelliyordu. Artık durum geçişi
   * yalnız burada yapılır; okuma uçları süresi dolmuş hold'ları sorguda eler.
   *
   * Hold'lar müşteriye randevu olarak görünmediği için denetim veya realtime
   * olayı üretilmez.
   */
  async expireStaleHolds(now = new Date()) {
    try {
      const result = await this.prisma.booking.updateMany({
        where: {
          status: BookingStatus.HOLD,
          holdExpiresAt: { lte: now },
        },
        data: { status: BookingStatus.EXPIRED },
      });
      if (result.count) {
        this.logger.log(
          `${result.count} süresi dolmuş hold serbest bırakıldı.`,
        );
      }
      return result.count;
    } catch (error) {
      this.logger.error(
        'Süresi dolmuş hold kayıtları serbest bırakılamadı.',
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    }
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async expirePastPending(now = new Date()) {
    if (this.running) return 0;
    this.running = true;
    let expiredCount = 0;

    try {
      while (true) {
        const candidates = await this.prisma.booking.findMany({
          where: {
            status: BookingStatus.PENDING_APPROVAL,
            startAt: { lte: now },
          },
          select: {
            id: true,
            branchId: true,
          },
          orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
          take: 100,
        });

        if (!candidates.length) break;

        for (const candidate of candidates) {
          const changed = await this.prisma.$transaction(
            async (transaction) => {
              const result = await transaction.booking.updateMany({
                where: {
                  id: candidate.id,
                  status: BookingStatus.PENDING_APPROVAL,
                  startAt: { lte: now },
                },
                data: {
                  status: BookingStatus.EXPIRED,
                  rejectionReason: EXPIRY_REASON,
                  revision: { increment: 1 },
                },
              });
              if (result.count !== 1) return false;

              await this.audit.write(transaction, {
                branchId: candidate.branchId,
                bookingId: candidate.id,
                entityType: 'BOOKING',
                entityId: candidate.id,
                action: 'BOOKING_EXPIRED',
                actorType: AuditActorType.SYSTEM,
                beforeData: { status: BookingStatus.PENDING_APPROVAL },
                afterData: {
                  status: BookingStatus.EXPIRED,
                  rejectionReason: EXPIRY_REASON,
                },
                reason: EXPIRY_REASON,
              });
              await transaction.adminRealtimeEvent.create({
                data: {
                  branchId: candidate.branchId,
                  resourceType: 'BOOKING',
                  resourceId: candidate.id,
                  action: 'BOOKING_EXPIRED',
                },
              });
              return true;
            },
          );

          if (changed) expiredCount += 1;
        }
      }
    } catch (error) {
      this.logger.error(
        'Geçmiş onay talepleri otomatik sonuçlandırılamadı.',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }

    if (expiredCount) {
      this.logger.log(`${expiredCount} geçmiş randevu talebinin süresi doldu.`);
    }
    return expiredCount;
  }
}
