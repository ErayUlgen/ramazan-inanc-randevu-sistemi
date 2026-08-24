import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { BusinessHoursService } from '../business-hours/business-hours.service';
import {
  branchDayBounds,
  minuteOfDay,
  toBranchDateTime,
  todayInBranch,
} from '../common/branch-time';
import { BookingPolicyService } from '../booking-policy/booking-policy.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  EffectiveProfessionalSelection,
  ProfessionalServiceResolver,
} from '../scheduling/professional-service-resolver.service';
import { AvailabilityEngine } from './availability.engine';
import { GetAdminAvailabilityDto } from './dto/get-admin-availability.dto';
import { GetAvailabilityDto } from './dto/get-availability.dto';
import { ProfessionalAvailabilityService } from './professional-availability.service';

const BLOCKING_STATUSES: BookingStatus[] = [
  BookingStatus.HOLD,
  BookingStatus.PENDING_APPROVAL,
  BookingStatus.CONFIRMED,
];

/** Yönetici takvimi her zaman on beş dakikalık ritmi kullanır. */
const ADMIN_SLOT_STEP_MINUTES = 15;

/** Public ızgara adımının inebileceği en küçük değer. */
const MIN_PUBLIC_SLOT_STEP_MINUTES = 5;

/**
 * Public müsaitlik ızgarasının adımını belirler.
 *
 * Politikadaki değer sıfırsa (varsayılan) adım hizmetin kendi süresine eşitlenir:
 * otuz dakikalık bir hizmet 10.00, 10.30, 11.00 diye ilerler. Bu, sabit altmış
 * dakikalık ızgaranın gizlediği yarım saatlik başlangıçları görünür kılar —
 * otuz dakikalık hizmette 11.00–21.00 arasında satılabilir slot sayısını
 * on birden yirmi ikiye çıkarır.
 *
 * Salon daha seyrek bir ızgara isterse politikaya pozitif bir değer yazılır
 * (ör. eski davranış için 60).
 */
function resolvePublicSlotStep(
  configuredMinutes: number,
  totalDurationMinutes: number,
): number {
  if (configuredMinutes > 0) return configuredMinutes;
  return Math.max(MIN_PUBLIC_SLOT_STEP_MINUTES, totalDurationMinutes);
}

/**
 * Süresi dolmuş HOLD kayıtları slotu bloke etmemelidir. Bunu okuma ucunda
 * durum güncelleyerek değil, sorguda eleyerek yapıyoruz; gerçek durum geçişini
 * PendingBookingExpiryService zamanlayıcısı üstlenir.
 */
const excludeExpiredHolds = (now: Date) => ({
  NOT: { status: BookingStatus.HOLD, holdExpiresAt: { lte: now } },
});

type AvailabilityMode = 'public' | 'admin';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: AvailabilityEngine,
    private readonly hours: BusinessHoursService,
    private readonly policies: BookingPolicyService,
    private readonly professionalAvailability: ProfessionalAvailabilityService,
    private readonly serviceResolver: ProfessionalServiceResolver,
  ) {}

  getForBranch(branchSlug: string, query: GetAvailabilityDto) {
    return this.get(branchSlug, query, 'public');
  }

  getForAdmin(query: GetAdminAvailabilityDto) {
    return this.get(query.branchSlug, query, 'admin');
  }

  getForBookingChange(query: GetAdminAvailabilityDto) {
    return this.get(query.branchSlug, query, 'admin');
  }

  private async get(
    branchSlug: string,
    query: GetAvailabilityDto & { excludeBookingId?: string },
    mode: AvailabilityMode,
  ) {
    const branch = await this.prisma.branch.findUnique({
      where: { slug: branchSlug },
    });
    if (!branch?.isActive) throw new NotFoundException('Salon bulunamadı.');
    const policy =
      mode === 'public' ? await this.policies.get(branch.id) : null;
    if (policy) this.assertPublicDate(query.date, policy.bookingWindowDays);

    const serviceIds = this.parseServiceIds(query.serviceIds);
    const services = await this.prisma.service.findMany({
      where: {
        branchId: branch.id,
        id: { in: serviceIds },
        isActive: true,
        ...(mode === 'public' ? { isOnlineBookable: true } : {}),
      },
      orderBy: { sortOrder: 'asc' },
    });
    if (services.length !== serviceIds.length) {
      throw new BadRequestException('Hizmet seçimi geçerli değil.');
    }

    let excludedBooking: {
      id: string;
      branchId: string;
      professionalId: string;
    } | null = null;
    if (query.excludeBookingId) {
      if (mode !== 'admin') {
        throw new BadRequestException('Randevu hariç tutma kullanılamaz.');
      }
      excludedBooking = await this.prisma.booking.findUnique({
        where: { id: query.excludeBookingId },
        select: { id: true, branchId: true, professionalId: true },
      });
      if (!excludedBooking || excludedBooking.branchId !== branch.id) {
        throw new BadRequestException('Düzenlenen randevu geçerli değil.');
      }
      if (
        query.professionalId &&
        query.professionalId !== excludedBooking.professionalId
      ) {
        // The target professional may change; no special opening is granted on
        // the target lane. The old booking is only excluded by its own id below.
      }
    }

    const professionals = await this.prisma.professional.findMany({
      where: {
        branchId: branch.id,
        isActive: true,
        ...(mode === 'public' ? { isOnlineBookable: true } : {}),
        ...(query.professionalId ? { id: query.professionalId } : {}),
      },
      include: { services: true },
      orderBy: { sortOrder: 'asc' },
    });
    const resolvedSelections = (
      await Promise.all(
        professionals.map(async (professional) => {
          try {
            return await this.serviceResolver.resolveSelection(
              branch.id,
              professional.id,
              serviceIds,
              mode,
            );
          } catch {
            return null;
          }
        }),
      )
    ).filter(
      (selection): selection is EffectiveProfessionalSelection =>
        selection !== null,
    );
    if (!resolvedSelections.length) {
      throw new BadRequestException(
        'Seçilen hizmetleri sunan uygun bir uzman bulunamadı.',
      );
    }

    const expiredHoldFilter = excludeExpiredHolds(new Date());

    const { start: dayStart, end: dayEnd } = branchDayBounds(query.date);
    const workingIntervals = await this.hours.resolveEffectiveIntervals(
      branch.id,
      query.date,
    );
    const professionalIds = resolvedSelections.map(
      (selection) => selection.professional.id,
    );
    const [
      occupancySegments,
      legacyBookings,
      blocks,
      changeOccupancySegments,
      legacyChangeRequests,
      offerOccupancySegments,
      legacyWaitlistOffers,
    ] = await Promise.all([
      this.prisma.bookingOccupancySegment.findMany({
        where: {
          professionalId: { in: professionalIds },
          booking: {
            status: { in: BLOCKING_STATUSES },
            ...expiredHoldFilter,
            id: query.excludeBookingId
              ? { not: query.excludeBookingId }
              : undefined,
          },
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
        },
        select: { professionalId: true, startAt: true, endAt: true },
      }),
      this.prisma.booking.findMany({
        where: {
          professionalId: { in: professionalIds },
          status: { in: BLOCKING_STATUSES },
          ...expiredHoldFilter,
          id: query.excludeBookingId
            ? { not: query.excludeBookingId }
            : undefined,
          occupancySegments: { none: {} },
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
        },
        select: { professionalId: true, startAt: true, endAt: true },
      }),
      this.prisma.scheduleBlock.findMany({
        where: {
          branchId: branch.id,
          cancelledAt: null,
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
          OR: [
            { professionalId: { in: professionalIds } },
            { professionalId: null },
          ],
        },
        select: { professionalId: true, startAt: true, endAt: true },
      }),
      this.prisma.bookingChangeOccupancySegment.findMany({
        where: {
          professionalId: { in: professionalIds },
          changeRequest: {
            status: 'PENDING',
            expiresAt: { gt: new Date() },
          },
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
        },
        select: { professionalId: true, startAt: true, endAt: true },
      }),
      this.prisma.bookingChangeRequest.findMany({
        where: {
          requestedProfessionalId: { in: professionalIds },
          status: 'PENDING',
          expiresAt: { gt: new Date() },
          occupancySegments: { none: {} },
          requestedStartAt: { lt: dayEnd },
          requestedEndAt: { gt: dayStart },
        },
        select: {
          requestedProfessionalId: true,
          requestedStartAt: true,
          requestedEndAt: true,
        },
      }),
      this.prisma.waitlistOfferOccupancySegment.findMany({
        where: {
          professionalId: { in: professionalIds },
          waitlistOffer: {
            status: 'PENDING',
            expiresAt: { gt: new Date() },
          },
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
        },
        select: { professionalId: true, startAt: true, endAt: true },
      }),
      this.prisma.waitlistOffer.findMany({
        where: {
          professionalId: { in: professionalIds },
          status: 'PENDING',
          expiresAt: { gt: new Date() },
          occupancySegments: { none: {} },
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
        },
        select: { professionalId: true, startAt: true, endAt: true },
      }),
    ]);

    const salonDurationMinutes = services.reduce(
      (sum, service) => sum + service.durationMinutes,
      0,
    );
    const salonPriceKurus = services.reduce(
      (sum, service) => sum + service.priceKurus,
      0,
    );
    const slots = new Map<
      number,
      {
        professionalId: string;
        durationMinutes: number;
        priceKurus: number;
      }[]
    >();
    const now = new Date();
    const cutoffReached =
      mode === 'public' &&
      query.date === todayInBranch(now) &&
      policy?.sameDayBookingCutoffMinute != null &&
      minuteOfDay(now) >= policy.sameDayBookingCutoffMinute;
    const minimumAllowedAt =
      mode === 'public'
        ? new Date(
            now.getTime() + (policy?.minimumBookingNoticeMinutes ?? 0) * 60_000,
          )
        : now;
    const minimumStartMinute =
      query.date === todayInBranch(now) ? minuteOfDay(now) + 1 : 0;

    /*
     * Çalışma aralıkları uzmandan bağımsızdır.
     *
     * `ProfessionalAvailabilityService` bugün `professionalId` parametresini
     * kullanmıyor; kişiye özel haftalık program yok, herkes salonun saatlerini
     * paylaşıyor. Bu çağrı döngü içinde yapıldığında her uzman için ayrı bir
     * veritabanı gidiş-dönüşü doğuyordu (beş uzman = beş özdeş sorgu) ve maliyet
     * uzman sayısıyla doğrusal büyüyordu. Değer bir kez çözülüp paylaşılıyor.
     *
     * Kişiye özel program eklenirse burası uzman kimliğine göre önceden
     * doldurulmuş bir Map'e çevrilmelidir; döngü içine geri alınmamalıdır.
     */
    const professionalIntervals =
      await this.professionalAvailability.resolveEffectiveIntervals(
        branch.id,
        resolvedSelections[0].professional.id,
        query.date,
      );

    for (const selection of resolvedSelections) {
      const professional = selection.professional;
      const busyIntervals = [
        ...occupancySegments
          .filter((segment) => segment.professionalId === professional.id)
          .map((segment) => this.toBusyInterval(segment, dayStart)),
        ...legacyBookings
          .filter((booking) => booking.professionalId === professional.id)
          .map((booking) => this.toBusyInterval(booking, dayStart)),
        ...blocks
          .filter(
            (block) =>
              block.professionalId === null ||
              block.professionalId === professional.id,
          )
          .map((block) => this.toBusyInterval(block, dayStart)),
        ...changeOccupancySegments
          .filter((segment) => segment.professionalId === professional.id)
          .map((segment) => this.toBusyInterval(segment, dayStart)),
        ...legacyChangeRequests
          .filter(
            (request) => request.requestedProfessionalId === professional.id,
          )
          .map((request) =>
            this.toBusyInterval(
              {
                startAt: request.requestedStartAt,
                endAt: request.requestedEndAt,
              },
              dayStart,
            ),
          ),
        ...offerOccupancySegments
          .filter((segment) => segment.professionalId === professional.id)
          .map((segment) => this.toBusyInterval(segment, dayStart)),
        ...legacyWaitlistOffers
          .filter((offer) => offer.professionalId === professional.id)
          .map((offer) => this.toBusyInterval(offer, dayStart)),
      ];

      const occupancyPattern = this.serviceResolver.buildRelativeOccupancy(
        selection.services,
      );
      for (const startMinute of this.engine.buildCandidateStartsForPattern(
        professionalIntervals,
        selection.totalDurationMinutes,
        occupancyPattern,
        busyIntervals,
        mode === 'admin'
          ? ADMIN_SLOT_STEP_MINUTES
          : resolvePublicSlotStep(
              policy?.publicSlotGranularityMinutes ?? 0,
              selection.totalDurationMinutes,
            ),
        minimumStartMinute,
      )) {
        if (cutoffReached) continue;
        if (
          mode === 'public' &&
          toBranchDateTime(query.date, this.engine.toTimeLabel(startMinute)) <
            minimumAllowedAt
        ) {
          continue;
        }
        slots.set(startMinute, [
          ...(slots.get(startMinute) ?? []),
          {
            professionalId: professional.id,
            durationMinutes: selection.totalDurationMinutes,
            priceKurus: selection.totalPriceKurus,
          },
        ]);
      }
    }

    const exactSelection = query.professionalId
      ? resolvedSelections.find(
          (selection) => selection.professional.id === query.professionalId,
        )
      : null;
    const durationValues = resolvedSelections.map(
      (selection) => selection.totalDurationMinutes,
    );
    const priceValues = resolvedSelections.map(
      (selection) => selection.totalPriceKurus,
    );

    return {
      date: query.date,
      timezone: branch.timezone,
      isClosed: workingIntervals.length === 0,
      workingIntervals,
      totalDurationMinutes:
        exactSelection?.totalDurationMinutes ?? salonDurationMinutes,
      totalPriceKurus: exactSelection?.totalPriceKurus ?? salonPriceKurus,
      durationRange: {
        min: Math.min(...durationValues),
        max: Math.max(...durationValues),
      },
      priceRange: {
        min: Math.min(...priceValues),
        max: Math.max(...priceValues),
      },
      professionals: resolvedSelections.map(({ professional, services }) => ({
        id: professional.id,
        name: professional.name,
        title: professional.title,
        totalDurationMinutes: services.reduce(
          (sum, service) => sum + service.durationMinutes,
          0,
        ),
        totalPriceKurus: services.reduce(
          (sum, service) => sum + service.priceKurus,
          0,
        ),
      })),
      slots: [...slots.entries()]
        .sort(([a], [b]) => a - b)
        .map(([startMinute, professionalOptions]) => {
          const representative = professionalOptions[0];
          return {
            startTime: this.engine.toTimeLabel(startMinute),
            endTime: this.engine.toTimeLabel(
              startMinute + representative.durationMinutes,
            ),
            availableProfessionalIds: professionalOptions.map(
              (option) => option.professionalId,
            ),
            professionalOptions: professionalOptions.map((option) => ({
              ...option,
              endTime: this.engine.toTimeLabel(
                startMinute + option.durationMinutes,
              ),
            })),
          };
        }),
    };
  }

  private parseServiceIds(value: string) {
    const ids = [
      ...new Set(
        value
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];
    if (!ids.length) {
      throw new BadRequestException('En az bir hizmet seçilmelidir.');
    }
    return ids;
  }

  private toBusyInterval(item: { startAt: Date; endAt: Date }, dayStart: Date) {
    return {
      startMinute: Math.max(
        0,
        Math.round((item.startAt.getTime() - dayStart.getTime()) / 60_000),
      ),
      endMinute: Math.min(
        1440,
        Math.round((item.endAt.getTime() - dayStart.getTime()) / 60_000),
      ),
    };
  }

  private assertPublicDate(date: string, bookingWindowDays: number) {
    const today = todayInBranch();
    if (date < today) {
      throw new BadRequestException('Geçmiş bir tarih için randevu alınamaz.');
    }
    if (date > this.shiftDate(today, bookingWindowDays)) {
      throw new BadRequestException(
        'Seçilen tarih online rezervasyon aralığının dışında.',
      );
    }
  }

  private shiftDate(date: string, days: number) {
    const value = new Date(`${date}T12:00:00+03:00`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  }
}
