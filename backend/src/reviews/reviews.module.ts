import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { CustomerAccountModule } from '../customer-account/customer-account.module';
import { OperationsAuditModule } from '../operations-audit/operations-audit.module';
import {
  AdminReviewsController,
  CustomerReviewsController,
  PublicReviewsController,
} from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [AdminModule, CustomerAccountModule, OperationsAuditModule],
  controllers: [
    PublicReviewsController,
    CustomerReviewsController,
    AdminReviewsController,
  ],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
