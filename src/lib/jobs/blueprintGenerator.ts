import crypto from "node:crypto";
import type { AdjustmentRange, CoreAdjustments, RenderSettings, RenderVariant } from "../../types/index.js";
import { makeOutputPath } from "../ffmpeg/commandBuilder.js";

function normalizeRange(range: AdjustmentRange): AdjustmentRange {
  if (range.min <= range.max) {
    return range;
  }
  return { min: range.max, max: range.min };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInRangeWithRng(range: AdjustmentRange, next: () => number): number {
  const normalized = normalizeRange(range);
  return normalized.min + next() * (normalized.max - normalized.min);
}

function randomSeedFromSystem(): number {
  return crypto.randomInt(1, 0x7fffffff);
}

function makeVariantAdjustments(settings: RenderSettings, next: () => number): CoreAdjustments {
  return {
    brightness: clamp(randomInRangeWithRng(settings.variants.brightnessRange, next), -1, 1),
    contrast: clamp(randomInRangeWithRng(settings.variants.contrastRange, next), 0.1, 3),
    saturation: clamp(randomInRangeWithRng(settings.variants.saturationRange, next), 0, 3),
    volume: clamp(randomInRangeWithRng(settings.variants.volumeRange, next), -30, 30)
  };
}

export function buildVariantBlueprints(settings: RenderSettings): RenderVariant[] {
  const variants: RenderVariant[] = [];
  const blueprintSeed = settings.variants.seed ?? randomSeedFromSystem();
  const next = mulberry32(blueprintSeed);

  for (let i = 1; i <= settings.variants.count; i += 1) {
    const outputPath = makeOutputPath(settings.outputDir, settings.baseName, i);
    variants.push({
      id: crypto.randomUUID(),
      index: i,
      blueprintSeed,
      adjustments: makeVariantAdjustments(settings, next),
      bitrateKbps: Math.round(clamp(randomInRangeWithRng(settings.variants.bitrateRange, next), 300, 50000)),
      outputPath,
      sidecarPath: `${outputPath}.json`
    });
  }

  return variants;
}
