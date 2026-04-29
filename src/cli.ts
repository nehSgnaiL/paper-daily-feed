export type CliMode = "run" | "preview-email" | "setup-profile" | "test-config";

const CLI_MODES: CliMode[] = ["run", "preview-email", "setup-profile", "test-config"];

export function parseCliMode(args: string[]): CliMode {
  const mode = args[0] ?? "run";

  if (CLI_MODES.includes(mode as CliMode)) {
    return mode as CliMode;
  }

  throw new Error(`Unknown CLI mode: ${mode}. Expected one of: ${CLI_MODES.join(", ")}.`);
}
