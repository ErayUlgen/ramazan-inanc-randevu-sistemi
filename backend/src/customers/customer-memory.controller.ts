import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { AdminRoles } from '../admin/admin-authorization';
import {
  AdminSessionGuard,
  type AdminRequest,
} from '../admin/admin-session.guard';
import { CustomerMemoryService } from './customer-memory.service';
import {
  CreateCustomerServiceRecordDto,
  CreateCustomerTagDto,
  MergeCustomerDto,
  ReviseCustomerServiceRecordDto,
  SetCustomerTagsDto,
  UpdateCustomerCareProfileDto,
} from './dto/customer-memory.dto';

@UseGuards(AdminSessionGuard)
@AdminRoles(AdminRole.RECEPTIONIST, AdminRole.PROFESSIONAL)
@Controller('admin')
export class CustomerMemoryController {
  constructor(private readonly memory: CustomerMemoryService) {}

  @Get('customers/:id/memory')
  getMemory(@Req() request: AdminRequest, @Param('id') id: string) {
    return this.memory.getMemory(
      request.adminIdentity!.branchId,
      id,
      request.adminIdentity!,
    );
  }

  @Patch('customers/:id/care-profile')
  updateProfile(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerCareProfileDto,
  ) {
    return this.memory.updateProfile(
      request.adminIdentity!.branchId,
      id,
      dto,
      request.adminIdentity!,
    );
  }

  @Get('customer-tags')
  listTags(@Req() request: AdminRequest) {
    return this.memory.listTags(request.adminIdentity!.branchId);
  }

  @Post('customer-tags')
  createTag(@Req() request: AdminRequest, @Body() dto: CreateCustomerTagDto) {
    return this.memory.createTag(
      request.adminIdentity!.branchId,
      dto,
      request.adminIdentity!,
    );
  }

  @Patch('customers/:id/tags')
  setTags(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: SetCustomerTagsDto,
  ) {
    return this.memory.setTags(
      request.adminIdentity!.branchId,
      id,
      dto.tagIds,
      request.adminIdentity!,
    );
  }

  @Post('customers/:id/service-records')
  createServiceRecord(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: CreateCustomerServiceRecordDto,
  ) {
    return this.memory.createServiceRecord(
      request.adminIdentity!.branchId,
      id,
      dto,
      request.adminIdentity!,
    );
  }

  @Post('customer-service-records/:id/revisions')
  reviseServiceRecord(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: ReviseCustomerServiceRecordDto,
  ) {
    return this.memory.reviseServiceRecord(
      request.adminIdentity!.branchId,
      id,
      dto,
      request.adminIdentity!,
    );
  }

  @Post('customers/:id/merge-preview')
  @AdminRoles(AdminRole.OWNER)
  mergePreview(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: MergeCustomerDto,
  ) {
    return this.memory.mergePreview(
      request.adminIdentity!.branchId,
      id,
      dto.sourceCustomerId,
    );
  }

  @Post('customers/:id/merge')
  @AdminRoles(AdminRole.OWNER)
  merge(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: MergeCustomerDto,
  ) {
    return this.memory.merge(
      request.adminIdentity!.branchId,
      id,
      dto.sourceCustomerId,
      request.adminIdentity!,
    );
  }
}
