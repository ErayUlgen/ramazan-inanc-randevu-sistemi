import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { AdminRoles } from '../admin/admin-authorization';
import { AdminSessionGuard } from '../admin/admin-session.guard';
import type { AdminRequest } from '../admin/admin-session.guard';
import { PublicActionRateLimitService } from '../common/public-action-rate-limit.service';
import { CustomerSessionGuard } from '../customer-account/customer-session.guard';
import type { CustomerRequest } from '../customer-account/customer-session.guard';
import type { Request } from 'express';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('public/reviews')
export class PublicReviewsController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly rateLimit: PublicActionRateLimitService,
  ) {}

  @Get(':token')
  status(@Param('token') token: string, @Req() request: Request) {
    this.rateLimit.assertAllowed('review-read', token, request);
    return this.reviews.publicStatus(token);
  }

  @Post(':token')
  submit(
    @Param('token') token: string,
    @Body() dto: SubmitReviewDto,
    @Req() request: Request,
  ) {
    this.rateLimit.assertAllowed('review-write', token, request);
    return this.reviews.submitPublic(token, dto);
  }
}

@Controller('customer-account/bookings/:publicCode/review')
@UseGuards(CustomerSessionGuard)
export class CustomerReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  status(
    @Req() request: CustomerRequest,
    @Param('publicCode') publicCode: string,
  ) {
    return this.reviews.customerStatus(
      request.customerIdentity!.customerId,
      publicCode,
    );
  }

  @Post()
  submit(
    @Req() request: CustomerRequest,
    @Param('publicCode') publicCode: string,
    @Body() dto: SubmitReviewDto,
  ) {
    return this.reviews.submitCustomer(
      request.customerIdentity!.customerId,
      publicCode,
      dto,
    );
  }
}

@Controller('admin/reviews')
@UseGuards(AdminSessionGuard)
@AdminRoles(AdminRole.RECEPTIONIST, AdminRole.PROFESSIONAL)
export class AdminReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(
    @Req() request: AdminRequest,
    @Query()
    query: {
      cursor?: string;
      professionalId?: string;
      rating?: number;
      unread?: string;
      from?: string;
      to?: string;
    },
  ) {
    return this.reviews.listAdmin(request.adminIdentity!, query);
  }

  @Get('summary')
  summary(
    @Req() request: AdminRequest,
    @Query() query: { from?: string; to?: string; professionalId?: string },
  ) {
    return this.reviews.summary(request.adminIdentity!, query);
  }

  @Patch(':id')
  update(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviews.updateAdmin(request.adminIdentity!, id, dto);
  }
}
