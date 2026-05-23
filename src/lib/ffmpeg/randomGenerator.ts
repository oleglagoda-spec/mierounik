import crypto from "node:crypto";
import type { CoreAdjustments, RenderSettings, RenderVariant } from "../../types/index.js";
import { makeOutputPath } from "./commandBuilder.js";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function withJitter(base: number, jitter: number): number {
  if (jitter <= 0) return base;
  const rand = (Math.random() * 2 - 1) * jitter;
  return base + rand;
}

function makeVariantAdjustments(base: CoreAdjustments, settings: RenderSettings): CoreAdjustments {
  return {
    brightness: clamp(withJitter(base.brightness, settings.variants.brightnessJitter), -1, 1),
    contrast: clamp(withJitter(base.contrast, settings.variants.contrastJitter), 0.1, 3),
    saturation: clamp(withJitter(base.saturation, settings.variants.saturationJitter), 0, 3),
    volume: clamp(withJitter(base.volume, settings.variants.volumeJitter), 0, 4)
  };
}

export function buildVariants(settings: RenderSettings): RenderVariant[] {
  const variants: RenderVariant[] = [];

  for (let i = 1; i <= settings.variants.count; i += 1) {
    const outputPath = makeOutputPath(settings.outputDir, settings.baseName, i);
    variants.push({
      id: crypto.randomUUID(),
      index: i,
      adjustments: makeVariantAdjustments(settings.adjustments, settings),
      outputPath,
      sidecarPath: `${outputPath}.json`
    });
  }

  return variants;
}
