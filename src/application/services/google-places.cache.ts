export class GooglePlacesCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly ttlMs: number;

  constructor(ttlMs: number = 24 * 60 * 60 * 1000) { // 24 hours default
    this.ttlMs = ttlMs;
  }

  public get(placeId: string): any | null {
    const item = this.cache.get(placeId);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(placeId);
      return null;
    }

    return item.data;
  }

  public set(placeId: string, data: any): void {
    this.cache.set(placeId, {
      data,
      expiry: Date.now() + this.ttlMs
    });
  }

  public invalidate(placeId: string): void {
    this.cache.delete(placeId);
  }

  public clear(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const googlePlacesCache = new GooglePlacesCache();
