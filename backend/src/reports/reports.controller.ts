import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  AdminSessionGuard,
  type AdminRequest,
} from '../admin/admin-session.guard';
import { GetOperationsReportDto } from './dto/get-operations-report.dto';
import { ReportsService } from './reports.service';

@Controller('admin/reports')
@UseGuards(AdminSessionGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('operations')
  get(@Req() request: AdminRequest, @Query() query: GetOperationsReportDto) {
    return this.reports.get(request.adminIdentity!.branchId, query);
  }
}
