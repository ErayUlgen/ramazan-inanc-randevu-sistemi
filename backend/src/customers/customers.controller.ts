import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AdminSessionGuard,
  type AdminRequest,
} from '../admin/admin-session.guard';
import { CustomersService } from './customers.service';
import { SearchCustomersDto } from './dto/search-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdateOnlineBookingAccessDto } from './dto/update-online-booking-access.dto';
import { AdminRole } from '@prisma/client';
import { AdminRoles } from '../admin/admin-authorization';

@UseGuards(AdminSessionGuard)
@AdminRoles(AdminRole.RECEPTIONIST)
@Controller('admin/customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  search(@Req() request: AdminRequest, @Query() query: SearchCustomersDto) {
    return this.customers.search(request.adminIdentity!.branchId, query);
  }

  @Get(':id')
  detail(@Req() request: AdminRequest, @Param('id') id: string) {
    return this.customers.detail(request.adminIdentity!.branchId, id);
  }

  @Patch(':id')
  update(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(request.adminIdentity!.branchId, id, dto);
  }

  @Patch(':id/online-booking-access')
  updateOnlineBookingAccess(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: UpdateOnlineBookingAccessDto,
  ) {
    return this.customers.updateOnlineBookingAccess(
      request.adminIdentity!.branchId,
      request.adminIdentity!.userId,
      id,
      dto,
    );
  }
}
