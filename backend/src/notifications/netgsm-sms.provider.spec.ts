/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NetgsmSmsProvider } from './netgsm-sms.provider';

describe('NetgsmSmsProvider', () => {
  const originalEnvironment = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.NETGSM_USERCODE = '8500000000';
    process.env.NETGSM_PASSWORD = 'secret';
    process.env.NETGSM_HEADER = 'RAMAZAN';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnvironment };
  });

  it('uses the OTP endpoint, normalizes the phone and maps an accepted response', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        new Response('<code>0</code><jobID>12345</jobID>', { status: 200 }),
      );
    global.fetch = fetchMock;
    const provider = new NetgsmSmsProvider();

    const result = await provider.send({
      to: '+90 555 111 22 33',
      message: 'Ramazan Inanc dogrulama kodunuz: 111111.',
      idempotencyKey: 'otp:test',
      kind: 'OTP',
    });

    expect(result).toEqual(
      expect.objectContaining({
        accepted: true,
        provider: 'netgsm',
        providerMessageId: '12345',
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.netgsm.com.tr/sms/send/otp',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('<no>5551112233</no>'),
      }),
    );
  });

  it('rejects non-ASCII OTP copy before making a network request', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;
    const provider = new NetgsmSmsProvider();

    await expect(
      provider.send({
        to: '+905551112233',
        message: 'Doğrulama kodunuz: 111111',
        idempotencyKey: 'otp:non-ascii',
        kind: 'OTP',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        accepted: false,
        errorCode: 'OTP_NON_ASCII',
        retryable: false,
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps temporary Netgsm failures as retryable', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response('<code>100</code>', { status: 503 }));
    const provider = new NetgsmSmsProvider();

    await expect(
      provider.send({
        to: '+905551112233',
        message: 'Randevu bilginiz guncellendi.',
        idempotencyKey: 'transactional:test',
        kind: 'TRANSACTIONAL',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        accepted: false,
        retryable: true,
        errorCode: 'PROVIDER_ERROR',
      }),
    );
  });
});
