import { contextBridge, ipcRenderer } from "electron";
import type { AppSettings, RenderProgressEvent, RenderResult, RenderSettings, VideoProbeData } from "../src/types/index.js";

export interface RenderLogEvent {
  jobId: string;
  line: string;
}

export interface ToolStatus {
  ffmpeg: boolean;
  ffprobe: boolean;
}

const api = {
  selectVideo: (): Promise<string | null> => ipcRenderer.invoke("dialog:selectVideo"),
  selectOutputFolder: (): Promise<string | null> => ipcRenderer.invoke("dialog:selectOutput"),
  probeVideo: (sourcePath: string): Promise<VideoProbeData> => ipcRenderer.invoke("probe:video", sourcePath),
  createPreview: (settings: RenderSettings): Promise<string> => ipcRenderer.invoke("preview:create", settings),
  startRender: (settings: RenderSettings): Promise<{ jobId: string }> => ipcRenderer.invoke("render:start", settings),
  cancelRender: (jobId: string): Promise<{ cancelled: boolean; message: string }> => ipcRenderer.invoke("render:cancel", jobId),
  openFolder: (folderPath: string): Promise<boolean> => ipcRenderer.invoke("shell:openFolder", folderPath),
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke("settings:get"),
  getToolStatus: (): Promise<ToolStatus> => ipcRenderer.invoke("tools:status"),
  onRenderLog: (cb: (event: RenderLogEvent) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, payload: RenderLogEvent) => cb(payload);
    ipcRenderer.on("render:log", handler);
    return () => ipcRenderer.removeListener("render:log", handler);
  },
  onRenderProgress: (cb: (event: RenderProgressEvent) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, payload: RenderProgressEvent) => cb(payload);
    ipcRenderer.on("render:progress", handler);
    return () => ipcRenderer.removeListener("render:progress", handler);
  },
  onRenderComplete: (cb: (event: RenderResult) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, payload: RenderResult) => cb(payload);
    ipcRenderer.on("render:complete", handler);
    return () => ipcRenderer.removeListener("render:complete", handler);
  }
};

contextBridge.exposeInMainWorld("studioApi", api);
