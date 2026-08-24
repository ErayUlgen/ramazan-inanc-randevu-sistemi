import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminSessionGuard } from '../admin/admin-session.guard';
import { AvailabilityService } from './availability.service';
import { GetAdminAvailabilityDto } from './dto/get-admin-availability.dto';
import { AdminRole } from '@prisma/client';
import { AdminRoles } from '../admin/admin-authorization';

@UseGuards(AdminSessionGuard)
@AdminRoles(AdminRole.RECEPTIONIST)
@Controller('admin/availability')
export class AdminAvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  get(@Query() query: GetAdminAvailabilityDto) {
    return this.availability.getForAdmin(query);
  }
}
