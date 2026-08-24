import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AvailabilityModule } from './availability/availability.module';
import { BookingAccessModule } from './booking-access/booking-access.module';
import { BookingPolicyModule } from './booking-policy/booking-policy.module';
import { BookingChangesModule } from './booking-changes/booking-changes.module';
import { BusinessHoursModule } from './business-hours/business-hours.module';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookingsModule } from './bookings/bookings.module';
import { CatalogModule } from './catalog/catalog.module';
import { CustomersModule } from './customers/customers.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { ScheduleBlocksModule } from './schedule-blocks/schedule-blocks.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { CorrelationIdMiddleware } from './common/correlation-id.middleware';
import { validateEnvironment } from './config/validate-environment';
import { RealtimeModule } from './realtime/realtime.module';
import { ReportsModule } from './reports/reports.module';
import { CustomerAccountModule } from './customer-account/customer-account.module';
import { ReviewsModule } from './reviews/reviews.module';
import { BookingSeriesModule } from './booking-series/booking-series.module';
import { FormsModule } from './forms/forms.module';
import { CalendarSubscriptionsModule } from './calendar-subscriptions/calendar-subscriptions.module';
import { OriginValidationMiddleware } from './common/origin-validation.middleware';
import { RequestObservabilityMiddleware } from './common/request-observability.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    AdminModule,
    BookingAccessModule,
    BookingPolicyModule,
    BookingChangesModule,
    BusinessHoursModule,
    PrismaModule,
    CatalogModule,
    CustomersModule,
    AvailabilityModule,
    NotificationsModule,
    BookingsModule,
    ScheduleBlocksModule,
    WaitlistModule,
    RealtimeModule,
    ReportsModule,
    CustomerAccountModule,
    ReviewsModule,
    BookingSeriesModule,
    FormsModule,
    CalendarSubscriptionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        CorrelationIdMiddleware,
        RequestObservabilityMiddleware,
        OriginValidationMiddleware,
      )
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
