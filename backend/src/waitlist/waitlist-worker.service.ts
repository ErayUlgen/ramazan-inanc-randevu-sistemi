import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';

@Injectable()
export class WaitlistWorkerService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly waitlist: WaitlistService) {}

  onModuleInit() {
    if (process.env.DISABLE_NOTIFICATION_WORKERS === 'true') return;
    this.timer = setInterval(() => void this.run(), 15_000);
    this.timer.unref();
    void this.run();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async run() {
    if (this.running) return 0;
    this.running = true;
    try {
      await this.waitlist.expireOffers();
      return await this.waitlist.processRecoveryEvents();
    } finally {
      this.running = false;
    }
  }
}
