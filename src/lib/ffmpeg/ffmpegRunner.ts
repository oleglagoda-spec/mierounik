import { spawn } from "node:child_process";

export interface RunningCommand {
  cancel: () => void;
  done: Promise<void>;
}

export function runFfmpegWithLogs(
  args: string[],
  onLog: (line: string) => void
): RunningCommand {
  const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });

  let stderrBuffer = "";

  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    stderrBuffer += text;
    const lines = text
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter((line: string) => Boolean(line));
    lines.forEach((line: string) => onLog(line));
  });

  const done = new Promise<void>((resolve, reject) => {
    child.on("error", (error) => {
      reject(new Error(`ffmpeg failed to start: ${error.message}`));
    });

    child.on("close", (code, signal) => {
      if (signal === "SIGTERM") {
        reject(new Error("ffmpeg cancelled"));
        return;
      }
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`ffmpeg exited with code ${code}: ${stderrBuffer}`));
    });
  });

  return {
    cancel: () => {
      child.kill("SIGTERM");
    },
    done
  };
}
