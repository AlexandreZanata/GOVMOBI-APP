/**
 * @fileoverview Module implementation for utils/logger.
 */
import {isDev} from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured logger that suppresses output in production builds.
 * Use this instead of console.log/warn/error throughout the app.
 *
 * @example
 * logger.info('AuthFacade', 'login success', { userId });
 * logger.error('ChatFacade', 'sendMessage failed', error);
 */
const createLogger = () => {
  const log = (level: LogLevel, tag: string, message: string, data?: unknown) => {
    if (!isDev && level !== 'error') return;

    const prefix = `[${tag}]`;
    switch (level) {
      case 'debug':
        console.debug(prefix, message, data ?? '');
        break;
      case 'info':
        console.info(prefix, message, data ?? '');
        break;
      case 'warn':
        console.warn(prefix, message, data ?? '');
        break;
      case 'error':
        console.error(prefix, message, data ?? '');
        break;
    }
  };

  return {
    debug: (tag: string, message: string, data?: unknown) => log('debug', tag, message, data),
    info: (tag: string, message: string, data?: unknown) => log('info', tag, message, data),
    warn: (tag: string, message: string, data?: unknown) => log('warn', tag, message, data),
    error: (tag: string, message: string, data?: unknown) => log('error', tag, message, data),
  };
};

export const logger = createLogger();
