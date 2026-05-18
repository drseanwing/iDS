import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Options as PinoHttpOptions } from 'pino-http';

const REDACTED_HEADER_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers.proxy-authorization',
  'req.headers.x-api-key',
];

export function createPinoHttpOptions(config: ConfigService): PinoHttpOptions {
  return {
    level: config.get('LOG_LEVEL', 'info'),
    redact: {
      paths: REDACTED_HEADER_PATHS,
      censor: '[Redacted]',
    },
    transport:
      config.get('NODE_ENV') !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    genReqId: (req: any) =>
      req.headers['x-correlation-id'] || randomUUID(),
    customProps: () => ({
      context: 'HTTP',
    }),
  };
}
