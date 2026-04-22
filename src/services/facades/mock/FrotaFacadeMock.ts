/**
 * @fileoverview Mock implementation of IFrotaFacade for MOCK_MODE.
 * Implements vehicle association with in-memory state.
 */
import type {Motorista, Veiculo} from '../../../models';
import type {IFrotaFacade} from '../FrotaFacade';
import type {FacadeError, Result} from '../types';

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T>(error: FacadeError): Result<T, FacadeError> => ({data: null, error});
const delay = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

const MOCK_VEICULOS: Veiculo[] = [
  {id: 'vei-1', placa: 'ABC1D23', modelo: 'Toyota Corolla', ano: 2024, ativo: true, createdAt: '2026-04-15T18:54:51.560Z', updatedAt: '2026-04-15T18:54:51.560Z', deletedAt: null},
  {id: 'vei-2', placa: 'XYZ9W87', modelo: 'Volkswagen Gol', ano: 2022, ativo: true, createdAt: '2026-04-10T10:00:00.000Z', updatedAt: '2026-04-10T10:00:00.000Z', deletedAt: null},
  {id: 'vei-3', placa: 'DEF4G56', modelo: 'Fiat Strada', ano: 2021, ativo: false, createdAt: '2026-03-01T08:00:00.000Z', updatedAt: '2026-04-01T08:00:00.000Z', deletedAt: '2026-04-01T08:00:00.000Z'},
];

const MOCK_MOTORISTAS: Motorista[] = [
  {id: 'mot-1', servidorId: 'srv-1', cnhNumero: '1234567890', cnhCategoria: 'AB', statusOperacional: 'DISPONIVEL', ativo: true, createdAt: '2026-04-15T19:47:22.824Z', updatedAt: '2026-04-15T19:47:22.824Z', deletedAt: null},
];

// Module-level in-memory association state
let associatedVehicleId: string | null = null;

export class FrotaFacadeMock implements IFrotaFacade {
  public async listVeiculos(): Promise<Result<Veiculo[], FacadeError>> {
    await delay(200 + Math.random() * 50);
    return ok(MOCK_VEICULOS);
  }

  public async getVeiculoById(id: string): Promise<Result<Veiculo, FacadeError>> {
    await delay(150);
    const found = MOCK_VEICULOS.find(v => v.id === id);
    if (!found) return fail({code: 'NOT_FOUND', message: `Veiculo ${id} not found`, statusCode: 404});
    return ok(found);
  }

  public async listMotoristas(): Promise<Result<Motorista[], FacadeError>> {
    await delay(200 + Math.random() * 50);
    return ok(MOCK_MOTORISTAS);
  }

  public async getMotoristaById(id: string): Promise<Result<Motorista, FacadeError>> {
    await delay(150);
    const found = MOCK_MOTORISTAS.find(m => m.id === id);
    if (!found) return fail({code: 'NOT_FOUND', message: `Motorista ${id} not found`, statusCode: 404});
    return ok(found);
  }

  public async updateMyStatus(
    status: import('@models/Motorista').MotoristaStatusOperacional,
  ): Promise<Result<Motorista, FacadeError>> {
    await delay(200);
    const mock: Motorista = {...MOCK_MOTORISTAS[0], statusOperacional: status, updatedAt: new Date().toISOString()};
    return ok(mock);
  }

  public async getMyVehicle(): Promise<Result<Veiculo | null, FacadeError>> {
    await delay(150 + Math.random() * 100);
    if (!associatedVehicleId) return ok(null);
    const found = MOCK_VEICULOS.find(v => v.id === associatedVehicleId);
    return ok(found ?? null);
  }

  public async associateVehicle(veiculoId: string): Promise<Result<Veiculo, FacadeError>> {
    await delay(150 + Math.random() * 100);
    const found = MOCK_VEICULOS.find(v => v.id === veiculoId);
    if (!found) return fail({code: 'NOT_FOUND', message: 'Veiculo not found', statusCode: 404});
    associatedVehicleId = veiculoId;
    return ok(found);
  }

  public async disassociateVehicle(): Promise<Result<void, FacadeError>> {
    await delay(150 + Math.random() * 100);
    associatedVehicleId = null;
    return ok(undefined);
  }
}
