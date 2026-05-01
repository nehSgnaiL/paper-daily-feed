export type Progress = {
  step: (detail: string) => void;
  done: (detail?: string) => void;
};

type ProgressOptions = {
  total?: number;
  logger?: (message: string) => void;
};

function formatElapsed(startedAt: number): string {
  return `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
}

function formatBar(current: number, total: number): string {
  const width = 20;
  const safeTotal = Math.max(total, 1);
  const filled = Math.min(width, Math.round((current / safeTotal) * width));
  return `${"#".repeat(filled)}${"-".repeat(width - filled)}`;
}

export function createProgress(label: string, options: ProgressOptions = {}): Progress {
  const logger = options.logger ?? console.log;
  const total = options.total;
  const startedAt = Date.now();
  let current = 0;

  function prefix(): string {
    const elapsed = formatElapsed(startedAt);
    if (total === undefined) {
      return `[${label}] ${current} steps | ${elapsed}`;
    }

    const percent = Math.round((current / Math.max(total, 1)) * 100);
    return `[${label}] ${current}/${total} [${formatBar(current, total)}] ${percent}% | ${elapsed}`;
  }

  return {
    step(detail: string): void {
      current += 1;
      logger(`${prefix()} | ${detail}`);
    },
    done(detail = "done"): void {
      if (total !== undefined) {
        current = Math.max(current, total);
      }
      logger(`${prefix()} | ${detail}`);
    }
  };
}
