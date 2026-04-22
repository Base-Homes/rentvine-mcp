declare module "zipcodes" {
  export interface ZipInfo {
    zip: string;
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    country: string;
  }
  export function lookup(zip: string | number): ZipInfo | undefined;
  export function distance(zipA: string, zipB: string): number;
  export function radius(zip: string, miles: number): string[];
  const _default: {
    lookup: typeof lookup;
    distance: typeof distance;
    radius: typeof radius;
  };
  export default _default;
}
