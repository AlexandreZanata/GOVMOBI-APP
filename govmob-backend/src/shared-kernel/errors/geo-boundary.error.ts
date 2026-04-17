import { DomainError } from './domain.error';

type GeoErrorType = 'fora_municipio' | 'coordenada_invalida';

export class GeoBoundaryError extends DomainError {
  public /* readonly */ tipo: GeoErrorType;
  public /* readonly */ context: Record<string, any>;

  constructor(tipo: GeoErrorType, context: Record<string, any> = {}) {
    const messages = {
      fora_municipio:
        'A operação não é permitida fora dos limites do município.',
      coordenada_invalida:
        'As coordenadas geográficas fornecidas são inválidas.',
    };

    super(messages[tipo] || 'Erro de limite geográfico', 'GEO_BOUNDARY_ERROR');
    this.name = 'GeoBoundaryError';
    this.tipo = tipo;
    this.context = context;
  }
}
