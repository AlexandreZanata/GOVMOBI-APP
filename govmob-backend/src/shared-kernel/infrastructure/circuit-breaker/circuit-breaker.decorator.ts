import { CircuitOpenError } from '../../errors/circuit-open.error';

enum CircuitState {
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

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  fallback?: (...args: any[]) => any;
}

const contexts = new WeakMap<object, Map<string | symbol, CircuitContext>>();

function getContext(
  target: object,
  propertyKey: string | symbol,
): CircuitContext {
  const targetMap =
    contexts.get(target) ?? new Map<string | symbol, CircuitContext>();
  if (!contexts.has(target)) {
    contexts.set(target, targetMap);
  }

  const current = targetMap.get(propertyKey);
  if (current) return current;

  const initial: CircuitContext = {
    state: CircuitState.CLOSED,
    failureCount: 0,
    successCount: 0,
    nextAttemptAt: 0,
  };

  targetMap.set(propertyKey, initial);
  return initial;
}

export function CircuitBreaker(
  options: CircuitBreakerOptions = {},
): MethodDecorator {
  const {
    failureThreshold = 5,
    successThreshold = 2,
    timeout = 60000,
    fallback,
  } = options;

  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => {
    const original = descriptor.value as
      | ((...args: any[]) => Promise<any>)
      | undefined;

    if (!original) {
      throw new Error('CircuitBreaker so pode ser aplicado em metodos');
    }

    descriptor.value = async function (...args: any[]): Promise<any> {
      const context = getContext(this as object, propertyKey);
      const now = Date.now();

      if (context.state === CircuitState.OPEN) {
        if (now < context.nextAttemptAt) {
          if (fallback) {
            return await fallback(...args);
          }
          throw new CircuitOpenError();
        }

        context.state = CircuitState.HALF_OPEN;
        context.successCount = 0;
      }

      try {
        const result = await Promise.resolve(
          original.call(this as object, ...args),
        );

        if (context.state === CircuitState.HALF_OPEN) {
          context.successCount += 1;

          if (context.successCount >= successThreshold) {
            context.state = CircuitState.CLOSED;
            context.failureCount = 0;
            context.successCount = 0;
          }
        } else {
          context.failureCount = 0;
        }

        return result;
      } catch (error: any) {
        context.failureCount += 1;

        const shouldOpen =
          context.state === CircuitState.HALF_OPEN ||
          context.failureCount >= failureThreshold;

        if (shouldOpen) {
          context.state = CircuitState.OPEN;
          context.nextAttemptAt = Date.now() + timeout;
          context.successCount = 0;
        }

        if (fallback) {
          return await fallback(...args);
        }

        throw error;
      }
    };

    return descriptor;
  };
}
