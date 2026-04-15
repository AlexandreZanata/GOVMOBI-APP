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
import {type FacadeConfig} from './types';
import {ENV} from '../../config/env';
import {AuthFacadeMock} from './mock/AuthFacadeMock';
import {ChatFacadeMock} from './mock/ChatFacadeMock';
import {CallFacadeMock} from './mock/CallFacadeMock';
import {NotificationFacadeMock} from './mock/NotificationFacadeMock';
import {RunFacadeMock} from './mock/RunFacadeMock';

export interface Facades {
  authFacade: IAuthFacade;
  chatFacade: IChatFacade;
  callFacade: ICallFacade;
  notificationFacade: INotificationFacade;
  runFacade: IRunFacade;
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
    return {
      authFacade: new AuthFacadeMock(),
      chatFacade: new ChatFacadeMock(),
      callFacade: new CallFacadeMock(),
      notificationFacade: new NotificationFacadeMock(),
      runFacade: new RunFacadeMock(),
    };
  }

  return {
    authFacade: new AuthFacadeImpl(resolvedConfig),
    chatFacade: new ChatFacadeImpl(resolvedConfig),
    callFacade: new CallFacadeImpl(resolvedConfig),
    notificationFacade: new NotificationFacadeImpl(resolvedConfig),
    runFacade: new RunFacadeImpl(resolvedConfig),
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
export * from './mock/AuthFacadeMock';
export * from './mock/ChatFacadeMock';
export * from './mock/CallFacadeMock';
export * from './mock/NotificationFacadeMock';
export * from './mock/RunFacadeMock';
