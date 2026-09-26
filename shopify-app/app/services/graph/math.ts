/** Epic 04 helpers. Confidence is canonical on 0..1. */

export function clip01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function confidenceValue(parts: {
  Lt: number;
  G: number;
  A: number;
  Y: number;
  R: number;
}): number {
  return clip01(0.3 * parts.Lt + 0.25 * parts.G + 0.25 * parts.A + 0.1 * parts.Y + 0.1 * parts.R);
}

/** Fewer than five orders in the window cannot display above 0.40. */
export function applyLowNCap(value: number, nOrders: number): { value: number; lowN: boolean } {
  if (nOrders < 5) return { value: Math.min(clip01(value), 0.4), lowN: true };
  return { value: clip01(value), lowN: false };
}

export function softmax(values: number[]): number[] {
  if (values.length === 0) return [];
  const max = Math.max(...values);
  const exps = values.map((value) => Math.exp(value - max));
  const sum = exps.reduce((total, value) => total + value, 0) || 1;
  return exps.map((value) => value / sum);
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Venue-local 1.0, metro 0.7, region 0.4, national 0.2, else 0. */
export function geoBandWeight(km: number, sameCountry: boolean): number {
  if (km <= 25) return 1;
  if (km <= 80) return 0.7;
  if (sameCountry && km <= 200) return 0.4;
  if (sameCountry) return 0.2;
  return 0;
}

const DOW: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function londonCalendar(date: Date): { iso: string; dow: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const iso = `${read("year")}-${read("month")}-${read("day")}`;
  return { iso, dow: DOW[read("weekday")] ?? 0 };
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function formatLondon(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
  }).format(date);
}
