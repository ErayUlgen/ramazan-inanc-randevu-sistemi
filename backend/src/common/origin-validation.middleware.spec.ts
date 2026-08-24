import { ForbiddenException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { OriginValidationMiddleware } from './origin-validation.middleware';

function mockRequest(
  headers: Record<string, string | undefined>,
  overrides: Partial<Request> = {},
): Request {
  return {
    method: 'POST',
    path: '/customer-account/profile',
    headers,
    header(name: string) {
      return headers[name.toLowerCase()];
    },
    ...overrides,
  } as unknown as Request;
}

describe('OriginValidationMiddleware', () => {
  const originalEnvironment = process.env;
  const middleware = new OriginValidationMiddleware();
  const response = {} as Response;
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnvironment,
      NODE_ENV: 'production',
      FRONTEND_URL: 'https://randevu.example.com',
      PUBLIC_APP_URL: 'https://randevu.example.com',
    };
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('accepts a matching origin for an authenticated mutation', () => {
    middleware.use(
      mockRequest({
        cookie: 'ri_customer_session=token',
        origin: 'https://randevu.example.com',
      }),
      response,
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects a cross-site authenticated mutation', () => {
    expect(() =>
      middleware.use(
        mockRequest({
          cookie: 'ri_admin_session=token',
          origin: 'https://evil.example',
        }),
        response,
        next,
      ),
    ).toThrow(ForbiddenException);
  });

  it('does not block unauthenticated public requests', () => {
    middleware.use(
      mockRequest({ origin: 'https://external.example' }),
      response,
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});
