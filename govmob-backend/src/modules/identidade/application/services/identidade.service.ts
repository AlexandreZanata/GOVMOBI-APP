import { Injectable, Inject } from '@nestjs/common';
import type { ServidorRepositoryPort } from '../../domain/ports/servidor.repository.port';

@Injectable()
export class IdentidadeService {
  constructor(
    @Inject('ServidorRepositoryPort')
    private readonly servidorRepository: ServidorRepositoryPort,
  ) {}

  async existeServidor(id: string): Promise<boolean> {
    const servidor = await this.servidorRepository.findById(id);
    return !!servidor;
  }

  async buscarPorCpf(cpf: string) {
    return this.servidorRepository.findByCpf(cpf);
  }

  async salvar(servidor: any) {
    return this.servidorRepository.save(servidor);
  }
}
