/**
 * @fileoverview Public module exports for services/facades/index.
 */
import React, {createContext, useContext, useMemo} from 'react';
import {AuthFacadeImpl, type IAuthFacade} from './AuthFacade';
import {CallFacadeImpl, type ICallFacade} from './CallFacade';
import {ChatFacadeImpl, type IChatFacade} from './ChatFacade';
import {
  NotificationFacadeImpl,
  type INotificationFacade,
} from './NotificationFacade';
import {RunFacadeImpl, type IRunFacade} from './RunFacade';
import {ServidoresFacadeImpl, type IServidoresFacade} from './ServidoresFacade';
import {FrotaFacadeImpl, type IFrotaFacade} from './FrotaFacade';
import {type FacadeConfig} from './types';
import {ENV} from '../../config/env';

export interface Facades {
  authFacade: IAuthFacade;
  chatFacade: IChatFacade;
  callFacade: ICallFacade;
  notificationFacade: INotificationFacade;
  runFacade: IRunFacade;
  servidoresFacade: IServidoresFacade;
  frotaFacade: IFrotaFacade;
}

export interface FacadeProviderProps {
  children: React.ReactNode;
  config?: FacadeConfig;
  facades?: Partial<Facades>;
}

const createDefaultFacades = (config?: FacadeConfig): Facades => {
  const resolvedConfig: FacadeConfig = {
    ...config,
    mockMode: config?.mockMode ?? ENV.mockMode,
    apiBaseUrl: config?.apiBaseUrl ?? ENV.apiUrl,
  };

  if (resolvedConfig.mockMode) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {AuthFacadeMock} = require('./mock/AuthFacadeMock') as typeof import('./mock/AuthFacadeMock');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {ChatFacadeMock} = require('./mock/ChatFacadeMock') as typeof import('./mock/ChatFacadeMock');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {CallFacadeMock} = require('./mock/CallFacadeMock') as typeof import('./mock/CallFacadeMock');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {NotificationFacadeMock} = require('./mock/NotificationFacadeMock') as typeof import('./mock/NotificationFacadeMock');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {RunFacadeMock} = require('./mock/RunFacadeMock') as typeof import('./mock/RunFacadeMock');

    return {
      authFacade: new AuthFacadeMock(),
      chatFacade: new ChatFacadeMock(),
      callFacade: new CallFacadeMock(),
      notificationFacade: new NotificationFacadeMock(),
      runFacade: new RunFacadeMock(),
      servidoresFacade: new ServidoresFacadeImpl(resolvedConfig),
      frotaFacade: new FrotaFacadeImpl(resolvedConfig),
    };
  }

  return {
    authFacade: new AuthFacadeImpl(resolvedConfig),
    chatFacade: new ChatFacadeImpl(resolvedConfig),
    callFacade: new CallFacadeImpl(resolvedConfig),
    notificationFacade: new NotificationFacadeImpl(resolvedConfig),
    runFacade: new RunFacadeImpl(resolvedConfig),
    servidoresFacade: new ServidoresFacadeImpl(resolvedConfig),
    frotaFacade: new FrotaFacadeImpl(resolvedConfig),
  };
};

const FacadeContext = createContext<Facades | null>(null);

/**
 * Provides service facades with dependency injection support.
 */
export const FacadeProvider = ({
  children,
  config,
  facades,
}: FacadeProviderProps): React.JSX.Element => {
  const resolvedFacades = useMemo(() => {
    const defaults = createDefaultFacades(config);
    return {
      ...defaults,
      ...facades,
    };
  }, [config, facades]);

  return React.createElement(
    FacadeContext.Provider,
    {value: resolvedFacades},
    children,
  );
};

FacadeProvider.displayName = 'FacadeProvider';

/**
 * Returns injected service facades from context.
 */
export const useFacades = (): Facades => {
  const context = useContext(FacadeContext);
  if (!context) {
    return createDefaultFacades();
  }
  return context;
};

export * from './types';
export * from './AuthFacade';
export * from './ChatFacade';
export * from './CallFacade';
export * from './NotificationFacade';
export * from './RunFacade';
export * from './ServidoresFacade';
export * from './FrotaFacade';
