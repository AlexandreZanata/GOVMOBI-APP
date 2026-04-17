import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ScoreParams {
  distanciaMetros: number;
  nivelHierarquia: number;
  tempoEsperaSeg: number;
  isAutoridade: boolean;
  reputacao: number; // 0.0 a 1.0 (1.0 = perfeita, penalizada por recusas)
}

export interface CandidatoOrdenado {
  motoristaId: string;
  score: number;
  distanciaMetros: number;
}

@Injectable()
export class ScoringService {
  private readonly MAX_NIVEL = 10;
  private readonly MAX_ESPERA_SEG = 600; // 10 min

  constructor(private readonly config: ConfigService) {}

  calcularScore(params: ScoreParams): number {
    const maxRaioKm = this.config.get<number>('config.geo.raioMaximoDespachoKm') || 5;
    const maxDistanciaMetros = maxRaioKm * 1000;

    const distNorm = this.normalizarDistancia(
      params.distanciaMetros,
      maxDistanciaMetros,
    );
    const hierNorm = this.normalizarHierarquia(
      params.nivelHierarquia,
      this.MAX_NIVEL,
    );
    const esperaNorm = this.normalizarEspera(
      params.tempoEsperaSeg,
      this.MAX_ESPERA_SEG,
    );

    // Novo cálculo incluindo reputação: 60% distância, 30% hierarquia, 5% espera, 5% reputação
    let score =
      distNorm * 0.6 +
      hierNorm * 0.3 +
      esperaNorm * 0.05 +
      params.reputacao * 0.05;

    // Override de autoridade: nível >= 8 garante score mínimo 0.90
    if (params.isAutoridade) {
      score = Math.max(score, 0.9);
    }

    return Math.round(score * 10000) / 10000; // 4 casas decimais
  }

  ordenarCandidatos(
    candidatos: { motoristaId: string; distanciaMetros: number }[],
    paramsMap: Map<string, Omit<ScoreParams, 'distanciaMetros'>>,
  ): CandidatoOrdenado[] {
    return candidatos
      .map((c) => {
        const params = paramsMap.get(c.motoristaId);
        if (!params) return null;
        const score = this.calcularScore({
          distanciaMetros: c.distanciaMetros,
          ...params,
        });
        return {
          motoristaId: c.motoristaId,
          score,
          distanciaMetros: c.distanciaMetros,
        };
      })
      .filter((c): c is CandidatoOrdenado => c !== null)
      .sort((a, b) => b.score - a.score); // Maior score primeiro
  }

  // Inversamente proporcional: mais perto = score melhor
  private normalizarDistancia(distancia: number, maxDistancia: number): number {
    return Math.max(0, 1 - distancia / maxDistancia);
  }

  // Diretamente proporcional: maior nível = score melhor
  private normalizarHierarquia(nivel: number, maxNivel: number): number {
    return Math.min(nivel / maxNivel, 1);
  }

  // Diretamente proporcional: mais tempo esperando = score melhor
  private normalizarEspera(espera: number, maxEspera: number): number {
    return Math.min(espera / maxEspera, 1);
  }
}
