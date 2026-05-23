import type { RenderLogEvent, ToolStatus } from "../../electron/preload";
import type { AppSettings, RenderProgressEvent, RenderResult, RenderSettings, VideoProbeData } from "./index";

declare global {
  interface Window {
    studioApi: {
      selectVideo: () => Promise<string | null>;
      selectOutputFolder: () => Promise<string | null>;
      probeVideo: (sourcePath: string) => Promise<VideoProbeData>;
      createPreview: (settings: RenderSettings) => Promise<string>;
      startRender: (settings: RenderSettings) => Promise<{ jobId: string }>;
      cancelRender: (jobId: string) => Promise<{ cancelled: boolean; message: string }>;
      openFolder: (folderPath: string) => Promise<boolean>;
      getSettings: () => Promise<AppSettings>;
      getToolStatus: () => Promise<ToolStatus>;
      onRenderLog: (cb: (event: RenderLogEvent) => void) => () => void;
      onRenderProgress: (cb: (event: RenderProgressEvent) => void) => () => void;
      onRenderComplete: (cb: (event: RenderResult) => void) => () => void;
    };
  }
}

export {};
