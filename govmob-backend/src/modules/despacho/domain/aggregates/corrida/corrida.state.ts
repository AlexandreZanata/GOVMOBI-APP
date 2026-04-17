export enum CorridaStatus {
  SOLICITADA = 'solicitada',
  AGUARDANDO_ACEITE = 'aguardando_aceite',
  ACEITA = 'aceita',
  EM_ROTA = 'em_rota',
  CONCLUIDA = 'concluida',
  AVALIADA = 'avaliada',
  CANCELADA = 'cancelada',
  EXPIRADA = 'expirada',
}

export const TRANSICOES_VALIDAS: Record<CorridaStatus, CorridaStatus[]> = {
  [CorridaStatus.SOLICITADA]: [
    CorridaStatus.AGUARDANDO_ACEITE,
    CorridaStatus.ACEITA,
    CorridaStatus.CANCELADA,
  ],
  [CorridaStatus.AGUARDANDO_ACEITE]: [
    CorridaStatus.ACEITA,
    CorridaStatus.CANCELADA,
    CorridaStatus.EXPIRADA,
  ],
  [CorridaStatus.ACEITA]: [CorridaStatus.EM_ROTA, CorridaStatus.CANCELADA],
  [CorridaStatus.EM_ROTA]: [CorridaStatus.CONCLUIDA],
  [CorridaStatus.CONCLUIDA]: [CorridaStatus.AVALIADA],
  [CorridaStatus.AVALIADA]: [],
  [CorridaStatus.CANCELADA]: [],
  [CorridaStatus.EXPIRADA]: [],
};

export function isTransicaoValida(
  de: CorridaStatus,
  para: CorridaStatus,
): boolean {
  return TRANSICOES_VALIDAS[de]?.includes(para) ?? false;
}

export function isEstadoTerminal(status: CorridaStatus): boolean {
  return TRANSICOES_VALIDAS[status]?.length === 0;
}
