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
import {CorridaFacadeImpl, type ICorridaFacade} from './CorridaFacade';
import {PesquisaFacadeImpl, type IPesquisaFacade} from './PesquisaFacade';
import {
  CartografiaFacadeImpl,
  type ICartografiaFacade,
} from './CartografiaFacade';
import {RealtimeFacadeImpl, type IRealtimeFacade} from './RealtimeFacade';
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
  corridaFacade: ICorridaFacade;
  pesquisaFacade: IPesquisaFacade;
  cartografiaFacade: ICartografiaFacade;
  realtimeFacade: IRealtimeFacade;
}

export interface FacadeProviderProps {
  children: React.ReactNode;
  config?: FacadeConfig;
  facades?: Partial<Facades>;
  /** Optional token getter — if omitted, facades read from Redux via store import. */
  getToken?: () => string | null;
  /**
   * Optional async token refresher for the realtime transport's 401 recovery.
   * Called by the WebSocket client when the server rejects the connection with 401.
   * Must return a fresh access token (already persisted to Redux), or null on failure.
   */
  refreshToken?: () => Promise<string | null>;
}

const createDefaultFacades = (
  config?: FacadeConfig,
  getToken?: () => string | null,
  refreshToken?: () => Promise<string | null>,
): Facades => {
  const resolvedConfig: FacadeConfig = {
    ...config,
    mockMode: config?.mockMode ?? ENV.mockMode,
    apiBaseUrl: config?.apiBaseUrl ?? ENV.apiUrl,
  };

  if (resolvedConfig.mockMode) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {AuthFacadeMock} =
      require('./mock/AuthFacadeMock') as typeof import('./mock/AuthFacadeMock');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {ChatFacadeMock} =
      require('./mock/ChatFacadeMock') as typeof import('./mock/ChatFacadeMock');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {CallFacadeMock} =
      require('./mock/CallFacadeMock') as typeof import('./mock/CallFacadeMock');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {NotificationFacadeMock} =
      require('./mock/NotificationFacadeMock') as typeof import('./mock/NotificationFacadeMock');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {RunFacadeMock} =
      require('./mock/RunFacadeMock') as typeof import('./mock/RunFacadeMock');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {PesquisaFacadeMock} =
      require('./mock/PesquisaFacadeMock') as typeof import('./mock/PesquisaFacadeMock');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {CartografiaFacadeMock} =
      require('./mock/CartografiaFacadeMock') as typeof import('./mock/CartografiaFacadeMock');

    return {
      authFacade: new AuthFacadeMock(),
      chatFacade: new ChatFacadeMock(),
      callFacade: new CallFacadeMock(),
      notificationFacade: new NotificationFacadeMock(),
      runFacade: new RunFacadeMock(),
      servidoresFacade: new ServidoresFacadeImpl(resolvedConfig),
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      frotaFacade: (() => {
        const {FrotaFacadeMock} =
          require('./mock/FrotaFacadeMock') as typeof import('./mock/FrotaFacadeMock');
        return new FrotaFacadeMock();
      })(),
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      corridaFacade: (() => {
        const {CorridaFacadeMock} =
          require('./mock/CorridaFacadeMock') as typeof import('./mock/CorridaFacadeMock');
        return new CorridaFacadeMock() as unknown as ICorridaFacade;
      })(),
      pesquisaFacade: new PesquisaFacadeMock(),
      cartografiaFacade: new CartografiaFacadeMock(),
      realtimeFacade: new RealtimeFacadeImpl({mockMode: true}),
    };
  }

  return {
    authFacade: new AuthFacadeImpl(resolvedConfig),
    chatFacade: new ChatFacadeImpl(resolvedConfig),
    callFacade: new CallFacadeImpl(resolvedConfig),
    notificationFacade: new NotificationFacadeImpl(resolvedConfig),
    runFacade: new RunFacadeImpl(resolvedConfig),
    servidoresFacade: new ServidoresFacadeImpl(resolvedConfig),
    frotaFacade: new FrotaFacadeImpl({...resolvedConfig, getToken}),
    corridaFacade: new CorridaFacadeImpl({...resolvedConfig, getToken}),
    pesquisaFacade: new PesquisaFacadeImpl({...resolvedConfig, getToken}),
    cartografiaFacade: new CartografiaFacadeImpl({...resolvedConfig, getToken}),
    realtimeFacade: new RealtimeFacadeImpl({
      mockMode: resolvedConfig.mockMode,
      wsBaseUrl: ENV.wsUrl,
      refreshToken,
    }),
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
  getToken,
  refreshToken,
}: FacadeProviderProps): React.JSX.Element => {
  const resolvedFacades = useMemo(() => {
    const defaults = createDefaultFacades(config, getToken, refreshToken);
    return {
      ...defaults,
      ...facades,
    };
  }, [config, facades, getToken, refreshToken]);

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
export * from './CorridaFacade';
export * from './PesquisaFacade';
export * from './CartografiaFacade';
export * from './RealtimeFacade';
