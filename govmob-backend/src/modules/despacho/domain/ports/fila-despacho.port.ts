export interface CandidatoDespacho {
  motoristaId: string;
  score: number;
}

export interface FilaDespachoPort {
  criarFila(corridaId: string, candidatos: CandidatoDespacho[]): Promise<void>;
  proximoCandidato(corridaId: string): Promise<string | null>;
  removerFila(corridaId: string): Promise<void>;
  adicionarMotoristaDisponivel(
    id: string,
    lat: number,
    lng: number,
    score: number,
    municipioId: string,
  ): Promise<void>;
  removerMotoristaDisponivel(id: string): Promise<void>;
  buscarCandidatosNaRegiao(
    origemLat: number,
    origemLng: number,
    raioKm: number,
    municipioId?: string,
  ): Promise<string[]>;
}
