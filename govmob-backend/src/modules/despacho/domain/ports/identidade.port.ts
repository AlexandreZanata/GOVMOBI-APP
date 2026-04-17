export interface IdentidadePort {
  buscarServidor(id: string): Promise<{
    id: string;
    nome: string;
    cargo: string;
    nivelHierarquia: number;
  } | null>;
  buscarNivelPrioridade(servidorId: string): Promise<number>;
  validarMotoristaAtivo(motoristaId: string): Promise<boolean>;
  verificarCooldownCancelamento(
    servidorId: string,
  ): Promise<{ bloqueado: boolean; restanteMin: number }>;
}
