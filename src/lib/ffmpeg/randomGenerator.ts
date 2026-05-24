import type { RenderSettings, RenderVariant } from "../../types/index.js";
import { buildVariantBlueprints } from "../jobs/blueprintGenerator.js";

export function buildVariants(settings: RenderSettings): RenderVariant[] {
  return buildVariantBlueprints(settings);
}
