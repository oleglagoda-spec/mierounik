import React from "react";
import type { VideoProbeData } from "../types";

interface PreviewPanelProps {
  sourcePath: string;
  previewPath: string;
  probe: VideoProbeData | null;
}

function toFileUrl(filePath: string): string {
  if (!filePath) return "";
  const normalized = filePath.replace(/\\/g, "/");
  const safePath = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return `local-media://local${encodeURI(safePath)}`;
}

export function PreviewPanel({ sourcePath, previewPath, probe }: PreviewPanelProps): JSX.Element {
  const src = previewPath || sourcePath;

  return (
    <section className="preview-panel card">
      <h3>Превью</h3>
      <div className="preview-frame">
        {src ? <video controls src={toFileUrl(src)} className="preview-video" /> : <p className="muted">Выберите видео</p>}
      </div>
      {probe ? (
        <p className="meta-line">
          {probe.width}x{probe.height} · {probe.durationSec.toFixed(1)}s · {probe.videoCodec ?? "unknown"}
        </p>
      ) : (
        <p className="meta-line">Нет информации о файле</p>
      )}
    </section>
  );
}
