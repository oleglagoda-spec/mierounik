import fs from "node:fs/promises";
import path from "node:path";
import type { AppSettings } from "../../types/index.js";

const defaults: AppSettings = {
  lastSourcePath: "",
  lastOutputDir: "",
  lastEncoder: "cpu"
};

export class SettingsStore {
  constructor(private readonly filePath: string) {}

  static fromDir(dir: string): SettingsStore {
    return new SettingsStore(path.join(dir, "settings.json"));
  }

  async load(): Promise<AppSettings> {
    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        ...defaults,
        ...parsed
      };
    } catch {
      return defaults;
    }
  }

  async save(next: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.load();
    const merged = {
      ...current,
      ...next
    };

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(merged, null, 2), "utf-8");
    return merged;
  }
}
