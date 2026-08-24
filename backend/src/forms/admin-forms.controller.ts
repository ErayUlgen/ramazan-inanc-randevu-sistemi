import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { AdminRoles } from '../admin/admin-authorization';
import {
  AdminSessionGuard,
  type AdminRequest,
} from '../admin/admin-session.guard';
import {
  CreateFormTemplateDto,
  ReviewBookingFormDto,
  SetFormRequirementsDto,
  UpdateFormDraftDto,
} from './dto/form-template.dto';
import { FormsService } from './forms.service';

@UseGuards(AdminSessionGuard)
@AdminRoles(AdminRole.RECEPTIONIST, AdminRole.PROFESSIONAL)
@Controller('admin')
export class AdminFormsController {
  constructor(private readonly forms: FormsService) {}

  @Get('form-templates')
  list(@Req() request: AdminRequest) {
    return this.forms.listTemplates(request.adminIdentity!.branchId);
  }

  @Get('form-templates/:id')
  detail(@Req() request: AdminRequest, @Param('id') id: string) {
    return this.forms.template(request.adminIdentity!.branchId, id);
  }

  @Post('form-templates')
  @AdminRoles(AdminRole.OWNER, AdminRole.RECEPTIONIST)
  create(@Req() request: AdminRequest, @Body() dto: CreateFormTemplateDto) {
    return this.forms.createTemplate(
      request.adminIdentity!.branchId,
      dto,
      request.adminIdentity!,
    );
  }

  @Patch('form-templates/:id/draft')
  @AdminRoles(AdminRole.OWNER, AdminRole.RECEPTIONIST)
  updateDraft(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: UpdateFormDraftDto,
  ) {
    return this.forms.updateDraft(
      request.adminIdentity!.branchId,
      id,
      dto,
      request.adminIdentity!,
    );
  }

  @Post('form-templates/:id/publish')
  @AdminRoles(AdminRole.OWNER, AdminRole.RECEPTIONIST)
  publish(@Req() request: AdminRequest, @Param('id') id: string) {
    return this.forms.publish(
      request.adminIdentity!.branchId,
      id,
      request.adminIdentity!,
    );
  }

  @Post('form-templates/:id/archive')
  @AdminRoles(AdminRole.OWNER, AdminRole.RECEPTIONIST)
  archive(@Req() request: AdminRequest, @Param('id') id: string) {
    return this.forms.archive(
      request.adminIdentity!.branchId,
      id,
      request.adminIdentity!,
    );
  }

  @Put('form-templates/:id/service-requirements')
  @AdminRoles(AdminRole.OWNER, AdminRole.RECEPTIONIST)
  requirements(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: SetFormRequirementsDto,
  ) {
    return this.forms.setRequirements(
      request.adminIdentity!.branchId,
      id,
      dto,
      request.adminIdentity!,
    );
  }

  @Get('bookings/:bookingId/forms')
  bookingForms(
    @Req() request: AdminRequest,
    @Param('bookingId') bookingId: string,
  ) {
    return this.forms.listForBooking(
      request.adminIdentity!.branchId,
      bookingId,
      request.adminIdentity!,
    );
  }

  @Post('booking-form-submissions/:id/review')
  review(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: ReviewBookingFormDto,
  ) {
    if (!dto.reviewed) {
      throw new BadRequestException(
        'İnceleme durumunu geri almak bu sürümde desteklenmiyor.',
      );
    }
    return this.forms.review(
      request.adminIdentity!.branchId,
      id,
      request.adminIdentity!,
    );
  }
}
