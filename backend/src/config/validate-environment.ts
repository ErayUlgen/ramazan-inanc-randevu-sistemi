type Environment = Record<string, string | undefined>;

const PRODUCTION_SECRETS = [
  'ADMIN_SESSION_SECRET',
  'CUSTOMER_SESSION_SECRET',
  'CUSTOMER_AUTH_OTP_SECRET',
  'BOOKING_ACCESS_SESSION_SECRET',
  'BOOKING_ACCESS_OTP_SECRET',
  'ACTION_TOKEN_SECRET',
] as const;

const ALLOWED_SMS_PROVIDERS = new Set(['http', 'netgsm']);

function isUnsafeProductionSecret(value: string | undefined): boolean {
  const normalized = value?.trim() ?? '';
  const lower = normalized.toLowerCase();
  const placeholderMarkers = ['replace', 'change', 'example', 'placeholder'];

  return (
    normalized.length < 32 ||
    placeholderMarkers.some((marker) => lower.includes(marker)) ||
    new Set(normalized).size < 8
  );
}

export function validateEnvironment(environment: Environment): Environment {
  const production = environment.NODE_ENV === 'production';
  const required = ['DATABASE_URL'];
  if (production) {
    required.push(
      'FRONTEND_URL',
      'PUBLIC_APP_URL',
      'SMS_PROVIDER',
      ...PRODUCTION_SECRETS,
    );
  }

  const missing = required.filter((key) => !environment[key]?.trim());
  if (missing.length) {
    throw new Error(`Eksik zorunlu ortam değişkenleri: ${missing.join(', ')}`);
  }

  if (production) {
    const weakSecrets = PRODUCTION_SECRETS.filter((key) =>
      isUnsafeProductionSecret(environment[key]),
    );
    if (weakSecrets.length) {
      throw new Error(
        `Production secret değerleri en az 32 karakter, tahmin edilemez ve benzersiz olmalıdır: ${weakSecrets.join(', ')}`,
      );
    }

    const smsProvider = environment.SMS_PROVIDER?.trim().toLowerCase() ?? '';
    if (!ALLOWED_SMS_PROVIDERS.has(smsProvider)) {
      throw new Error(
        'Production SMS_PROVIDER yalnızca "http" veya "netgsm" olabilir.',
      );
    }

    if (environment.ALLOW_INSECURE_PRODUCTION_URLS !== 'true') {
      const insecureUrls = ['FRONTEND_URL', 'PUBLIC_APP_URL'].filter((key) =>
        environment[key]
          ?.split(',')
          .map((value) => value.trim())
          .some((value) => value && !value.startsWith('https://')),
      );
      if (insecureUrls.length) {
        throw new Error(
          `Production URL değerleri HTTPS olmalıdır: ${insecureUrls.join(', ')}`,
        );
      }
    }
  }

  if (
    production &&
    environment.SMS_PROVIDER === 'http' &&
    (!environment.SMS_API_URL || !environment.SMS_API_KEY)
  ) {
    throw new Error(
      'HTTP SMS sağlayıcısı SMS_API_URL ve SMS_API_KEY gerektirir.',
    );
  }
  if (
    production &&
    environment.SMS_PROVIDER === 'netgsm' &&
    (!environment.NETGSM_USERCODE ||
      !environment.NETGSM_PASSWORD ||
      !environment.NETGSM_HEADER)
  ) {
    throw new Error(
      'Netgsm için NETGSM_USERCODE, NETGSM_PASSWORD ve NETGSM_HEADER gereklidir.',
    );
  }
  if (
    production &&
    (environment.ADMIN_API_KEY ||
      environment.ALLOW_ADMIN_API_KEY_HEADER === 'true')
  ) {
    throw new Error(
      'Production ortamında legacy ADMIN_API_KEY erişimi açık bırakılamaz.',
    );
  }
  return environment;
}
