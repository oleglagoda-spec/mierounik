import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { buildPreviewArgs, buildRenderArgs } from "../src/lib/ffmpeg/commandBuilder.js";
import { buildVariants } from "../src/lib/ffmpeg/randomGenerator.js";
import { probeVideo } from "../src/lib/ffmpeg/ffprobeRunner.js";
import { runFfmpegWithLogs } from "../src/lib/ffmpeg/ffmpegRunner.js";
import { JobQueue } from "../src/lib/jobs/jobQueue.js";
import { SettingsStore } from "../src/lib/settings/store.js";
import { sha256File } from "../src/lib/hash/sha256.js";
import type { RenderProgressEvent, RenderResult, RenderSettings } from "../src/types/index.js";

let mainWindow: BrowserWindow | null = null;
let settingsStore: SettingsStore;
let queue: JobQueue;
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const preloadPath = path.join(currentDir, "preload.js");
const rendererHtmlPath = path.resolve(currentDir, "../../dist/index.html");

interface JobState {
  jobId: string;
  cancelled: boolean;
  finished: number;
  failed: number;
  outputs: string[];
  totalVariants: number;
  outputDir: string;
}

const jobs = new Map<string, JobState>();

function sendLog(jobId: string, line: string): void {
  mainWindow?.webContents.send("render:log", { jobId, line });
}

function sendProgress(event: RenderProgressEvent): void {
  mainWindow?.webContents.send("render:progress", event);
}

function sendComplete(payload: RenderResult): void {
  mainWindow?.webContents.send("render:complete", payload);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: "#0f1319",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (devServer) {
    void mainWindow.loadURL(devServer);
    mainWindow.webContents.openDevTools({ mode: "detach" });
    return;
  }

  void mainWindow.loadFile(rendererHtmlPath);
}

async function createPreview(settings: RenderSettings): Promise<string> {
  const probe = await probeVideo(settings.sourcePath);
  const output = path.join(app.getPath("temp"), `preview_${Date.now()}.mp4`);
  const args = buildPreviewArgs({
    sourcePath: settings.sourcePath,
    outputPath: output,
    adjustments: settings.adjustments,
    effects: settings.effects,
    previewSeconds: settings.previewSeconds,
    videoDurationSec: probe.durationSec
  });

  const run = runFfmpegWithLogs(args, (line) => {
    sendLog("preview", line);
  });

  await run.done;
  return output;
}

function createQueue(): JobQueue {
  return new JobQueue((message) => {
    mainWindow?.webContents.send("queue:log", message);
  });
}

function createSidecarPayload(settings: RenderSettings, hash: string, outputPath: string, variantIndex: number) {
  return {
    purpose: "A/B test creative preparation",
    generatedAt: new Date().toISOString(),
    variantIndex,
    sourcePath: settings.sourcePath,
    outputPath,
    encoder: settings.effects.encoder,
    cleanMetadata: settings.effects.cleanMetadata,
    adjustments: settings.adjustments,
    sha256: hash
  };
}

function ensureNotBusy(): void {
  const hasActive = Array.from(jobs.values()).some((j) => !j.cancelled && j.finished + j.failed < j.totalVariants);
  if (hasActive) {
    throw new Error("Another render job is still running");
  }
}

async function runBatch(settings: RenderSettings): Promise<{ jobId: string }> {
  ensureNotBusy();

  if (!settings.sourcePath || !settings.outputDir) {
    throw new Error("Source video and output folder are required");
  }

  await fs.mkdir(settings.outputDir, { recursive: true });

  const jobId = crypto.randomUUID();
  const variants = buildVariants(settings);
  const probe = await probeVideo(settings.sourcePath);

  const state: JobState = {
    jobId,
    cancelled: false,
    finished: 0,
    failed: 0,
    outputs: [],
    totalVariants: variants.length,
    outputDir: settings.outputDir
  };
  jobs.set(jobId, state);

  for (const variant of variants) {
    const taskId = `${jobId}:${variant.index}`;

    sendProgress({
      jobId,
      variantIndex: variant.index,
      totalVariants: variants.length,
      status: "queued",
      message: `Variant ${variant.index} queued`
    });

    queue.add({
      id: taskId,
      run: async (signal) => {
        if (state.cancelled) {
          sendProgress({
            jobId,
            variantIndex: variant.index,
            totalVariants: variants.length,
            status: "cancelled",
            message: `Variant ${variant.index} cancelled before start`
          });
          return;
        }

        sendProgress({
          jobId,
          variantIndex: variant.index,
          totalVariants: variants.length,
          status: "running",
          message: `Variant ${variant.index} rendering...`
        });

        const args = buildRenderArgs({
          sourcePath: settings.sourcePath,
          variant,
          effects: settings.effects,
          videoDurationSec: probe.durationSec
        });

        const run = runFfmpegWithLogs(args, (line) => {
          sendLog(jobId, `v${variant.index}: ${line}`);
        });

        signal.addEventListener(
          "abort",
          () => {
            run.cancel();
          },
          { once: true }
        );

        try {
          await run.done;
          if (signal.aborted || state.cancelled) {
            sendProgress({
              jobId,
              variantIndex: variant.index,
              totalVariants: variants.length,
              status: "cancelled",
              message: `Variant ${variant.index} cancelled`
            });
            return;
          }

          const hash = await sha256File(variant.outputPath);
          const sidecarPayload = createSidecarPayload(settings, hash, variant.outputPath, variant.index);
          await fs.writeFile(variant.sidecarPath, JSON.stringify(sidecarPayload, null, 2), "utf-8");

          state.finished += 1;
          state.outputs.push(variant.outputPath);

          sendProgress({
            jobId,
            variantIndex: variant.index,
            totalVariants: variants.length,
            status: "done",
            message: `Variant ${variant.index} done`,
            outputPath: variant.outputPath
          });
        } catch (error) {
          if (signal.aborted || state.cancelled) {
            sendProgress({
              jobId,
              variantIndex: variant.index,
              totalVariants: variants.length,
              status: "cancelled",
              message: `Variant ${variant.index} cancelled`
            });
            return;
          }

          state.failed += 1;
          const message = error instanceof Error ? error.message : String(error);
          sendProgress({
            jobId,
            variantIndex: variant.index,
            totalVariants: variants.length,
            status: "failed",
            message: `Variant ${variant.index} failed: ${message}`
          });
        }
      }
    });
  }

  void queue.waitForIdle().then(() => {
    const current = jobs.get(jobId);
    if (!current) return;

    sendComplete({
      jobId,
      finished: current.finished,
      failed: current.failed,
      cancelled: current.cancelled,
      outputs: current.outputs
    });
  });

  return { jobId };
}

function cancelRender(jobId: string): { cancelled: boolean; message: string } {
  const state = jobs.get(jobId);
  if (!state) {
    return { cancelled: false, message: "Job not found" };
  }

  state.cancelled = true;
  const removed = queue.clearPending((task) => task.id.startsWith(`${jobId}:`));
  const activeId = queue.getActiveTaskId();
  if (activeId?.startsWith(`${jobId}:`)) {
    queue.cancelActive();
  }

  sendLog(jobId, `Cancellation requested. Removed ${removed} pending variants.`);
  return { cancelled: true, message: "Cancellation requested" };
}

app.whenReady().then(async () => {
  settingsStore = SettingsStore.fromDir(app.getPath("userData"));
  queue = createQueue();
  createWindow();

  ipcMain.handle("dialog:selectVideo", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Select source video",
      properties: ["openFile"],
      filters: [{ name: "Video", extensions: ["mp4", "mov", "mkv", "webm", "avi"] }]
    });

    if (canceled || filePaths.length === 0) {
      return null;
    }

    const selected = filePaths[0];
    await settingsStore.save({ lastSourcePath: selected });
    return selected;
  });

  ipcMain.handle("dialog:selectOutput", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Select output folder",
      properties: ["openDirectory", "createDirectory"]
    });

    if (canceled || filePaths.length === 0) {
      return null;
    }

    const selected = filePaths[0];
    await settingsStore.save({ lastOutputDir: selected });
    return selected;
  });

  ipcMain.handle("probe:video", async (_event, sourcePath: string) => probeVideo(sourcePath));

  ipcMain.handle("preview:create", async (_event, settings: RenderSettings) => createPreview(settings));

  ipcMain.handle("render:start", async (_event, settings: RenderSettings) => {
    await settingsStore.save({
      lastSourcePath: settings.sourcePath,
      lastOutputDir: settings.outputDir,
      lastEncoder: settings.effects.encoder
    });
    return runBatch(settings);
  });

  ipcMain.handle("render:cancel", (_event, jobId: string) => cancelRender(jobId));

  ipcMain.handle("shell:openFolder", async (_event, folderPath: string) => {
    const result = await shell.openPath(folderPath);
    if (result) {
      throw new Error(result);
    }
    return true;
  });

  ipcMain.handle("settings:get", async () => settingsStore.load());

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
