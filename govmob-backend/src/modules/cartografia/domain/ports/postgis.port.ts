export interface PostGISPort {
  stWithin(pontoWkt: string, poligonoWkt: string): Promise<boolean>;
  stDWithin(
    ponto1Wkt: string,
    ponto2Wkt: string,
    distanciaMetros: number,
  ): Promise<boolean>;
  stDistance(ponto1Wkt: string, ponto2Wkt: string): Promise<number>;
  stLength(linestringWkt: string): Promise<number>;
  stCollect(pontosWkt: string[]): Promise<string>;
  stIsValid(geometriaWkt: string): Promise<boolean>;
}
