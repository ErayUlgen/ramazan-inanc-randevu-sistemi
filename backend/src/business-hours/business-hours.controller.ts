import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminSessionGuard } from '../admin/admin-session.guard';
import { BusinessHoursService } from './business-hours.service';
import { UpdateBusinessHoursDto } from './dto/update-business-hours.dto';
import { UpsertDateOverrideDto } from './dto/upsert-date-override.dto';

@UseGuards(AdminSessionGuard)
@Controller('admin/branches/:branchId')
export class BusinessHoursController {
  constructor(private readonly hours: BusinessHoursService) {}

  @Get('hours')
  get(@Param('branchId') branchId: string) {
    return this.hours.getAdmin(branchId);
  }

  @Put('hours')
  update(
    @Param('branchId') branchId: string,
    @Body() dto: UpdateBusinessHoursDto,
  ) {
    return this.hours.updateWeekly(branchId, dto);
  }

  @Put('date-overrides/:date')
  upsertOverride(
    @Param('branchId') branchId: string,
    @Param('date') date: string,
    @Body() dto: UpsertDateOverrideDto,
  ) {
    return this.hours.upsertOverride(branchId, date, dto);
  }

  @Delete('date-overrides/:date')
  removeOverride(
    @Param('branchId') branchId: string,
    @Param('date') date: string,
  ) {
    return this.hours.deleteOverride(branchId, date);
  }
}
