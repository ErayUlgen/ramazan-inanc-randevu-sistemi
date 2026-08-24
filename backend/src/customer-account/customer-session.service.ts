import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60_000;
const TOUCH_INTERVAL_MS = 5 * 60_000;

export type CustomerIdentity = {
  sessionId: string;
  customerId: string;
  expiresAt: string;
  customer: {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    smsNotificationsEnabled: boolean;
  };
};

@Injectable()
export class CustomerSessionService {
  readonly cookieName = 'ri_customer_session';

  constructor(private readonly prisma: PrismaService) {}

  async create(
    customerId: string,
    context: { ip?: string; userAgent?: string },
    database: Pick<
      Prisma.TransactionClient,
      'customerSession' | 'customer' | 'booking'
    > = this.prisma,
  ) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    const session = await database.customerSession.create({
      data: {
        customerId,
        tokenHash: this.hash(token),
        ipHash: context.ip ? this.hash(context.ip) : null,
        userAgentHash: context.userAgent ? this.hash(context.userAgent) : null,
        expiresAt,
      },
      include: { customer: true },
    });
    await database.customer.update({
      where: { id: customerId },
      data: { lastLoginAt: new Date() },
    });
    await database.booking.updateMany({
      where: {
        customerId: null,
        customerPhoneSnapshot: session.customer.phone,
      },
      data: { customerId },
    });
    return {
      token,
      expiresAt: expiresAt.toISOString(),
      identity: this.identity(session),
    };
  }

  async verify(token: string | undefined): Promise<CustomerIdentity> {
    if (!token) throw this.unauthorized();
    const session = await this.prisma.customerSession.findUnique({
      where: { tokenHash: this.hash(token) },
      include: { customer: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw this.unauthorized();
    }
    if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.prisma.customerSession.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      });
    }
    return this.identity(session);
  }

  async revoke(token: string | undefined) {
    if (!token) return;
    await this.prisma.customerSession.updateMany({
      where: { tokenHash: this.hash(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  sessionCookie(token: string) {
    return [
      `${this.cookieName}=${token}`,
      'Path=/api',
      'HttpOnly',
      'SameSite=Strict',
      `Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}`,
      ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
    ].join('; ');
  }

  clearCookie() {
    return [
      `${this.cookieName}=`,
      'Path=/api',
      'HttpOnly',
      'SameSite=Strict',
      'Max-Age=0',
      ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
    ].join('; ');
  }

  readCookie(header: string | undefined) {
    if (!header) return undefined;
    for (const part of header.split(';')) {
      const separator = part.indexOf('=');
      if (separator < 0) continue;
      if (part.slice(0, separator).trim() === this.cookieName) {
        return part.slice(separator + 1).trim();
      }
    }
    return undefined;
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private identity(session: {
    id: string;
    customerId: string;
    expiresAt: Date;
    customer: {
      id: string;
      fullName: string;
      phone: string;
      email: string | null;
      smsNotificationsEnabled: boolean;
    };
  }): CustomerIdentity {
    return {
      sessionId: session.id,
      customerId: session.customerId,
      expiresAt: session.expiresAt.toISOString(),
      customer: {
        id: session.customer.id,
        fullName: session.customer.fullName,
        phone: session.customer.phone,
        email: session.customer.email,
        smsNotificationsEnabled: session.customer.smsNotificationsEnabled,
      },
    };
  }

  private unauthorized() {
    return new UnauthorizedException('Müşteri oturumu geçerli değil.');
  }
}
