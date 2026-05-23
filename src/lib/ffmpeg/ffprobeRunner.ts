import { spawn } from "node:child_process";
import { parseFfprobeJson } from "./ffprobeParser.js";
import type { VideoProbeData } from "../../types/index.js";

export async function probeVideo(inputPath: string): Promise<VideoProbeData> {
  const args = [
    "-v",
    "error",
    "-show_format",
    "-show_streams",
    "-print_format",
    "json",
    inputPath
  ];

  const result = await runProcess("ffprobe", args);
  return parseFfprobeJson(result.stdout);
}

export interface ProcessResult {
  code: number;
  stdout: string;
  stderr: string;
}

export function runProcess(command: string, args: string[]): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(new Error(`${command} failed to start: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ code, stdout, stderr });
        return;
      }
      reject(new Error(`${command} exited with code ${code}: ${stderr || stdout}`));
    });
  });
}
