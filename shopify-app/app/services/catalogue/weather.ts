import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "@prisma/client";

const weatherPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../london-runner-demo/london-weather.json",
);

type LondonWeather = {
  latitude: number;
  longitude: number;
  timezone: string;
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    windspeed_10m_max: number[];
  };
};

function keyFor(geoBucketKey: string, day: string): string {
  return createHash("sha256").update(`${geoBucketKey}|${day}T00:00:00Z`).digest("hex").slice(0, 32);
}

export type WeatherSeedResult = {
  forecasts: number;
  wetDriverId: string | null;
  wetStart: Date | null;
  wetEnd: Date | null;
};

/**
 * Open-Meteo payload already saved for London. Forecast rows are OBSERVED.
 * The wet-weekend driver is the spike interpretation: AGGREGATE_PROXY.
 */
export async function seedLondonWeather(prisma: PrismaClient): Promise<WeatherSeedResult> {
  const payload = JSON.parse(readFileSync(weatherPath, "utf8")) as LondonWeather;
  const now = new Date();
  const geoBucketKey = "GB/London";
  const days = payload.daily.time;
  let forecasts = 0;
  const wetDays: string[] = [];

  for (let index = 0; index < days.length; index += 1) {
    const day = days[index];
    const precip = payload.daily.precipitation_sum[index] ?? 0;
    if (precip >= 3) wetDays.push(day);
    const naturalKey = keyFor(geoBucketKey, day);
    const forecastDate = new Date(`${day}T12:00:00+01:00`);
    const data = {
      geoBucketKey,
      geoCity: "London",
      countryCode: "GB",
      lat: payload.latitude,
      lng: payload.longitude,
      forecastDate,
      tMinC: payload.daily.temperature_2m_min[index] ?? null,
      tMaxC: payload.daily.temperature_2m_max[index] ?? null,
      precipMm: precip,
      windKph: payload.daily.windspeed_10m_max[index] ?? null,
      sourceType: "open_meteo",
      provenance: "OBSERVED",
      lastCrawledAt: now,
      stale: false,
      rawPayloadHash: createHash("sha256").update(JSON.stringify(payload.daily)).digest("hex").slice(0, 32),
    };
    await prisma.weatherForecast.upsert({
      where: { naturalKey },
      create: { naturalKey, ...data },
      update: data,
    });
    forecasts += 1;
  }

  if (wetDays.length === 0) {
    return { forecasts, wetDriverId: null, wetStart: null, wetEnd: null };
  }

  const wetStart = new Date(`${wetDays[0]}T00:00:00+01:00`);
  const wetEnd = new Date(`${wetDays[1] ?? wetDays[0]}T23:59:59+01:00`);
  const naturalKey = "driver:weather:london-wet-weekend:2026-09-27";
  const saved = await prisma.driver.upsert({
    where: { naturalKey },
    create: {
      naturalKey,
      type: "weather",
      label: "Wet weekend — London",
      geoCity: "London",
      countryCode: "GB",
      lat: payload.latitude,
      lng: payload.longitude,
      timeStart: wetStart,
      timeEnd: wetEnd,
      metricsJson: JSON.stringify({
        precipDays: wetDays,
        note: "Spike read of the London Open-Meteo daily payload. Not observed demand.",
        timezone: payload.timezone,
      }),
      provenance: "AGGREGATE_PROXY",
      sourceType: "open_meteo",
      externalRef: "london-weather.json",
      lastCrawledAt: now,
      stale: false,
    },
    update: {
      label: "Wet weekend — London",
      timeStart: wetStart,
      timeEnd: wetEnd,
      provenance: "AGGREGATE_PROXY",
      lastCrawledAt: now,
    },
  });

  return { forecasts, wetDriverId: saved.id, wetStart, wetEnd };
}
