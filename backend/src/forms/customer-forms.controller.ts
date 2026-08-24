import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  CustomerSessionGuard,
  type CustomerRequest,
} from '../customer-account/customer-session.guard';
import { SubmitBookingFormDto } from './dto/form-template.dto';
import { FormsService } from './forms.service';

@Controller('customer-account/bookings/:publicCode/forms')
@UseGuards(CustomerSessionGuard)
export class CustomerFormsController {
  constructor(private readonly forms: FormsService) {}

  @Get()
  list(
    @Req() request: CustomerRequest,
    @Param('publicCode') publicCode: string,
  ) {
    return this.forms.listForCustomer(
      request.customerIdentity!.customerId,
      publicCode,
    );
  }

  @Post(':submissionId/submit')
  submit(
    @Req() request: CustomerRequest & Request,
    @Param('publicCode') publicCode: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: SubmitBookingFormDto,
  ) {
    return this.forms.submitForCustomer(
      request.customerIdentity!.customerId,
      publicCode,
      submissionId,
      dto,
      request.ip,
    );
  }
}
