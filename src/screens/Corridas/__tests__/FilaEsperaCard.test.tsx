/**
 * @fileoverview POC tests for FilaEsperaCard.
 *
 * Covers:
 * 1. Loading state — shows loading banner with spinner
 * 2. Null posicaoFila — renders nothing
 * 3. Accepted ride — renders nothing
 * 4. Active dispatch cycle (naFilaDeEspera: false) — shows dispatch banner
 * 5. In queue (naFilaDeEspera: true) — shows position, total, wait, and estimate
 */
import React from 'react';
import {render, screen} from '@testing-library/react-native';
import {I18nextProvider} from 'react-i18next';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';

import {FilaEsperaCard} from '../FilaEsperaCard';
import {i18n} from '../../../i18n';
import uiReducer from '../../../store/slices/uiSlice';
import type {PosicaoFilaResponse} from '../../../types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const buildStore = () =>
  configureStore({
    reducer: {ui: uiReducer},
    preloadedState: {
      ui: {
        themeMode: 'light' as const,
        language: 'pt-BR' as const,
        isConnected: true,
        globalLoading: false,
        toasts: [],
      },
    },
  });

const renderCard = (props: React.ComponentProps<typeof FilaEsperaCard>) => {
  const store = buildStore();
  return render(
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <FilaEsperaCard {...props} />
      </I18nextProvider>
    </Provider>,
  );
};

const makeFilaResponse = (overrides: Partial<PosicaoFilaResponse> = {}): PosicaoFilaResponse => ({
  corridaId: 'corrida-001',
  status: 'aguardando_aceite',
  naFilaDeEspera: true,
  posicaoNaFila: 2,
  totalNaFila: 5,
  tempoEsperaSeg: 180,
  estimativaAtendimentoSeg: 120,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FilaEsperaCard', () => {
  it('1. shows loading banner when isLoading=true', () => {
    renderCard({posicaoFila: null, isLoading: true});
    expect(screen.getByTestId('fila-loading')).toBeTruthy();
  });

  it('2. renders nothing when posicaoFila is null', () => {
    const {toJSON} = renderCard({posicaoFila: null});
    expect(toJSON()).toBeNull();
  });

  it('3. renders nothing when ride is already accepted', () => {
    const {toJSON} = renderCard({
      posicaoFila: makeFilaResponse({status: 'aceita', naFilaDeEspera: false}),
    });
    expect(toJSON()).toBeNull();
  });

  it('4. shows dispatch banner when not in queue but still aguardando_aceite', () => {
    renderCard({
      posicaoFila: makeFilaResponse({
        naFilaDeEspera: false,
        posicaoNaFila: null,
        totalNaFila: null,
        tempoEsperaSeg: null,
        estimativaAtendimentoSeg: null,
      }),
    });
    expect(screen.getByTestId('fila-dispatch-banner')).toBeTruthy();
  });

  it('5. shows queue card with position, total, wait, and estimate when in queue', () => {
    renderCard({posicaoFila: makeFilaResponse()});

    expect(screen.getByTestId('fila-espera-card')).toBeTruthy();
    expect(screen.getByTestId('fila-posicao')).toBeTruthy();
    expect(screen.getByTestId('fila-total')).toBeTruthy();
    expect(screen.getByTestId('fila-espera')).toBeTruthy();
    expect(screen.getByTestId('fila-estimativa')).toBeTruthy();

    // Position value
    expect(screen.getByText('2')).toBeTruthy();
    // Total value
    expect(screen.getByText('5')).toBeTruthy();
    // Wait in minutes: ceil(180/60) = 3
    expect(screen.getByText('3')).toBeTruthy();
  });
});
