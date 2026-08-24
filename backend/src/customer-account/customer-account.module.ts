import { Module } from '@nestjs/common';
import { BookingChangesModule } from '../booking-changes/booking-changes.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CustomerAccountController } from './customer-account.controller';
import { CustomerAccountService } from './customer-account.service';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerSessionGuard } from './customer-session.guard';
import { CustomerSessionService } from './customer-session.service';
import { OperationsAuditModule } from '../operations-audit/operations-audit.module';
import { PublicActionRateLimitService } from '../common/public-action-rate-limit.service';

@Module({
  imports: [NotificationsModule, BookingChangesModule, OperationsAuditModule],
  controllers: [CustomerAccountController],
  providers: [
    CustomerAccountService,
    CustomerAuthService,
    CustomerSessionService,
    CustomerSessionGuard,
    PublicActionRateLimitService,
  ],
  exports: [
    CustomerAuthService,
    CustomerSessionService,
    CustomerSessionGuard,
    PublicActionRateLimitService,
  ],
})
export class CustomerAccountModule {}
