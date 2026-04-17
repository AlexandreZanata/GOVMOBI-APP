import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError } from './domain.error';
import { NotFoundError } from './not-found.error';
import { ConflictError } from './conflict.error';
import { ForbiddenError } from './forbidden.error';
import { ValidationError } from './validation.error';
import { InvalidStateTransitionError } from './invalid-state-transition.error';
import { GeoBoundaryError } from './geo-boundary.error';
import { CircuitOpenError } from './circuit-open.error';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    this.logException(exception, request);

    const { status, body } = this.mapToHttpResponse(exception, request);

    response.status(status).json(body);
  }

  private mapToHttpResponse(
    exception: unknown,
    request: Request,
  ): { status: number; body: any } {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse: any = exception.getResponse();

      message = exceptionResponse?.message || exception.message;
      code = exceptionResponse?.error || 'HTTP_ERROR';
    } else if (exception instanceof DomainError) {
      // Configuração base de Domain Error (400 Bad Request)
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      code = exception.code;

      // Especializações
      if (exception instanceof NotFoundError) {
        status = HttpStatus.NOT_FOUND;
      } else if (exception instanceof ForbiddenError) {
        status = HttpStatus.FORBIDDEN;
      } else if (exception instanceof ConflictError) {
        status = HttpStatus.CONFLICT;
      } else if (exception instanceof ValidationError) {
        status = HttpStatus.UNPROCESSABLE_ENTITY; // 422
        details = { violations: exception.violations };
      } else if (exception instanceof InvalidStateTransitionError) {
        status = HttpStatus.CONFLICT; // 409
        details = {
          fromState: exception.fromState,
          toState: exception.toState,
        };
      } else if (exception instanceof GeoBoundaryError) {
        status = HttpStatus.UNPROCESSABLE_ENTITY; // 422
        details = { type: exception.tipo, context: exception.context };
      } else if (exception instanceof CircuitOpenError) {
        status = HttpStatus.SERVICE_UNAVAILABLE; // 503
      }
    } else if (exception instanceof Error) {
      // Outros Erros (500)
      message = exception.message;
    }

    return {
      status,
      body: {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        code,
        message,
        ...details,
      },
    };
  }

  private logException(exception: unknown, request: Request): void {
    const message =
      exception instanceof Error ? exception.message : 'Unknown error';
    const stack = exception instanceof Error ? exception.stack : '';

    // Don't spam logs for simple 404s (e.g. GET / during tests) — treat them as non-errors.
    if (
      exception instanceof HttpException &&
      exception.getStatus() === HttpStatus.NOT_FOUND
    ) {
      // Log at verbose level so it's available when debugging but won't print a stacktrace by default.
      this.logger.verbose(`[${request.method} ${request.url}] - ${message}`);
      return;
    }

    // For client errors (4xx) log without stacktrace; for server errors (5xx) log with stack.
    if (exception instanceof HttpException && exception.getStatus() < 500) {
      this.logger.warn(`[${request.method} ${request.url}] - ${message}`);
      return;
    }

    this.logger.error(`[${request.method} ${request.url}] - ${message}`, stack);
  }
}
