import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminRole,
  AuditActorType,
  FormSubmissionStatus,
  FormTemplateStatus,
  Prisma,
} from '@prisma/client';
import { createHash } from 'crypto';
import type { AdminIdentity } from '../admin/admin-session.service';
import { OperationsAuditService } from '../operations-audit/operations-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFormTemplateDto,
  FormFieldDto,
  SetFormRequirementsDto,
  SubmitBookingFormDto,
  UpdateFormDraftDto,
} from './dto/form-template.dto';

const TEMPLATE_INCLUDE = {
  versions: { orderBy: { version: 'desc' as const } },
  requirements: {
    include: { service: { select: { id: true, name: true } } },
    orderBy: { sortOrder: 'asc' as const },
  },
} satisfies Prisma.FormTemplateInclude;

type FormDefinition = { fields: FormFieldDto[] };

@Injectable()
export class FormsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: OperationsAuditService,
  ) {}

  listTemplates(branchId: string) {
    return this.prisma.formTemplate.findMany({
      where: { branchId },
      include: TEMPLATE_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async template(branchId: string, id: string) {
    const template = await this.prisma.formTemplate.findFirst({
      where: { id, branchId },
      include: TEMPLATE_INCLUDE,
    });
    if (!template) throw new NotFoundException('Form şablonu bulunamadı.');
    return template;
  }

  async createTemplate(
    branchId: string,
    dto: CreateFormTemplateDto,
    identity: AdminIdentity,
  ) {
    this.assertOwnerOrReceptionist(identity);
    const definition = this.definition(dto.fields ?? []);
    return this.prisma.$transaction(async (transaction) => {
      const template = await transaction.formTemplate.create({
        data: {
          branchId,
          name: dto.name.trim(),
          description: clean(dto.description),
          versions: {
            create: {
              version: 1,
              title: dto.title.trim(),
              description: clean(dto.description),
              definition,
            },
          },
        },
        include: TEMPLATE_INCLUDE,
      });
      await this.audit.write(transaction, {
        branchId,
        entityType: 'FORM_TEMPLATE',
        entityId: template.id,
        action: 'FORM_TEMPLATE_CREATED',
        actorType: AuditActorType.ADMIN,
        adminUserId: identity.userId,
        actorLabel: identity.displayName,
        afterData: { name: template.name, version: 1 },
      });
      return template;
    });
  }

  async updateDraft(
    branchId: string,
    id: string,
    dto: UpdateFormDraftDto,
    identity: AdminIdentity,
  ) {
    this.assertOwnerOrReceptionist(identity);
    const existing = await this.template(branchId, id);
    if (existing.status === FormTemplateStatus.ARCHIVED) {
      throw new ConflictException('Arşivlenmiş form düzenlenemez.');
    }
    const latest = existing.versions[0];
    const definition = this.definition(dto.fields);
    return this.prisma.$transaction(async (transaction) => {
      let version: number;
      if (latest && !latest.publishedAt) {
        version = latest.version;
        await transaction.formTemplateVersion.update({
          where: { id: latest.id },
          data: {
            title: dto.title.trim(),
            description: clean(dto.description),
            definition,
          },
        });
      } else {
        version = (latest?.version ?? 0) + 1;
        await transaction.formTemplateVersion.create({
          data: {
            formTemplateId: id,
            version,
            title: dto.title.trim(),
            description: clean(dto.description),
            definition,
          },
        });
      }
      const template = await transaction.formTemplate.update({
        where: { id },
        data: {
          status: FormTemplateStatus.DRAFT,
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: clean(dto.description) }
            : {}),
        },
        include: TEMPLATE_INCLUDE,
      });
      await this.audit.write(transaction, {
        branchId,
        entityType: 'FORM_TEMPLATE',
        entityId: id,
        action: 'FORM_DRAFT_UPDATED',
        actorType: AuditActorType.ADMIN,
        adminUserId: identity.userId,
        actorLabel: identity.displayName,
        afterData: { version, fieldCount: dto.fields.length },
      });
      return template;
    });
  }

  async publish(branchId: string, id: string, identity: AdminIdentity) {
    this.assertOwnerOrReceptionist(identity);
    const existing = await this.template(branchId, id);
    const draft = existing.versions.find((version) => !version.publishedAt);
    if (!draft) {
      if (existing.status === FormTemplateStatus.PUBLISHED) return existing;
      throw new ConflictException('Yayınlanacak taslak sürüm bulunamadı.');
    }
    const fields = this.fields(draft.definition);
    if (!fields.length) {
      throw new BadRequestException('Boş form yayınlanamaz.');
    }
    return this.prisma.$transaction(async (transaction) => {
      await transaction.formTemplateVersion.update({
        where: { id: draft.id },
        data: { publishedAt: new Date() },
      });
      const template = await transaction.formTemplate.update({
        where: { id },
        data: { status: FormTemplateStatus.PUBLISHED },
        include: TEMPLATE_INCLUDE,
      });
      await this.audit.write(transaction, {
        branchId,
        entityType: 'FORM_TEMPLATE',
        entityId: id,
        action: 'FORM_VERSION_PUBLISHED',
        actorType: AuditActorType.ADMIN,
        adminUserId: identity.userId,
        actorLabel: identity.displayName,
        afterData: { version: draft.version },
      });
      return template;
    });
  }

  async archive(branchId: string, id: string, identity: AdminIdentity) {
    this.assertOwnerOrReceptionist(identity);
    await this.template(branchId, id);
    return this.prisma.formTemplate.update({
      where: { id },
      data: { status: FormTemplateStatus.ARCHIVED },
      include: TEMPLATE_INCLUDE,
    });
  }

  async setRequirements(
    branchId: string,
    id: string,
    dto: SetFormRequirementsDto,
    identity: AdminIdentity,
  ) {
    this.assertOwnerOrReceptionist(identity);
    await this.template(branchId, id);
    const uniqueIds = [
      ...new Set(dto.requirements.map((item) => item.serviceId)),
    ];
    const validServices = await this.prisma.service.count({
      where: { branchId, id: { in: uniqueIds } },
    });
    if (validServices !== uniqueIds.length) {
      throw new BadRequestException('Hizmetlerden biri bu salona ait değil.');
    }
    await this.prisma.$transaction(async (transaction) => {
      await transaction.serviceFormRequirement.deleteMany({
        where: { formTemplateId: id },
      });
      if (dto.requirements.length) {
        await transaction.serviceFormRequirement.createMany({
          data: dto.requirements.map((item) => ({
            formTemplateId: id,
            serviceId: item.serviceId,
            isRequired: item.isRequired,
            sortOrder: item.sortOrder ?? 0,
          })),
        });
      }
      await this.audit.write(transaction, {
        branchId,
        entityType: 'FORM_TEMPLATE',
        entityId: id,
        action: 'FORM_REQUIREMENTS_UPDATED',
        actorType: AuditActorType.ADMIN,
        adminUserId: identity.userId,
        actorLabel: identity.displayName,
        afterData: { serviceIds: uniqueIds },
      });
    });
    return this.template(branchId, id);
  }

  async assignRequiredForms(
    transaction: Prisma.TransactionClient,
    input: {
      branchId: string;
      bookingId: string;
      customerId?: string | null;
      serviceIds: string[];
    },
  ) {
    const requirements = await transaction.serviceFormRequirement.findMany({
      where: {
        serviceId: { in: input.serviceIds },
        formTemplate: {
          branchId: input.branchId,
          status: FormTemplateStatus.PUBLISHED,
        },
      },
      include: {
        formTemplate: {
          include: {
            versions: {
              where: { publishedAt: { not: null } },
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
    for (const requirement of requirements) {
      const version = requirement.formTemplate.versions[0];
      if (!version) continue;
      await transaction.bookingFormSubmission.upsert({
        where: {
          bookingId_formTemplateVersionId: {
            bookingId: input.bookingId,
            formTemplateVersionId: version.id,
          },
        },
        create: {
          branchId: input.branchId,
          bookingId: input.bookingId,
          customerId: input.customerId ?? null,
          formTemplateVersionId: version.id,
          isRequired: requirement.isRequired,
        },
        update: {
          customerId: input.customerId ?? undefined,
          isRequired: requirement.isRequired,
        },
      });
    }
  }

  async listForBooking(
    branchId: string,
    bookingId: string,
    identity: AdminIdentity,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        branchId,
        ...(identity.role === AdminRole.PROFESSIONAL
          ? { professionalId: identity.professionalId ?? '__none__' }
          : {}),
      },
      select: { id: true },
    });
    if (!booking) throw new NotFoundException('Randevu bulunamadı.');
    return this.submissions({ branchId, bookingId });
  }

  async listForCustomer(customerId: string, publicCode: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { publicCode, customerId },
      select: { id: true, branchId: true },
    });
    if (!booking) throw new NotFoundException('Randevu bulunamadı.');
    return this.submissions({
      branchId: booking.branchId,
      bookingId: booking.id,
      customerId,
    });
  }

  async submitForCustomer(
    customerId: string,
    publicCode: string,
    submissionId: string,
    dto: SubmitBookingFormDto,
    requestIp?: string,
  ) {
    const submission = await this.prisma.bookingFormSubmission.findFirst({
      where: {
        id: submissionId,
        customerId,
        booking: { publicCode, customerId },
      },
      include: { formTemplateVersion: true, booking: true },
    });
    if (!submission) throw new NotFoundException('Form bulunamadı.');
    if (submission.status !== FormSubmissionStatus.PENDING) {
      throw new ConflictException('Bu form daha önce gönderildi.');
    }
    const fields = this.fields(submission.formTemplateVersion.definition);
    const answers = this.validateAnswers(fields, dto.answers);
    const consents = fields
      .filter(
        (field) =>
          field.type === 'CHECKBOX' &&
          field.consentType &&
          field.documentKey &&
          field.documentVersion &&
          typeof answers[field.key] === 'boolean',
      )
      .map((field) => ({
        branchId: submission.branchId,
        customerId,
        type: field.consentType!,
        documentKey: field.documentKey!,
        documentVersion: field.documentVersion!,
        granted: Boolean(answers[field.key]),
        source: 'CUSTOMER_FORM',
        requestIpHash: requestIp ? this.hashIp(requestIp) : null,
      }));
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.bookingFormSubmission.update({
        where: { id: submission.id },
        data: {
          answers: answers,
          status: FormSubmissionStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      });
      if (consents.length) {
        await transaction.consentRecord.createMany({ data: consents });
      }
      await this.audit.write(transaction, {
        branchId: submission.branchId,
        bookingId: submission.bookingId,
        entityType: 'BOOKING_FORM_SUBMISSION',
        entityId: submission.id,
        action: 'FORM_SUBMITTED',
        actorType: AuditActorType.CUSTOMER,
        afterData: {
          formVersion: submission.formTemplateVersion.version,
          answeredFieldCount: Object.keys(answers).length,
          consentTypes: consents.map((item) => item.type),
        },
      });
      return {
        id: updated.id,
        status: updated.status,
        submittedAt: updated.submittedAt?.toISOString(),
      };
    });
  }

  async review(
    branchId: string,
    submissionId: string,
    identity: AdminIdentity,
  ) {
    const submission = await this.prisma.bookingFormSubmission.findFirst({
      where: { id: submissionId, branchId },
    });
    if (!submission) throw new NotFoundException('Form gönderimi bulunamadı.');
    if (submission.status === FormSubmissionStatus.PENDING) {
      throw new ConflictException('Henüz gönderilmemiş form incelenemez.');
    }
    return this.prisma.bookingFormSubmission.update({
      where: { id: submissionId },
      data: {
        status: FormSubmissionStatus.REVIEWED,
        reviewedAt: new Date(),
        reviewedByAdminUserId: identity.userId,
      },
    });
  }

  private submissions(where: Prisma.BookingFormSubmissionWhereInput) {
    return this.prisma.bookingFormSubmission.findMany({
      where,
      include: {
        formTemplateVersion: {
          include: { formTemplate: { select: { id: true, name: true } } },
        },
        reviewedByAdminUser: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private definition(fields: FormFieldDto[]): Prisma.InputJsonValue {
    const keys = fields.map((field) => field.key.trim());
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException(
        'Form alan anahtarları benzersiz olmalıdır.',
      );
    }
    for (const field of fields) {
      if (
        ['SINGLE_CHOICE', 'MULTI_CHOICE'].includes(field.type) &&
        (!field.options || field.options.length < 2)
      ) {
        throw new BadRequestException(
          `${field.label} alanı için en az iki seçenek gerekir.`,
        );
      }
      if (field.consentType && (!field.documentKey || !field.documentVersion)) {
        throw new BadRequestException(
          'Onay alanı belge anahtarı ve sürümü içermelidir.',
        );
      }
    }
    return { fields } as unknown as Prisma.InputJsonValue;
  }

  private fields(definition: Prisma.JsonValue): FormFieldDto[] {
    const object = definition as unknown as FormDefinition;
    return Array.isArray(object?.fields) ? object.fields : [];
  }

  private validateAnswers(
    fields: FormFieldDto[],
    raw: Record<string, unknown>,
  ) {
    const answers: Record<string, string | boolean | string[]> = {};
    const allowedKeys = new Set(fields.map((field) => field.key));
    for (const key of Object.keys(raw)) {
      if (!allowedKeys.has(key)) {
        throw new BadRequestException(`Bilinmeyen form alanı: ${key}`);
      }
    }
    for (const field of fields) {
      if (field.type === 'INFORMATION') continue;
      const value = raw[field.key];
      const empty =
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0);
      if (field.required && empty) {
        throw new BadRequestException(`${field.label} alanı zorunludur.`);
      }
      if (empty) continue;
      if (
        ['SHORT_TEXT', 'LONG_TEXT', 'DATE', 'SINGLE_CHOICE'].includes(
          field.type,
        ) &&
        typeof value !== 'string'
      ) {
        throw new BadRequestException(`${field.label} alanı geçerli değil.`);
      }
      if (
        ['YES_NO', 'CHECKBOX'].includes(field.type) &&
        typeof value !== 'boolean'
      ) {
        throw new BadRequestException(`${field.label} alanı geçerli değil.`);
      }
      if (
        field.type === 'MULTI_CHOICE' &&
        (!Array.isArray(value) ||
          value.some((item) => typeof item !== 'string'))
      ) {
        throw new BadRequestException(`${field.label} alanı geçerli değil.`);
      }
      if (
        field.options &&
        typeof value === 'string' &&
        !field.options.includes(value)
      ) {
        throw new BadRequestException(`${field.label} seçimi geçerli değil.`);
      }
      if (
        field.options &&
        Array.isArray(value) &&
        value.some((item) => !field.options!.includes(String(item)))
      ) {
        throw new BadRequestException(`${field.label} seçimi geçerli değil.`);
      }
      answers[field.key] = value as string | boolean | string[];
    }
    return answers;
  }

  private assertOwnerOrReceptionist(identity: AdminIdentity) {
    if (
      identity.role !== AdminRole.OWNER &&
      identity.role !== AdminRole.RECEPTIONIST
    ) {
      throw new ForbiddenException('Form yönetimi için yetkiniz bulunmuyor.');
    }
  }

  private hashIp(ip: string) {
    return createHash('sha256')
      .update(`${process.env.SESSION_HASH_SECRET ?? 'development'}:${ip}`)
      .digest('hex');
  }
}

function clean(value?: string): string | null {
  return value?.trim() || null;
}
