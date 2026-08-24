import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationEventType, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBookingPolicyDto } from './dto/update-booking-policy.dto';

@Injectable()
export class BookingPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async get(branchId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { bookingPolicy: true },
    });
    if (!branch?.isActive) throw new NotFoundException('Salon bulunamadı.');
    if (branch.bookingPolicy) return this.toDto(branch.bookingPolicy);
    const created = await this.prisma.branchBookingPolicy.create({
      data: {
        branchId,
        earlyArrivalMinutes: branch.arrivalLeadMinutes,
        reminderLeadMinutes: branch.reminderLeadMinutes,
      },
    });
    return this.toDto(created);
  }

  async getBySlug(branchSlug: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { slug: branchSlug },
      select: { id: true },
    });
    if (!branch) throw new NotFoundException('Salon bulunamadı.');
    return this.get(branch.id);
  }

  async getPublicBySlug(branchSlug: string) {
    const policy = await this.getBySlug(branchSlug);
    return {
      bookingWindowDays: policy.bookingWindowDays,
      minimumBookingNoticeMinutes: policy.minimumBookingNoticeMinutes,
      sameDayBookingCutoffMinute: policy.sameDayBookingCutoffMinute,
      waitlistEnabled: policy.waitlistEnabled,
      salonPhone: policy.salonPhone,
      whatsappPhone: policy.whatsappPhone,
      mapsUrl: policy.mapsUrl,
    };
  }

  async update(branchId: string, dto: UpdateBookingPolicyDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });
    if (!branch) throw new NotFoundException('Salon bulunamadı.');
    return this.prisma.$transaction(async (transaction) => {
      const policy = await transaction.branchBookingPolicy.upsert({
        where: { branchId },
        update: this.input(dto),
        create: { branchId, ...this.input(dto) },
      });
      await transaction.branch.update({
        where: { id: branchId },
        data: {
          arrivalLeadMinutes: dto.earlyArrivalMinutes,
          reminderLeadMinutes: dto.reminderLeadMinutes,
        },
      });
      await transaction.notificationRule.updateMany({
        where: {
          branchId,
          eventType: NotificationEventType.BOOKING_REMINDER,
        },
        data: { leadMinutes: dto.reminderLeadMinutes },
      });
      await transaction.operationalAuditEvent.create({
        data: {
          branchId,
          entityType: 'BOOKING_POLICY',
          entityId: policy.id,
          action: 'BOOKING_POLICY_UPDATED',
          actorType: 'ADMIN',
          afterData: this.toDto(policy),
        },
      });
      await transaction.adminRealtimeEvent.create({
        data: {
          branchId,
          resourceType: 'BOOKING_POLICY',
          resourceId: policy.id,
          action: 'UPDATED',
        },
      });
      return this.toDto(policy);
    });
  }

  private input(
    dto: UpdateBookingPolicyDto,
  ): Prisma.BranchBookingPolicyUncheckedCreateWithoutBranchInput {
    return {
      bookingWindowDays: dto.bookingWindowDays,
      publicSlotGranularityMinutes: dto.publicSlotGranularityMinutes,
      minimumBookingNoticeMinutes: dto.minimumBookingNoticeMinutes,
      sameDayBookingCutoffMinute: dto.sameDayBookingCutoffMinute ?? null,
      cancellationLeadMinutes: dto.cancellationLeadMinutes,
      rescheduleLeadMinutes: dto.rescheduleLeadMinutes,
      changeRequestTtlMinutes: dto.changeRequestTtlMinutes,
      waitlistOfferTtlMinutes: dto.waitlistOfferTtlMinutes,
      maxActiveChangeRequests: dto.maxActiveChangeRequests,
      otpResendSeconds: dto.otpResendSeconds,
      otpMaxAttempts: dto.otpMaxAttempts,
      earlyArrivalMinutes: dto.earlyArrivalMinutes,
      reminderLeadMinutes: dto.reminderLeadMinutes,
      pendingWarningMinutes: dto.pendingWarningMinutes,
      allowLateCancellation: dto.allowLateCancellation,
      waitlistEnabled: dto.waitlistEnabled,
      automaticWaitlistOffers: dto.automaticWaitlistOffers,
      reviewRequestEnabled: dto.reviewRequestEnabled,
      reviewRequestDelayMinutes: dto.reviewRequestDelayMinutes,
      reviewRequestExpiryDays: dto.reviewRequestExpiryDays,
      salonPhone: dto.salonPhone?.trim() || null,
      whatsappPhone: dto.whatsappPhone?.trim() || null,
      mapsUrl: dto.mapsUrl?.trim() || null,
      googleReviewUrl: dto.googleReviewUrl?.trim() || null,
      customerPolicyText: dto.customerPolicyText?.trim() || null,
    };
  }

  private toDto(policy: {
    id: string;
    branchId: string;
    bookingWindowDays: number;
    publicSlotGranularityMinutes: number;
    minimumBookingNoticeMinutes: number;
    sameDayBookingCutoffMinute: number | null;
    cancellationLeadMinutes: number;
    rescheduleLeadMinutes: number;
    changeRequestTtlMinutes: number;
    waitlistOfferTtlMinutes: number;
    maxActiveChangeRequests: number;
    otpResendSeconds: number;
    otpMaxAttempts: number;
    earlyArrivalMinutes: number;
    reminderLeadMinutes: number;
    pendingWarningMinutes: number;
    allowLateCancellation: boolean;
    waitlistEnabled: boolean;
    automaticWaitlistOffers: boolean;
    reviewRequestEnabled: boolean;
    reviewRequestDelayMinutes: number;
    reviewRequestExpiryDays: number;
    salonPhone: string | null;
    whatsappPhone: string | null;
    mapsUrl: string | null;
    googleReviewUrl: string | null;
    customerPolicyText: string | null;
    updatedAt: Date;
    createdAt?: Date;
  }) {
    // `createdAt` bilinçli olarak dışarıda bırakılır. Yönetici ekranı GET
    // yanıtını olduğu gibi PUT gövdesine çevirdiği için, DTO'da tanımlı olmayan
    // her alan `forbidNonWhitelisted` doğrulamasına takılıp 400 üretir.
    const { createdAt: _createdAt, ...rest } = policy;
    return {
      ...rest,
      updatedAt: policy.updatedAt.toISOString(),
    };
  }
}
