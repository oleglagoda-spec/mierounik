export type GpuEncoder = "cpu" | "nvenc" | "qsv" | "videotoolbox" | "amf";

export interface CoreAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  volume: number;
}

export interface AdjustmentRange {
  min: number;
  max: number;
}

export interface ExtendedEffects {
  gridOverlay: boolean;
  fadeInSec: number;
  fadeOutSec: number;
  cleanMetadata: boolean;
  encoder: GpuEncoder;
}

export interface VariantGenerationSettings {
  count: number;
  brightnessRange: AdjustmentRange;
  contrastRange: AdjustmentRange;
  saturationRange: AdjustmentRange;
  volumeRange: AdjustmentRange;
}

export interface RenderSettings {
  sourcePath: string;
  outputDir: string;
  baseName: string;
  previewSeconds: number;
  adjustments: CoreAdjustments;
  effects: ExtendedEffects;
  variants: VariantGenerationSettings;
}

export interface VideoProbeData {
  durationSec: number;
  width: number;
  height: number;
  hasAudio: boolean;
  videoCodec?: string;
  audioCodec?: string;
}

export interface RenderVariant {
  id: string;
  index: number;
  adjustments: CoreAdjustments;
  outputPath: string;
  sidecarPath: string;
}

export interface RenderProgressEvent {
  jobId: string;
  variantIndex: number;
  totalVariants: number;
  status: "queued" | "running" | "done" | "failed" | "cancelled";
  message: string;
  outputPath?: string;
}

export interface RenderResult {
  jobId: string;
  finished: number;
  failed: number;
  cancelled: boolean;
  outputs: string[];
}

export interface AppSettings {
  lastSourcePath: string;
  lastOutputDir: string;
  lastEncoder: GpuEncoder;
}
