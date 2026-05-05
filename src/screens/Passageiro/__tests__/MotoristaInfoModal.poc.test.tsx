/**
 * @fileoverview POC test: MotoristaInfoModal driver name display.
 *
 * Covers:
 *  1. Loading state — spinner shown while fetching.
 *  2. Driver name from REST — shown when nomeMotorista prop is absent.
 *  3. Driver name from WS cache (nomeMotorista prop) — shown immediately, no REST fetch.
 *  4. Fallback text — shown when both prop and REST return null.
 *  5. Error state — shown when REST fetch fails.
 */
import React from 'react';
import {render, screen, waitFor} from '@testing-library/react-native';
import {MotoristaInfoModal} from '../components/MotoristaInfoModal';

// ── i18n mock ─────────────────────────────────────────────────────────────────
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'motorista.info.statusAceita': 'MOTORISTA ACEITOU',
        'motorista.info.fallbackNome': 'Motorista a caminho',
        'errors.unknownError': 'Erro desconhecido',
        'common.confirm': 'Confirmar',
      };
      return map[key] ?? key;
    },
  }),
}));

// ── Theme mock ────────────────────────────────────────────────────────────────
jest.mock('../../../theme', () => ({
  useTheme: () => ({
    colors: {primary: '#000'},
    design: {
      surface100: '#fff',
      surface200: '#f0f0f0',
      surface300: '#e0e0e0',
      textPrimary: '#000',
      textSecondary: '#666',
      textOnDark: '#fff',
      danger: '#f00',
    },
    spacing: new Proxy({}, {get: () => 8}),
    typography: {scale: new Proxy({}, {get: () => ({fontSize: 14})})},
    borderRadius: {radius: {xl: 12}},
    shadows: {card: {}},
  }),
}));

// ── Facade mocks ──────────────────────────────────────────────────────────────
const mockGetMotoristaById = jest.fn();
const mockGetServidorById = jest.fn();
const mockGetVeiculoById = jest.fn();

jest.mock('@services/facades', () => ({
  useFacades: () => ({
    frotaFacade: {
      getMotoristaById: mockGetMotoristaById,
      getVeiculoById: mockGetVeiculoById,
    },
    servidoresFacade: {
      getServidorById: mockGetServidorById,
    },
  }),
}));

jest.mock('../../../config/env', () => ({
  ENV: {apiUrl: 'http://192.168.1.5:3000'},
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
const defaultProps = {
  visible: true,
  motoristaId: 'mot-1',
  veiculoId: 'vei-1',
  corridaStatus: 'aceita' as const,
  onDismiss: jest.fn(),
};

describe('MotoristaInfoModal POC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMotoristaById.mockResolvedValue({data: {servidorId: 'srv-1'}, error: null});
    mockGetServidorById.mockResolvedValue({data: {nome: 'João Silva'}, error: null});
    mockGetVeiculoById.mockResolvedValue({data: {modelo: 'Corolla', ano: 2022, placa: 'ABC1D23'}, error: null});
  });

  it('1. shows loading spinner while fetching', async () => {
    // Never resolves — keeps loading state
    mockGetMotoristaById.mockReturnValue(new Promise(() => {}));

    render(<MotoristaInfoModal {...defaultProps} />);

    expect(screen.getByTestId('motorista-info-modal')).toBeTruthy();
    // Loading indicator should be present
    expect(screen.queryByText('João Silva')).toBeNull();
  });

  it('2. shows driver name from REST when nomeMotorista prop is absent', async () => {
    render(<MotoristaInfoModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeTruthy();
    });

    expect(mockGetMotoristaById).toHaveBeenCalledWith('mot-1');
    expect(mockGetServidorById).toHaveBeenCalledWith({id: 'srv-1'});
  });

  it('3. shows driver name from WS cache — still fetches servidor for photo when URL not passed', async () => {
    mockGetServidorById.mockResolvedValue({
      data: {nome: 'João Silva', fotoPerfilUrl: 'http://localhost:3000/media/x.jpg'},
      error: null,
    });

    render(<MotoristaInfoModal {...defaultProps} nomeMotorista="Maria Souza" />);

    await waitFor(() => {
      expect(screen.getByText('Maria Souza')).toBeTruthy();
    });

    await waitFor(() => {
      expect(mockGetServidorById).toHaveBeenCalledWith({id: 'srv-1'});
    });

    await waitFor(() => {
      expect(screen.getByTestId('motorista-avatar-image')).toBeTruthy();
    });

    await waitFor(() => {
      expect(mockGetVeiculoById).toHaveBeenCalledWith('vei-1');
    });
  });

  it('4. shows fallback text when both prop and REST return null', async () => {
    mockGetServidorById.mockResolvedValue({data: null, error: null});

    render(<MotoristaInfoModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Motorista a caminho')).toBeTruthy();
    });
  });

  it('5. shows error state when REST fetch fails', async () => {
    mockGetMotoristaById.mockResolvedValue({data: null, error: {message: 'Not found'}});

    render(<MotoristaInfoModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Erro desconhecido')).toBeTruthy();
    });
  });

  it('6. skips servidor fetch when name and photo are pre-resolved', async () => {
    render(
      <MotoristaInfoModal
        {...defaultProps}
        motoristaFotoUrl="https://example.com/driver.jpg"
        nomeMotorista="Maria Souza"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('motorista-avatar-image')).toBeTruthy();
    });

    await waitFor(() => {
      expect(mockGetVeiculoById).toHaveBeenCalledWith('vei-1');
    });

    expect(mockGetServidorById).not.toHaveBeenCalled();
  });
});
