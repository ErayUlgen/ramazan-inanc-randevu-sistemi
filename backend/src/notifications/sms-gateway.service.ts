import { Injectable } from '@nestjs/common';
import { DevelopmentSmsProvider } from './development-sms.provider';
import type { SendSmsInput, SendSmsResult } from './sms-provider';
import { HttpSmsProvider } from './http-sms.provider';
import { NetgsmSmsProvider } from './netgsm-sms.provider';

@Injectable()
export class SmsGatewayService {
  constructor(
    private readonly development: DevelopmentSmsProvider,
    private readonly http: HttpSmsProvider,
    private readonly netgsm: NetgsmSmsProvider,
  ) {}

  send(input: SendSmsInput): Promise<SendSmsResult> {
    const provider = process.env.SMS_PROVIDER ?? 'development';
    if (provider === 'development' && process.env.NODE_ENV !== 'production') {
      return this.development.send(input);
    }
    if (provider === 'http') return this.http.send(input);
    if (provider === 'netgsm') return this.netgsm.send(input);
    return Promise.resolve({
      accepted: false,
      provider,
      retryable: false,
      responseCode: 'PROVIDER_NOT_CONFIGURED',
      errorCode: 'PROVIDER_NOT_CONFIGURED',
      errorMessage: 'Production SMS sağlayıcısı henüz yapılandırılmadı.',
    });
  }

  isDevelopment(): boolean {
    return (process.env.SMS_PROVIDER ?? 'development') === 'development';
  }

  isConfigured(): boolean {
    return (
      (this.isDevelopment() && process.env.NODE_ENV !== 'production') ||
      ((process.env.SMS_PROVIDER ?? '') === 'http' &&
        Boolean(process.env.SMS_API_URL && process.env.SMS_API_KEY)) ||
      ((process.env.SMS_PROVIDER ?? '') === 'netgsm' &&
        Boolean(
          process.env.NETGSM_USERCODE &&
          process.env.NETGSM_PASSWORD &&
          process.env.NETGSM_HEADER,
        ))
    );
  }
}
