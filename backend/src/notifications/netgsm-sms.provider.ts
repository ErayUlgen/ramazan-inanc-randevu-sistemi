import { Injectable } from '@nestjs/common';
import type { SendSmsInput, SendSmsResult, SmsProvider } from './sms-provider';

const OTP_URL = 'https://api.netgsm.com.tr/sms/send/otp';
const TRANSACTIONAL_URL = 'https://api.netgsm.com.tr/sms/send/xml';

@Injectable()
export class NetgsmSmsProvider implements SmsProvider {
  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const usercode = process.env.NETGSM_USERCODE;
    const password = process.env.NETGSM_PASSWORD;
    const header = process.env.NETGSM_HEADER;
    if (!usercode || !password || !header) {
      return {
        accepted: false,
        provider: 'netgsm',
        retryable: false,
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        errorMessage: 'Netgsm API bilgileri yapılandırılmadı.',
      };
    }
    const otp = input.kind === 'OTP';
    if (
      otp &&
      Array.from(input.message).some(
        (character) => character.charCodeAt(0) > 127,
      )
    ) {
      return {
        accepted: false,
        provider: 'netgsm',
        retryable: false,
        errorCode: 'OTP_NON_ASCII',
        errorMessage: 'Netgsm OTP mesajı Türkçe karakter içeremez.',
      };
    }
    try {
      const response = await fetch(
        otp
          ? process.env.NETGSM_OTP_URL || OTP_URL
          : process.env.NETGSM_SMS_URL || TRANSACTIONAL_URL,
        {
          method: 'POST',
          headers: { 'content-type': 'application/xml; charset=utf-8' },
          body: this.xml(input, { usercode, password, header }, otp),
          signal: AbortSignal.timeout(10_000),
        },
      );
      const body = await response.text();
      const code =
        body.match(/<code>\s*([^<]+)\s*<\/code>/i)?.[1]?.trim() ??
        body.trim().split(/\s+/)[0];
      const messageId =
        body.match(/<jobID>\s*([^<]+)\s*<\/jobID>/i)?.[1]?.trim() ??
        body.trim().split(/\s+/)[1];
      const accepted = response.ok && (code === '0' || code === '00');
      return {
        accepted,
        provider: 'netgsm',
        providerMessageId: accepted ? messageId : undefined,
        responseCode: code || String(response.status),
        retryable:
          !accepted &&
          (response.status === 429 || response.status >= 500 || code === '100'),
        errorCode: accepted ? undefined : this.errorCode(code),
        errorMessage: accepted
          ? undefined
          : this.errorMessage(code, response.status),
      };
    } catch (error) {
      return {
        accepted: false,
        provider: 'netgsm',
        retryable: true,
        errorCode: 'PROVIDER_UNREACHABLE',
        errorMessage:
          error instanceof Error
            ? error.message
            : 'Netgsm servisine ulaşılamadı.',
      };
    }
  }

  private xml(
    input: SendSmsInput,
    credentials: { usercode: string; password: string; header: string },
    otp: boolean,
  ) {
    const header = [
      `<usercode>${this.escape(credentials.usercode)}</usercode>`,
      `<password>${this.escape(credentials.password)}</password>`,
      `<msgheader>${this.escape(credentials.header)}</msgheader>`,
    ];
    if (!otp) {
      header.unshift('<company dil="TR">Netgsm</company>');
      header.push('<type>1:n</type>');
    }
    return [
      '<?xml version="1.0"?>',
      '<mainbody>',
      `<header>${header.join('')}</header>`,
      '<body>',
      `<msg><![CDATA[${this.cdata(input.message)}]]></msg>`,
      `<no>${this.escape(this.phone(input.to))}</no>`,
      '</body>',
      '</mainbody>',
    ].join('');
  }

  private phone(value: string) {
    const digits = value.replace(/\D/g, '');
    return digits.startsWith('90') ? digits.slice(2) : digits.replace(/^0/, '');
  }

  private escape(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private cdata(value: string) {
    return value.replace(/]]>/g, ']]]]><![CDATA[>');
  }

  private errorCode(code: string | undefined) {
    const known: Record<string, string> = {
      '20': 'INVALID_MESSAGE',
      '30': 'AUTHENTICATION_FAILED',
      '40': 'INVALID_SENDER',
      '41': 'INVALID_SENDER',
      '50': 'INVALID_RECIPIENT',
      '51': 'INVALID_RECIPIENT',
      '52': 'INVALID_RECIPIENT',
      '60': 'OTP_PACKAGE_MISSING',
      '70': 'INVALID_INPUT',
      '100': 'PROVIDER_ERROR',
    };
    return known[code ?? ''] ?? 'PROVIDER_REJECTED';
  }

  private errorMessage(code: string | undefined, status: number) {
    const messages: Record<string, string> = {
      '20': 'SMS metni Netgsm kurallarına uygun değil.',
      '30': 'Netgsm API kullanıcı bilgileri veya erişim izni geçerli değil.',
      '40': 'Netgsm gönderici adı geçerli değil.',
      '41': 'Netgsm gönderici adı geçerli değil.',
      '50': 'SMS alıcı numarası geçerli değil.',
      '51': 'SMS alıcı numarası geçerli değil.',
      '52': 'SMS alıcı numarası geçerli değil.',
      '60': 'Netgsm hesabında OTP SMS paketi bulunmuyor.',
      '70': 'Netgsm SMS isteği geçerli değil.',
      '100': 'Netgsm geçici bir sistem hatası döndürdü.',
    };
    return (
      messages[code ?? ''] ??
      `Netgsm SMS isteğini reddetti (${code || status}).`
    );
  }
}
