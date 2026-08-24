import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AdminRealtimeController } from './admin-realtime.controller';

@Module({
  imports: [AdminModule],
  controllers: [AdminRealtimeController],
})
export class RealtimeModule {}
