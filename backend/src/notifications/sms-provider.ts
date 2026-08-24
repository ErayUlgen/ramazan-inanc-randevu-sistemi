export type SendSmsInput = {
  to: string;
  message: string;
  idempotencyKey: string;
  kind?: 'OTP' | 'TRANSACTIONAL';
};

export type SendSmsResult = {
  accepted: boolean;
  provider: string;
  providerMessageId?: string;
  responseCode?: string;
  retryable?: boolean;
  errorCode?: string;
  errorMessage?: string;
};

export interface SmsProvider {
  send(input: SendSmsInput): Promise<SendSmsResult>;
}
