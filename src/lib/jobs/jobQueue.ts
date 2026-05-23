export interface QueueTask {
  id: string;
  run: (signal: AbortSignal) => Promise<void>;
}

export class JobQueue {
  private readonly tasks: QueueTask[] = [];
  private processing = false;
  private activeAbortController: AbortController | null = null;
  private activeTaskId: string | null = null;

  constructor(private readonly onLog: (message: string) => void) {}

  add(task: QueueTask): void {
    this.tasks.push(task);
    this.onLog(`Queued task: ${task.id}`);
    void this.kick();
  }

  clearPending(predicate?: (task: QueueTask) => boolean): number {
    const before = this.tasks.length;
    if (!predicate) {
      this.tasks.length = 0;
      return before;
    }

    const keep = this.tasks.filter((task) => !predicate(task));
    const removed = this.tasks.length - keep.length;
    this.tasks.length = 0;
    this.tasks.push(...keep);
    return removed;
  }

  getActiveTaskId(): string | null {
    return this.activeTaskId;
  }

  async waitForIdle(): Promise<void> {
    while (this.processing || this.tasks.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  cancelActive(): void {
    if (!this.activeAbortController) {
      return;
    }
    this.onLog("Cancelling active render task...");
    this.activeAbortController.abort();
  }

  private async kick(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;
    while (this.tasks.length > 0) {
      const task = this.tasks.shift();
      if (!task) continue;

      const controller = new AbortController();
      this.activeAbortController = controller;
      this.activeTaskId = task.id;

      try {
        this.onLog(`Running task: ${task.id}`);
        await task.run(controller.signal);
        this.onLog(`Task done: ${task.id}`);
      } catch (error) {
        if (controller.signal.aborted) {
          this.onLog(`Task cancelled: ${task.id}`);
        } else {
          const message = error instanceof Error ? error.message : String(error);
          this.onLog(`Task failed: ${task.id} -> ${message}`);
        }
      } finally {
        this.activeAbortController = null;
        this.activeTaskId = null;
      }
    }
    this.processing = false;
  }
}
