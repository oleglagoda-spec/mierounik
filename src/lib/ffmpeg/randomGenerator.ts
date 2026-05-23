import crypto from "node:crypto";
import type { AdjustmentRange, CoreAdjustments, RenderSettings, RenderVariant } from "../../types/index.js";
import { makeOutputPath } from "./commandBuilder.js";

function normalizeRange(range: AdjustmentRange): AdjustmentRange {
  if (range.min <= range.max) {
    return range;
  }
  return { min: range.max, max: range.min };
}

function randomInRange(range: AdjustmentRange): number {
  const normalized = normalizeRange(range);
  const span = normalized.max - normalized.min;
  return normalized.min + Math.random() * span;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function makeVariantAdjustments(settings: RenderSettings): CoreAdjustments {
  return {
    brightness: clamp(randomInRange(settings.variants.brightnessRange), -1, 1),
    contrast: clamp(randomInRange(settings.variants.contrastRange), 0.1, 3),
    saturation: clamp(randomInRange(settings.variants.saturationRange), 0, 3),
    volume: clamp(randomInRange(settings.variants.volumeRange), -30, 30)
  };
}

export function buildVariants(settings: RenderSettings): RenderVariant[] {
  const variants: RenderVariant[] = [];

  for (let i = 1; i <= settings.variants.count; i += 1) {
    const outputPath = makeOutputPath(settings.outputDir, settings.baseName, i);
    variants.push({
      id: crypto.randomUUID(),
      index: i,
      adjustments: makeVariantAdjustments(settings),
      outputPath,
      sidecarPath: `${outputPath}.json`
    });
  }

  return variants;
}
