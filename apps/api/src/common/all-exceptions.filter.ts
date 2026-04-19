import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

interface MappedError {
  status: number;
  message: string;
  code?: string;
}

function mapPrismaKnownError(
  err: Prisma.PrismaClientKnownRequestError,
): MappedError {
  switch (err.code) {
    case 'P2002':
      return { status: HttpStatus.CONFLICT, message: 'Unique constraint violation', code: err.code };
    case 'P2003':
      return { status: HttpStatus.CONFLICT, message: 'Foreign key constraint violation', code: err.code };
    case 'P2025':
      return { status: HttpStatus.NOT_FOUND, message: 'Record not found', code: err.code };
    case 'P1001':
    case 'P1002':
    case 'P1017':
      return { status: HttpStatus.SERVICE_UNAVAILABLE, message: 'Database unavailable', code: err.code };
    default:
      return { status: HttpStatus.BAD_REQUEST, message: 'Database request error', code: err.code };
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(AllExceptionsFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const correlationId =
      (req?.headers?.['x-correlation-id'] as string | undefined) ??
      (req as { id?: string })?.id;

    // Known HttpException passes through untouched.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return res.status(status).json(exception.getResponse());
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = mapPrismaKnownError(exception);
      this.logger.warn(
        { correlationId, prismaCode: mapped.code, meta: exception.meta },
        `Prisma error ${mapped.code}: ${mapped.message}`,
      );
      return res.status(mapped.status).json({
        statusCode: mapped.status,
        message: mapped.message,
        code: mapped.code,
      });
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      this.logger.error(
        { correlationId, errorCode: exception.errorCode },
        `Prisma init error: ${exception.message}`,
      );
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database unavailable',
      });
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.warn({ correlationId }, `Prisma validation error: ${exception.message}`);
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid request',
      });
    }

    // Unknown — log with stack (server-side only) and return generic 500.
    const err = exception as Error;
    this.logger.error(
      { correlationId, err: { message: err?.message, stack: err?.stack, name: err?.name } },
      'Unhandled exception',
    );
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      ...(correlationId ? { correlationId } : {}),
    });
  }
}
