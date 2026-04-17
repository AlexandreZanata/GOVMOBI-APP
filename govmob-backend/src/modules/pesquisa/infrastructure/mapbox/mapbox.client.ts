import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface GeocodingResult {
  address?: string; // Optional for reverse results
  lat: number;
  lng: number;
  placeName: string;
}

export interface RouteResult {
  distance: number;
  duration: number;
  geometry: any;
}

@Injectable()
export class MapboxClient {
  private readonly logger = new Logger(MapboxClient.name);
  private readonly geocodingUrl =
    'https://api.mapbox.com/geocoding/v5/mapbox.places';
  private readonly directionsUrl =
    'https://api.mapbox.com/directions/v5/mapbox/driving';
  private readonly accessToken: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.accessToken = this.configService.get<string>(
      'config.mapbox.accessToken',
    )!;
  }

  getToken(): string {
    return this.accessToken;
  }

  async search(
    query: string,
    proximity?: { lat: number; lng: number },
  ): Promise<GeocodingResult[]> {
    if (!this.accessToken) {
      throw new Error('Mapbox Access Token is missing');
    }

    try {
      const url = `${this.geocodingUrl}/${encodeURIComponent(query)}.json`;
      const params: any = {
        access_token: this.accessToken,
        limit: 5,
        language: 'pt',
        country: 'BR',
      };

      if (proximity) {
        params.proximity = `${proximity.lng},${proximity.lat}`;
      }

      const response = await firstValueFrom(
        this.httpService.get(url, { params }),
      );

      return response.data.features.map((feature: any) => ({
        address: query,
        placeName: feature.place_name,
        lng: feature.center[0],
        lat: feature.center[1],
      }));
    } catch (error) {
      this.logger.error(`Error calling Mapbox API (search): ${error.message}`);
      throw error;
    }
  }

  async reverse(lat: number, lng: number): Promise<GeocodingResult[]> {
    if (!this.accessToken) {
      throw new Error('Mapbox Access Token is missing');
    }

    try {
      const url = `${this.geocodingUrl}/${lng},${lat}.json`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            access_token: this.accessToken,
            limit: 1,
            language: 'pt',
            types: 'address,poi',
          },
        }),
      );

      return response.data.features.map((feature: any) => ({
        placeName: feature.place_name,
        lng: feature.center[0],
        lat: feature.center[1],
      }));
    } catch (error) {
      this.logger.error(`Error calling Mapbox API (reverse): ${error.message}`);
      throw error;
    }
  }

  async getDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<RouteResult> {
    if (!this.accessToken) {
      throw new Error('Mapbox Access Token is missing');
    }

    try {
      const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
      const url = `${this.directionsUrl}/${coords}`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            access_token: this.accessToken,
            geometries: 'geojson',
            overview: 'full',
            steps: false,
          },
        }),
      );

      if (!response.data.routes || response.data.routes.length === 0) {
        throw new Error('No route found');
      }

      const route = response.data.routes[0];
      return {
        distance: route.distance, // in meters
        duration: route.duration, // in seconds
        geometry: route.geometry, // geojson
      };
    } catch (error) {
      this.logger.error(
        `Error calling Mapbox API (directions): ${error.message}`,
      );
      throw error;
    }
  }
}
