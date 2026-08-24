import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { OperationsAuditModule } from '../operations-audit/operations-audit.module';
import { AdminNotificationsController } from './admin-notifications.controller';
import { AdminNotificationsService } from './admin-notifications.service';
import { DevelopmentSmsProvider } from './development-sms.provider';
import { NotificationOutboxService } from './notification-outbox.service';
import { NotificationWorkerService } from './notification-worker.service';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { SmsGatewayService } from './sms-gateway.service';
import { HttpSmsProvider } from './http-sms.provider';
import { SmsWebhookController } from './sms-webhook.controller';
import { NetgsmSmsProvider } from './netgsm-sms.provider';
import { NotificationRulesService } from './notification-rules.service';
import { ReviewRequestSchedulerService } from './review-request-scheduler.service';

@Module({
  imports: [AdminModule, OperationsAuditModule],
  controllers: [AdminNotificationsController, SmsWebhookController],
  providers: [
    AdminNotificationsService,
    DevelopmentSmsProvider,
    HttpSmsProvider,
    NetgsmSmsProvider,
    SmsGatewayService,
    NotificationOutboxService,
    NotificationWorkerService,
    ReminderSchedulerService,
    ReviewRequestSchedulerService,
    NotificationRulesService,
  ],
  exports: [
    SmsGatewayService,
    NotificationOutboxService,
    NotificationRulesService,
  ],
})
export class NotificationsModule {}
