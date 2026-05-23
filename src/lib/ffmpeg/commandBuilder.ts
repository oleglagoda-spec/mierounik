import path from "node:path";
import type { CoreAdjustments, ExtendedEffects, GpuEncoder, RenderVariant } from "../../types/index.js";

export interface BuildPreviewParams {
  sourcePath: string;
  outputPath: string;
  adjustments: CoreAdjustments;
  effects: ExtendedEffects;
  previewSeconds: number;
  videoDurationSec?: number;
}

export interface BuildRenderParams {
  sourcePath: string;
  variant: RenderVariant;
  effects: ExtendedEffects;
  videoDurationSec?: number;
}

interface FilterPack {
  vf: string;
  af: string;
}

const encoderMap: Record<GpuEncoder, string> = {
  cpu: "libx264",
  nvenc: "h264_nvenc",
  qsv: "h264_qsv",
  videotoolbox: "h264_videotoolbox",
  amf: "h264_amf"
};

export function buildPreviewArgs(params: BuildPreviewParams): string[] {
  const filterPack = buildFilters(
    params.adjustments,
    params.effects,
    Math.min(params.previewSeconds, params.videoDurationSec ?? params.previewSeconds)
  );

  const args = [
    "-hide_banner",
    "-y",
    "-i",
    params.sourcePath,
    "-t",
    String(params.previewSeconds),
    "-vf",
    filterPack.vf,
    "-af",
    filterPack.af,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    params.outputPath
  ];

  if (params.effects.cleanMetadata) {
    args.splice(args.length - 1, 0, "-map_metadata", "-1");
  }

  return args;
}

export function buildRenderArgs(params: BuildRenderParams): string[] {
  const { variant } = params;
  const durationSec = params.videoDurationSec;
  const filterPack = buildFilters(variant.adjustments, params.effects, durationSec);
  const codec = encoderMap[params.effects.encoder] ?? encoderMap.cpu;

  const args = [
    "-hide_banner",
    "-y",
    "-i",
    params.sourcePath,
    "-vf",
    filterPack.vf,
    "-af",
    filterPack.af,
    "-c:v",
    codec,
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    variant.outputPath
  ];

  if (codec === "libx264") {
    args.splice(args.length - 1, 0, "-preset", "medium");
  }

  if (params.effects.cleanMetadata) {
    args.splice(args.length - 1, 0, "-map_metadata", "-1");
  }

  return args;
}

function buildFilters(adjustments: CoreAdjustments, effects: ExtendedEffects, durationSec?: number): FilterPack {
  const vfParts: string[] = [];
  const afParts: string[] = [];

  vfParts.push(
    `eq=brightness=${toFixed(adjustments.brightness)}:contrast=${toFixed(adjustments.contrast)}:saturation=${toFixed(adjustments.saturation)}`
  );

  if (effects.gridOverlay) {
    vfParts.push("drawgrid=width=80:height=80:thickness=1:color=white@0.20");
  }

  if (effects.fadeInSec > 0) {
    vfParts.push(`fade=t=in:st=0:d=${toFixed(effects.fadeInSec)}`);
  }

  if (effects.fadeOutSec > 0 && durationSec && durationSec > effects.fadeOutSec) {
    vfParts.push(`fade=t=out:st=${toFixed(durationSec - effects.fadeOutSec)}:d=${toFixed(effects.fadeOutSec)}`);
  }

  afParts.push(`volume=${toFixed(adjustments.volume)}dB`);

  if (effects.fadeInSec > 0) {
    afParts.push(`afade=t=in:st=0:d=${toFixed(effects.fadeInSec)}`);
  }

  if (effects.fadeOutSec > 0 && durationSec && durationSec > effects.fadeOutSec) {
    afParts.push(`afade=t=out:st=${toFixed(durationSec - effects.fadeOutSec)}:d=${toFixed(effects.fadeOutSec)}`);
  }

  return {
    vf: vfParts.join(","),
    af: afParts.join(",")
  };
}

function toFixed(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : "0";
}

export function makeOutputPath(outputDir: string, baseName: string, index: number): string {
  const safeBase = baseName.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(outputDir, `${safeBase}_v${String(index).padStart(3, "0")}.mp4`);
}
