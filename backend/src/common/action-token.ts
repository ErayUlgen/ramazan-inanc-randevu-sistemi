import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from 'crypto';

export type ActionTokenPurpose = 'review';

export function createActionToken() {
  return randomBytes(32).toString('base64url');
}

export function buildActionToken(
  purpose: ActionTokenPurpose,
  resourceId: string,
  revision: number,
) {
  const secret =
    process.env.ACTION_TOKEN_SECRET ??
    process.env.CUSTOMER_SESSION_SECRET ??
    'development-action-token-secret';
  return createHmac('sha256', secret)
    .update(`${purpose}:${resourceId}:r${revision}`)
    .digest('base64url');
}

export function hashActionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function sealActionToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', actionEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function openActionToken(envelope: string | undefined) {
  if (!envelope) return null;
  const [version, rawIv, rawTag, rawEncrypted] = envelope.split('.');
  if (version !== 'v1' || !rawIv || !rawTag || !rawEncrypted) {
    return null;
  }
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      actionEncryptionKey(),
      Buffer.from(rawIv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(rawTag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(rawEncrypted, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

export function publicActionUrl(purpose: ActionTokenPurpose, token: string) {
  const base = (
    process.env.PUBLIC_APP_URL ??
    process.env.FRONTEND_URL?.split(',')[0] ??
    'http://127.0.0.1:5173'
  ).replace(/\/$/, '');
  return `${base}/degerlendir/${encodeURIComponent(token)}`;
}

function actionEncryptionKey() {
  const secret =
    process.env.ACTION_TOKEN_SECRET ??
    process.env.CUSTOMER_SESSION_SECRET ??
    'development-action-token-secret';
  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    throw new Error('ACTION_TOKEN_SECRET en az 32 karakter olmalıdır.');
  }
  return createHash('sha256').update(secret).digest();
}
