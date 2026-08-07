import { BadRequestError } from '../errors/app-error.js';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export class GeocodingService {
  public static parseLocationInput(input: {
    googleMapsUrl?: string;
    latitude?: number;
    longitude?: number;
  }): Coordinates {
    if (input.latitude !== undefined && input.longitude !== undefined) {
      if (input.latitude < -90 || input.latitude > 90 || input.longitude < -180 || input.longitude > 180) {
        throw new BadRequestError('Invalid coordinates. Latitude must be [-90, 90] and Longitude [-180, 180].');
      }
      return { latitude: input.latitude, longitude: input.longitude };
    }

    if (input.googleMapsUrl) {
      const match = input.googleMapsUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        return { latitude: lat, longitude: lng };
      }
      const qMatch = input.googleMapsUrl.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (qMatch) {
        const lat = parseFloat(qMatch[1]);
        const lng = parseFloat(qMatch[2]);
        return { latitude: lat, longitude: lng };
      }
    }

    throw new BadRequestError('Either valid latitude/longitude or a valid Google Maps URL with embedded coordinates is required.');
  }
}
