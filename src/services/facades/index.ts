import React, {createContext, useContext, useMemo} from 'react';
import {AuthFacadeImpl, type IAuthFacade} from './AuthFacade';
import {CallFacadeImpl, type ICallFacade} from './CallFacade';
import {ChatFacadeImpl, type IChatFacade} from './ChatFacade';
import {
  NotificationFacadeImpl,
  type INotificationFacade,
} from './NotificationFacade';
import {type FacadeConfig} from './types';

export interface Facades {
  authFacade: IAuthFacade;
  chatFacade: IChatFacade;
  callFacade: ICallFacade;
  notificationFacade: INotificationFacade;
}

export interface FacadeProviderProps {
  children: React.ReactNode;
  config?: FacadeConfig;
  facades?: Partial<Facades>;
}

const createDefaultFacades = (config?: FacadeConfig): Facades => ({
  authFacade: new AuthFacadeImpl(config),
  chatFacade: new ChatFacadeImpl(config),
  callFacade: new CallFacadeImpl(config),
  notificationFacade: new NotificationFacadeImpl(config),
});

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
