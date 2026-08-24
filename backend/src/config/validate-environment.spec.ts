import { validateEnvironment } from './validate-environment';

const productionEnvironment = (): Record<string, string> => ({
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://example.invalid/database',
  FRONTEND_URL: 'https://randevu.example.com',
  PUBLIC_APP_URL: 'https://randevu.example.com',
  ADMIN_SESSION_SECRET: 'Adm1n-Sess!on_9qL7#nB4$wR8@xT2%zK6',
  CUSTOMER_SESSION_SECRET: 'Cust0mer-Sess!on_6mQ9#vH3$yP7@kF2',
  CUSTOMER_AUTH_OTP_SECRET: 'Cust0mer-OTP_4rN8!jW2#sD7$uL9@cX5',
  BOOKING_ACCESS_SESSION_SECRET: 'B00king-Sess_3pV7!bK9#tM4$yR8@qH2',
  BOOKING_ACCESS_OTP_SECRET: 'B00king-OTP_8dF2!xC6#nJ9$wQ4@vL7',
  ACTION_TOKEN_SECRET: 'Act!on-Token_5gT9#rP3$kX7@mN2!zW8',
  SMS_PROVIDER: 'netgsm',
  NETGSM_USERCODE: 'configured',
  NETGSM_PASSWORD: 'configured',
  NETGSM_HEADER: 'configured',
  ALLOW_ADMIN_API_KEY_HEADER: 'false',
});

describe('validateEnvironment', () => {
  it('accepts a complete production configuration', () => {
    const environment = productionEnvironment();
    expect(validateEnvironment(environment)).toBe(environment);
  });

  it('rejects development SMS in production', () => {
    const environment = {
      ...productionEnvironment(),
      SMS_PROVIDER: 'development',
    };
    expect(() => validateEnvironment(environment)).toThrow(
      'Production SMS_PROVIDER',
    );
  });

  it('rejects short production secrets', () => {
    const environment = {
      ...productionEnvironment(),
      CUSTOMER_SESSION_SECRET: 'too-short',
    };
    expect(() => validateEnvironment(environment)).toThrow(
      'CUSTOMER_SESSION_SECRET',
    );
  });

  it('rejects long but predictable placeholder secrets', () => {
    const environment = {
      ...productionEnvironment(),
      ACTION_TOKEN_SECRET: 'REPLACE_WITH_A_LONG_RANDOM_ACTION_TOKEN_SECRET',
    };
    expect(() => validateEnvironment(environment)).toThrow(
      'ACTION_TOKEN_SECRET',
    );
  });

  it('rejects insecure public URLs unless explicitly allowed', () => {
    const environment = {
      ...productionEnvironment(),
      FRONTEND_URL: 'http://localhost:5173',
    };
    expect(() => validateEnvironment(environment)).toThrow('HTTPS');
  });

  it('keeps local development lightweight', () => {
    const environment = {
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://localhost/local',
    };
    expect(validateEnvironment(environment)).toBe(environment);
  });
});
