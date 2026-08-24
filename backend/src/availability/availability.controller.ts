import { Controller, Get, Param, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { GetAvailabilityDto } from './dto/get-availability.dto';

@Controller('public/branches/:branchSlug/availability')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  getAvailability(
    @Param('branchSlug') branchSlug: string,
    @Query() query: GetAvailabilityDto,
  ) {
    return this.availability.getForBranch(branchSlug, query);
  }
}
