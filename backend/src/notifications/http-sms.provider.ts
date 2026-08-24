import { Injectable } from '@nestjs/common';
import type { SendSmsInput, SendSmsResult, SmsProvider } from './sms-provider';

type ProviderResponse = {
  accepted?: boolean;
  messageId?: string;
  code?: string;
  error?: string;
};

@Injectable()
export class HttpSmsProvider implements SmsProvider {
  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const url = process.env.SMS_API_URL;
    const apiKey = process.env.SMS_API_KEY;
    if (!url || !apiKey) {
      return {
        accepted: false,
        provider: 'http',
        retryable: false,
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        errorMessage: 'SMS sağlayıcısı yapılandırılmadı.',
      };
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json; charset=utf-8',
          'idempotency-key': input.idempotencyKey,
        },
        body: JSON.stringify({
          to: input.to,
          message: input.message,
          sender: process.env.SMS_SENDER,
          idempotencyKey: input.idempotencyKey,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const payload = (await response
        .json()
        .catch(() => ({}))) as ProviderResponse;
      const accepted = response.ok && payload.accepted !== false;
      return {
        accepted,
        provider: 'http',
        providerMessageId: payload.messageId,
        responseCode: payload.code ?? String(response.status),
        retryable:
          !accepted && (response.status === 429 || response.status >= 500),
        errorCode: accepted ? undefined : (payload.code ?? 'PROVIDER_REJECTED'),
        errorMessage: accepted
          ? undefined
          : (payload.error ?? 'SMS sağlayıcısı isteği reddetti.'),
      };
    } catch (error) {
      return {
        accepted: false,
        provider: 'http',
        retryable: true,
        errorCode: 'PROVIDER_UNREACHABLE',
        errorMessage:
          error instanceof Error
            ? error.message
            : 'SMS sağlayıcısına ulaşılamadı.',
      };
    }
  }
}
