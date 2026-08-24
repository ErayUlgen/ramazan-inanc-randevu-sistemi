import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { BookingPolicyController } from './booking-policy.controller';
import { BookingPolicyService } from './booking-policy.service';

@Module({
  imports: [AdminModule],
  controllers: [BookingPolicyController],
  providers: [BookingPolicyService],
  exports: [BookingPolicyService],
})
export class BookingPolicyModule {}
