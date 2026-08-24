import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingChangesModule } from '../booking-changes/booking-changes.module';
import { BookingAccessController } from './booking-access.controller';
import { BookingAccessGuard } from './booking-access.guard';
import { BookingAccessService } from './booking-access.service';
import { BookingAccessSessionService } from './booking-access-session.service';

@Module({
  imports: [NotificationsModule, BookingChangesModule],
  controllers: [BookingAccessController],
  providers: [
    BookingAccessService,
    BookingAccessSessionService,
    BookingAccessGuard,
  ],
})
export class BookingAccessModule {}
