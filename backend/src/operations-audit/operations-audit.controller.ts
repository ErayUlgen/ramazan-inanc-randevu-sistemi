import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AdminRole } from '@prisma/client';
import { AdminRoles } from '../admin/admin-authorization';
import {
  AdminSessionGuard,
  type AdminRequest,
} from '../admin/admin-session.guard';
import { AuditQueryDto, ExportQueryDto } from './dto/audit-query.dto';
import { OperationsAuditService } from './operations-audit.service';

@Controller('admin')
@UseGuards(AdminSessionGuard)
@AdminRoles(AdminRole.OWNER)
export class OperationsAuditController {
  constructor(private readonly audit: OperationsAuditService) {}

  @Get('audit-events')
  list(@Req() request: AdminRequest, @Query() query: AuditQueryDto) {
    return this.audit.list(request.adminIdentity!.branchId, query);
  }

  @Get('exports.csv')
  async export(
    @Req() request: AdminRequest,
    @Query() query: ExportQueryDto,
    @Res() response: Response,
  ) {
    const filename = `ramazan-inanc-${query.type}-${query.from}-${query.to}.csv`;
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    response.write('\uFEFF');
    await this.audit.streamExport(
      request.adminIdentity!.branchId,
      query,
      response,
    );
    await this.audit.recordExport(
      request.adminIdentity!.branchId,
      query,
      request.adminIdentity!,
    );
    response.end();
  }
}
