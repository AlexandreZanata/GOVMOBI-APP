import { ValueObject } from '../../../../shared-kernel/domain';
import { ValidationError } from '../../../../shared-kernel/errors';

interface CoordenadaProps {
  lat: number;
  lng: number;
}

export class Coordenada extends ValueObject {
  private readonly _lat: number;
  private readonly _lng: number;

  private constructor(props: CoordenadaProps) {
    super();
    this._lat = props.lat;
    this._lng = props.lng;
  }

  public static criar(lat: number, lng: number): Coordenada {
    const violations: { field: string; message: string }[] = [];

    if (lat < -90 || lat > 90) {
      violations.push({
        field: 'lat',
        message: 'Latitude deve estar entre -90 e 90',
      });
    }
    if (lng < -180 || lng > 180) {
      violations.push({
        field: 'lng',
        message: 'Longitude deve estar entre -180 e 180',
      });
    }

    if (violations.length > 0) {
      throw new ValidationError('Coordenadas inválidas', violations);
    }

    return new Coordenada({ lat, lng });
  }

  public toGeoJSON(): { type: 'Point'; coordinates: [number, number] } {
    return { type: 'Point', coordinates: [this._lng, this._lat] };
  }

  public toWKT(): string {
    return `POINT(${this._lng} ${this._lat})`;
  }

  /**
   * Haversine — distância aproximada em km (sem DB).
   */
  public distanciaAproxKm(outra: Coordenada): number {
    const R = 6371; // raio da Terra em km
    const dLat = this.toRad(outra._lat - this._lat);
    const dLng = this.toRad(outra._lng - this._lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(this._lat)) *
        Math.cos(this.toRad(outra._lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Método estático para calcular distância entre dois pontos {lat, lng} em km.
   */
  public static calcularDistancia(
    p1: { lat: number; lng: number },
    p2: { lat: number; lng: number },
  ): number {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(p2.lat - p1.lat);
    const dLng = toRad(p2.lng - p1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(p1.lat)) *
        Math.cos(toRad(p2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  get lat(): number {
    return this._lat;
  }

  get lng(): number {
    return this._lng;
  }

  protected getProps(): ReadonlyArray<unknown> {
    return [this._lat, this._lng];
  }
}
