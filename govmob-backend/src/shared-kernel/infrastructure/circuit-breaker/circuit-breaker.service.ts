import { Injectable, Logger } from '@nestjs/common';
import { CircuitOpenError } from '../../errors/circuit-open.error';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitContext {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  nextAttemptAt: number;
}

interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly contexts = new Map<string, CircuitContext>();
  private readonly globalOptions: Required<CircuitBreakerOptions> = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
  };

  public async execute<T>(
    key: string,
    fn: () => Promise<T>,
    fallback?: () => Promise<T>,
    options?: CircuitBreakerOptions,
  ): Promise<T> {
    const context = this.getContext(key);
    const now = Date.now();
    const config = { ...this.globalOptions, ...options };

    if (context.state === CircuitState.OPEN) {
      if (now < context.nextAttemptAt) {
        if (fallback) {
          return fallback();
        }
        throw new CircuitOpenError(`Circuit is OPEN for ${key}`);
      }
      this.transitionTo(key, CircuitState.HALF_OPEN);
    }

    try {
      // Executa a funcão
      const result = await fn();

      if (context.state === CircuitState.HALF_OPEN) {
        context.successCount += 1;
        if (context.successCount >= config.successThreshold) {
          this.transitionTo(key, CircuitState.CLOSED);
        }
      } else {
        context.failureCount = 0; // reset failures on success
      }

      return result;
    } catch (error) {
      context.failureCount += 1;

      const shouldOpen =
        context.state === CircuitState.HALF_OPEN ||
        context.failureCount >= config.failureThreshold;

      if (shouldOpen) {
        context.nextAttemptAt = Date.now() + config.timeout;
        this.transitionTo(key, CircuitState.OPEN);
      }

      if (fallback) {
        return fallback();
      }
      throw error;
    }
  }

  public transitionTo(key: string, state: CircuitState): void {
    const context = this.getContext(key);
    context.state = state;

    if (state === CircuitState.OPEN) {
      context.successCount = 0;
    } else if (state === CircuitState.CLOSED) {
      context.failureCount = 0;
      context.successCount = 0;
    } else if (state === CircuitState.HALF_OPEN) {
      context.successCount = 0;
    }
    this.logger.debug(`Circuit '${key}' transitioned to ${state}`);
  }

  public getState(key: string): CircuitState {
    return this.getContext(key).state;
  }

  private getContext(key: string): CircuitContext {
    let context = this.contexts.get(key);
    if (!context) {
      context = {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
        nextAttemptAt: 0,
      };
      this.contexts.set(key, context);
    }
    return context;
  }
}
