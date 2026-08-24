import { HttpException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import type { Request } from 'express';

type Bucket = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 15 * 60_000;
const READ_LIMIT = 60;
const WRITE_LIMIT = 12;
const MAX_BUCKETS = 10_000;

@Injectable()
export class PublicActionRateLimitService {
  private readonly buckets = new Map<string, Bucket>();

  assertAllowed(
    action: 'review-read' | 'review-write',
    token: string,
    request: Request,
  ) {
    const isWrite = action.endsWith('write');
    const limit = isWrite ? WRITE_LIMIT : READ_LIMIT;
    const ip = this.clientIp(request);
    const tokenHash = this.hash(token);
    const ipHash = this.hash(ip);

    this.consume(`${action}:token:${tokenHash}`, limit);
    this.consume(`${action}:ip:${ipHash}`, limit * 4);
    this.prune();
  }

  private consume(key: string, limit: number) {
    const now = Date.now();
    const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return;
    }
    if (current.count >= limit) {
      throw new HttpException(
        'Çok fazla deneme yapıldı. Lütfen biraz sonra yeniden deneyin.',
        429,
      );
    }
    current.count += 1;
  }

  private clientIp(request: Request) {
    const forwarded = request.header('x-forwarded-for')?.split(',')[0]?.trim();
    return forwarded || request.ip || request.socket.remoteAddress || 'unknown';
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private prune() {
    if (this.buckets.size < MAX_BUCKETS) return;
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
    if (this.buckets.size < MAX_BUCKETS) return;
    for (const key of this.buckets.keys()) {
      this.buckets.delete(key);
      if (this.buckets.size < MAX_BUCKETS * 0.8) break;
    }
  }
}
