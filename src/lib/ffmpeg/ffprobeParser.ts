import type { VideoProbeData } from "../../types/index.js";

interface FFProbeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  duration?: string;
}

interface FFProbeFormat {
  duration?: string;
}

interface FFProbeRaw {
  streams?: FFProbeStream[];
  format?: FFProbeFormat;
}

export function parseFfprobeJson(rawText: string): VideoProbeData {
  let parsed: FFProbeRaw;
  try {
    parsed = JSON.parse(rawText) as FFProbeRaw;
  } catch {
    throw new Error("ffprobe returned invalid JSON");
  }

  const streams = parsed.streams ?? [];
  const video = streams.find((s) => s.codec_type === "video");
  const audio = streams.find((s) => s.codec_type === "audio");

  if (!video) {
    throw new Error("No video stream found");
  }

  const duration = toNumber(video.duration) ?? toNumber(parsed.format?.duration) ?? 0;

  return {
    durationSec: duration,
    width: video.width ?? 0,
    height: video.height ?? 0,
    hasAudio: Boolean(audio),
    videoCodec: video.codec_name,
    audioCodec: audio?.codec_name
  };
}

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}
