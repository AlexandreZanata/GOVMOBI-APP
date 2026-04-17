/**
 * Interface genérica para casos de uso (use-cases / application services).
 *
 * Um UseCase é executável e recebe uma entrada `I` retornando uma saída `O`.
 * A implementação usa `Promise<O>` para permitir operações assíncronas (I/O,
 * acesso a repositórios, etc.).
 */
export interface UseCase<I = unknown, O = void> {
  /** Executa o caso de uso com a entrada fornecida e retorna a saída. */
  execute(input: I): Promise<O>;
}
