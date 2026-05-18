import { ConfigService } from '@nestjs/config';
import { createPinoHttpOptions } from './pino-http-options';

function makeConfig(entries: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn((key: string, fallback?: string) => entries[key] ?? fallback),
  } as unknown as ConfigService;
}

describe('createPinoHttpOptions', () => {
  it('redacts sensitive request headers from structured logs', () => {
    const options = createPinoHttpOptions(
      makeConfig({ NODE_ENV: 'production', LOG_LEVEL: 'info' }),
    );

    expect(options.redact).toEqual(
      expect.objectContaining({
        censor: '[Redacted]',
        paths: expect.arrayContaining([
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers.proxy-authorization',
          'req.headers.x-api-key',
        ]),
      }),
    );
  });

  it('keeps pretty transport disabled in production', () => {
    const options = createPinoHttpOptions(
      makeConfig({ NODE_ENV: 'production', LOG_LEVEL: 'debug' }),
    );

    expect(options.level).toBe('debug');
    expect(options.transport).toBeUndefined();
  });
});
