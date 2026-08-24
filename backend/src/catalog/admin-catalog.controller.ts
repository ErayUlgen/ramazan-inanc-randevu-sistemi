import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminSessionGuard } from '../admin/admin-session.guard';
import { AdminCatalogService } from './admin-catalog.service';
import { UpsertProfessionalDto } from './dto/upsert-professional.dto';
import { UpsertServiceDto } from './dto/upsert-service.dto';
import { UpdateProfessionalServiceDto } from './dto/update-professional-service.dto';

@UseGuards(AdminSessionGuard)
@Controller('admin')
export class AdminCatalogController {
  constructor(private readonly catalog: AdminCatalogService) {}

  @Get('services')
  services(@Query('branchId') branchId: string) {
    return this.catalog.listServices(branchId);
  }

  @Post('services')
  createService(@Body() dto: UpsertServiceDto) {
    return this.catalog.createService(dto);
  }

  @Patch('services/:id')
  updateService(@Param('id') id: string, @Body() dto: UpsertServiceDto) {
    return this.catalog.updateService(id, dto);
  }

  @Get('professionals')
  professionals(@Query('branchId') branchId: string) {
    return this.catalog.listProfessionals(branchId);
  }

  @Post('professionals')
  createProfessional(@Body() dto: UpsertProfessionalDto) {
    return this.catalog.createProfessional(dto);
  }

  @Patch('professionals/:id')
  updateProfessional(
    @Param('id') id: string,
    @Body() dto: UpsertProfessionalDto,
  ) {
    return this.catalog.updateProfessional(id, dto);
  }

  @Get('catalog/professionals/:professionalId/services')
  professionalServices(@Param('professionalId') professionalId: string) {
    return this.catalog.listProfessionalServices(professionalId);
  }

  @Patch('catalog/professionals/:professionalId/services/:serviceId')
  updateProfessionalService(
    @Param('professionalId') professionalId: string,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateProfessionalServiceDto,
  ) {
    return this.catalog.updateProfessionalService(
      professionalId,
      serviceId,
      dto,
    );
  }
}
