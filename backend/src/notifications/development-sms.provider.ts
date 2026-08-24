import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { SendSmsInput, SendSmsResult, SmsProvider } from './sms-provider';

@Injectable()
export class DevelopmentSmsProvider implements SmsProvider {
  send(input: SendSmsInput): Promise<SendSmsResult> {
    void input;
    const mode = process.env.SMS_DEVELOPMENT_MODE ?? 'success';
    if (mode === 'transient_failure') {
      return Promise.resolve({
        accepted: false,
        provider: 'development',
        retryable: true,
        responseCode: 'DEV_TEMPORARY',
        errorCode: 'TEMPORARY_PROVIDER_FAILURE',
        errorMessage: 'Development sağlayıcısı geçici hata simülasyonu.',
      });
    }
    if (mode === 'permanent_failure') {
      return Promise.resolve({
        accepted: false,
        provider: 'development',
        retryable: false,
        responseCode: 'DEV_REJECTED',
        errorCode: 'PROVIDER_REJECTED',
        errorMessage: 'Development sağlayıcısı kalıcı hata simülasyonu.',
      });
    }
    return Promise.resolve({
      accepted: true,
      provider: 'development',
      providerMessageId: `dev-${randomUUID()}`,
      responseCode: 'DEV_ACCEPTED',
    });
  }
}
