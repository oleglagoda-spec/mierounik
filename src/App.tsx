import React, { useEffect, useMemo, useState } from "react";
import { Sidebar, type SidebarTab } from "./components/Sidebar";
import { SliderControl } from "./components/SliderControl";
import { ToggleField } from "./components/ToggleField";
import { SelectField } from "./components/SelectField";
import { LogPanel } from "./components/LogPanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { SectionCard } from "./components/SectionCard";
import { RangePairControl } from "./components/RangePairControl";
import type { GpuEncoder, RenderProgressEvent, RenderSettings, VideoProbeData } from "./types";

const encoderOptions = [
  { value: "cpu", label: "CPU (libx264)" },
  { value: "nvenc", label: "NVIDIA NVENC" },
  { value: "qsv", label: "Intel QSV" },
  { value: "videotoolbox", label: "Apple VideoToolbox" },
  { value: "amf", label: "AMD AMF" }
];

function baseNameFromPath(filePath: string): string {
  if (!filePath) return "variant";
  const chunks = filePath.split(/[\\/]/g);
  const fileName = chunks[chunks.length - 1] || "variant";
  return fileName.replace(/\.[^.]+$/, "") || "variant";
}

function nowText(): string {
  return new Date().toLocaleTimeString();
}

function addLogLine(prev: string[], message: string): string[] {
  return [`[${nowText()}] ${message}`, ...prev].slice(0, 600);
}

function rangeMidpoint(min: number, max: number): number {
  return (min + max) / 2;
}

function getStudioApi(): Window["studioApi"] | null {
  return (window as Window & { studioApi?: Window["studioApi"] }).studioApi ?? null;
}

export default function App(): JSX.Element {
  const studioApi = getStudioApi();
  const [sourcePath, setSourcePath] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [previewPath, setPreviewPath] = useState("");
  const [probe, setProbe] = useState<VideoProbeData | null>(null);

  const [brightnessMin, setBrightnessMin] = useState(-0.08);
  const [brightnessMax, setBrightnessMax] = useState(0.08);
  const [contrastMin, setContrastMin] = useState(0.9);
  const [contrastMax, setContrastMax] = useState(1.15);
  const [saturationMin, setSaturationMin] = useState(0.9);
  const [saturationMax, setSaturationMax] = useState(1.15);
  const [volumeMinDb, setVolumeMinDb] = useState(-0.87);
  const [volumeMaxDb, setVolumeMaxDb] = useState(1.05);

  const [count, setCount] = useState(5);
  const [gridOverlay, setGridOverlay] = useState(false);
  const [fadeInSec, setFadeInSec] = useState(0);
  const [fadeOutSec, setFadeOutSec] = useState(0);
  const [cleanMetadata, setCleanMetadata] = useState(true);
  const [encoder, setEncoder] = useState<GpuEncoder>("cpu");

  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [activeJobId, setActiveJobId] = useState("");
  const [isRendering, setIsRendering] = useState(false);
  const [progressLine, setProgressLine] = useState("Idle");
  const [activeTab, setActiveTab] = useState<SidebarTab>("loadedVideo");

  useEffect(() => {
    let unsubLog: () => void = () => {};
    let unsubProgress: () => void = () => {};
    let unsubComplete: () => void = () => {};

    if (!studioApi) {
      setError("Bridge API not initialized. Restart app and relaunch dev mode.");
      setLogs((prev) => addLogLine(prev, "window.studioApi is unavailable"));
      return () => {};
    }

    void studioApi
      .getSettings()
      .then((settings) => {
        if (settings.lastSourcePath) setSourcePath(settings.lastSourcePath);
        if (settings.lastOutputDir) setOutputDir(settings.lastOutputDir);
        setEncoder(settings.lastEncoder);
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : String(e);
        setLogs((prev) => addLogLine(prev, `Settings load warning: ${message}`));
      });

    unsubLog = studioApi.onRenderLog((event) => {
      if (event.jobId !== "preview" && activeJobId && event.jobId !== activeJobId) return;
      setLogs((prev) => addLogLine(prev, event.line));
    });

    unsubProgress = studioApi.onRenderProgress((event: RenderProgressEvent) => {
      if (activeJobId && event.jobId !== activeJobId) return;
      setProgressLine(`${event.variantIndex}/${event.totalVariants}: ${event.message}`);
      setLogs((prev) => addLogLine(prev, event.message));
    });

    unsubComplete = studioApi.onRenderComplete((event) => {
      if (activeJobId && event.jobId !== activeJobId) return;
      setIsRendering(false);
      setProgressLine(
        `Готово: ${event.finished}, ошибки: ${event.failed}, отменено: ${event.cancelled ? "да" : "нет"}`
      );
      setLogs((prev) =>
        addLogLine(
          prev,
          `Batch complete. success=${event.finished}, failed=${event.failed}, cancelled=${event.cancelled}`
        )
      );
    });

    return () => {
      unsubLog();
      unsubProgress();
      unsubComplete();
    };
  }, [activeJobId, studioApi]);

  useEffect(() => {
    if (!sourcePath || !studioApi) return;
    void studioApi
      .probeVideo(sourcePath)
      .then((next) => setProbe(next))
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
      });
  }, [sourcePath, studioApi]);

  const renderSettings = useMemo<RenderSettings>(
    () => ({
      sourcePath,
      outputDir,
      baseName: baseNameFromPath(sourcePath),
      previewSeconds: 5,
      adjustments: {
        brightness: rangeMidpoint(brightnessMin, brightnessMax),
        contrast: rangeMidpoint(contrastMin, contrastMax),
        saturation: rangeMidpoint(saturationMin, saturationMax),
        volume: rangeMidpoint(volumeMinDb, volumeMaxDb)
      },
      effects: {
        gridOverlay,
        fadeInSec,
        fadeOutSec,
        cleanMetadata,
        encoder
      },
      variants: {
        count,
        brightnessRange: {
          min: brightnessMin,
          max: brightnessMax
        },
        contrastRange: {
          min: contrastMin,
          max: contrastMax
        },
        saturationRange: {
          min: saturationMin,
          max: saturationMax
        },
        volumeRange: {
          min: volumeMinDb,
          max: volumeMaxDb
        }
      }
    }),
    [
      sourcePath,
      outputDir,
      brightnessMin,
      brightnessMax,
      contrastMin,
      contrastMax,
      saturationMin,
      saturationMax,
      volumeMinDb,
      volumeMaxDb,
      gridOverlay,
      fadeInSec,
      fadeOutSec,
      cleanMetadata,
      encoder,
      count
    ]
  );

  const canRender = Boolean(sourcePath && outputDir && !isRendering && studioApi);

  const selectSource = async (): Promise<void> => {
    setError("");
    if (!studioApi) {
      setError("Bridge API not initialized");
      return;
    }
    try {
      const selected = await studioApi.selectVideo();
      if (!selected) return;
      setSourcePath(selected);
      setPreviewPath("");
      setLogs((prev) => addLogLine(prev, `Selected source: ${selected}`));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    }
  };

  const selectOutput = async (): Promise<void> => {
    setError("");
    if (!studioApi) {
      setError("Bridge API not initialized");
      return;
    }
    try {
      const selected = await studioApi.selectOutputFolder();
      if (!selected) return;
      setOutputDir(selected);
      setLogs((prev) => addLogLine(prev, `Output folder: ${selected}`));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    }
  };

  const createPreview = async (): Promise<void> => {
    setError("");
    if (!studioApi) {
      setError("Bridge API not initialized");
      return;
    }
    try {
      setLogs((prev) => addLogLine(prev, "Generating 5-second preview..."));
      const preview = await studioApi.createPreview(renderSettings);
      setPreviewPath(preview);
      setLogs((prev) => addLogLine(prev, `Preview ready: ${preview}`));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setLogs((prev) => addLogLine(prev, `Preview failed: ${message}`));
    }
  };

  const startRender = async (): Promise<void> => {
    setError("");
    if (!studioApi) {
      setError("Bridge API not initialized");
      return;
    }
    try {
      setLogs((prev) => addLogLine(prev, `Starting batch render (${count} variants)...`));
      const result = await studioApi.startRender(renderSettings);
      setActiveJobId(result.jobId);
      setIsRendering(true);
      setProgressLine(`0/${count}: queued`);
      setLogs((prev) => addLogLine(prev, `Job id: ${result.jobId}`));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setLogs((prev) => addLogLine(prev, `Render start failed: ${message}`));
    }
  };

  const cancelRender = async (): Promise<void> => {
    if (!activeJobId || !studioApi) return;
    try {
      await studioApi.cancelRender(activeJobId);
      setIsRendering(false);
      setProgressLine("Cancellation requested");
      setLogs((prev) => addLogLine(prev, "Cancellation requested by user"));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    }
  };

  const openOutputFolder = async (): Promise<void> => {
    if (!outputDir || !studioApi) return;
    try {
      await studioApi.openFolder(outputDir);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar title="Меню" activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="content-grid">
        <section className="left-column">
          {activeTab === "loadedVideo" ? (
            <SectionCard title="Файлы">
              <div className="row gap-8 wrap">
                <button type="button" className="primary" onClick={selectSource}>
                  Загрузить видео
                </button>
                <button type="button" className="secondary" onClick={selectOutput}>
                  Папка результата
                </button>
                <button type="button" className="secondary" onClick={openOutputFolder} disabled={!outputDir}>
                  Открыть папку результата
                </button>
              </div>
              <p className="path-text">Источник: {sourcePath || "не выбран"}</p>
              <p className="path-text">Вывод: {outputDir || "не выбран"}</p>
            </SectionCard>
          ) : null}

          {activeTab === "videoParameters" ? (
            <>
              <RangePairControl
                label="Яркость"
                min={-0.5}
                max={0.5}
                step={0.01}
                minValue={brightnessMin}
                maxValue={brightnessMax}
                onMinChange={setBrightnessMin}
                onMaxChange={setBrightnessMax}
              />
              <RangePairControl
                label="Контраст"
                min={0.5}
                max={2}
                step={0.01}
                minValue={contrastMin}
                maxValue={contrastMax}
                onMinChange={setContrastMin}
                onMaxChange={setContrastMax}
              />
              <RangePairControl
                label="Насыщенность"
                min={0}
                max={2}
                step={0.01}
                minValue={saturationMin}
                maxValue={saturationMax}
                onMinChange={setSaturationMin}
                onMaxChange={setSaturationMax}
              />
              <RangePairControl
                label="Громкость (dB)"
                min={-12}
                max={12}
                step={0.01}
                minValue={volumeMinDb}
                maxValue={volumeMaxDb}
                onMinChange={setVolumeMinDb}
                onMaxChange={setVolumeMaxDb}
              />
            </>
          ) : null}

          {activeTab === "videoEffects" ? (
            <SectionCard title="Видеоэффекты">
              <ToggleField label="Grid overlay" checked={gridOverlay} onChange={setGridOverlay} />
              <SliderControl label="Fade In (сек)" value={fadeInSec} min={0} max={5} step={0.1} onChange={setFadeInSec} />
              <SliderControl label="Fade Out (сек)" value={fadeOutSec} min={0} max={5} step={0.1} onChange={setFadeOutSec} />
            </SectionCard>
          ) : null}

          {activeTab === "metadata" ? (
            <SectionCard title="Метаданные">
              <ToggleField label="Очистить метаданные" checked={cleanMetadata} onChange={setCleanMetadata} />
              <p className="path-text">Для каждого рендера создаётся JSON sidecar с параметрами и SHA256.</p>
            </SectionCard>
          ) : null}

          {activeTab === "performance" ? (
            <SectionCard title="Производительность">
              <SelectField
                label="GPU/CPU encoder"
                value={encoder}
                options={encoderOptions}
                onChange={(value) => setEncoder(value as GpuEncoder)}
              />
              <p className="path-text">Если GPU-кодек недоступен в ffmpeg, рендер завершится ошибкой для варианта.</p>
            </SectionCard>
          ) : null}

          {activeTab === "saving" ? (
            <SectionCard title="Сохранение и Batch">
              <label className="select-field">
                <span>Кол-во вариантов</span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={count}
                  onChange={(event) => setCount(Number.parseInt(event.target.value, 10) || 1)}
                />
              </label>
              <p className="path-text">
                Для каждого варианта софт берёт случайные значения внутри диапазонов из вкладки «Параметры видео».
              </p>
            </SectionCard>
          ) : null}
        </section>

        <section className="right-column">
          <PreviewPanel sourcePath={sourcePath} previewPath={previewPath} probe={probe} />

          <section className="card section-card">
            <h3>Управление задачей</h3>
            <div className="row gap-8 wrap">
              <button type="button" className="secondary" onClick={createPreview} disabled={!sourcePath}>
                Preview 5 секунд
              </button>
              <button type="button" className="primary" onClick={startRender} disabled={!canRender}>
                Batch Render
              </button>
              <button type="button" className="danger" onClick={cancelRender} disabled={!isRendering || !activeJobId}>
                Отмена рендера
              </button>
            </div>
            <p className="status-line">{progressLine}</p>
            {error ? <p className="error-line">Ошибка: {error}</p> : null}
          </section>

          <LogPanel lines={logs} />
        </section>
      </main>
    </div>
  );
}
