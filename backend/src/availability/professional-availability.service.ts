import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BusinessHoursService } from '../business-hours/business-hours.service';

type ScheduleReader = Pick<
  Prisma.TransactionClient,
  'branchDateOverride' | 'branchWeeklyInterval'
>;

/**
 * Slot, doğrulama ve rapor tüketicileri için ortak çalışma aralığı adaptörü.
 *
 * Bütün uzmanlar salonun haftalık saatlerini ve özel günlerini kullanır.
 * `professionalId`, mevcut tüketici sözleşmelerini güvenle korumak için kabul
 * edilir; kişiye özel haftalık program uygulanmaz.
 */
@Injectable()
export class ProfessionalAvailabilityService {
  constructor(private readonly hours: BusinessHoursService) {}

  resolveEffectiveIntervals(
    branchId: string,
    _professionalId: string,
    date: string,
    reader?: ScheduleReader,
  ) {
    return reader
      ? this.hours.resolveEffectiveIntervals(branchId, date, reader)
      : this.hours.resolveEffectiveIntervals(branchId, date);
  }
}
