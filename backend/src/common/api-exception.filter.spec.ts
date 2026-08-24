import type { ArgumentsHost } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';

describe('ApiExceptionFilter', () => {
  it('preserves safe parser status without exposing its raw message', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          correlationId: 'correlation-1',
          method: 'POST',
          path: '/api/example',
          originalUrl: '/api/example',
        }),
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;

    new ApiExceptionFilter().catch(
      {
        status: 413,
        message: 'request entity too large: internal parser detail',
      },
      host,
    );

    expect(status).toHaveBeenCalledWith(413);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 413,
        message: 'İstek içeriği izin verilen boyutu aşıyor.',
        correlationId: 'correlation-1',
      }),
    );
  });
});
