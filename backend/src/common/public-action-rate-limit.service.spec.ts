import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import { PublicActionRateLimitService } from './public-action-rate-limit.service';

describe('PublicActionRateLimitService', () => {
  it('limits repeated public mutations without storing raw tokens', () => {
    const limiter = new PublicActionRateLimitService();
    const request = {
      header: () => undefined,
      ip: '127.0.0.1',
      socket: {},
    } as unknown as Request;

    for (let index = 0; index < 12; index += 1) {
      limiter.assertAllowed('review-write', 'secret-token', request);
    }

    expect(() =>
      limiter.assertAllowed('review-write', 'secret-token', request),
    ).toThrow(HttpException);
  });
});
