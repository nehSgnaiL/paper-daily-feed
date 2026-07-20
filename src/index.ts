import { loadAppConfig } from "./app-config.js";
import { parseCliMode, type CliMode } from "./cli.js";
import { configSummaryLines } from "./config-summary.js";
import { runDailyFeed } from "./daily-feed.js";
import { sendMaintenanceNotification } from "./maintenance.js";

type Env = Record<string, string | undefined>;

const PROFILE_TEMPLATE = {
  interests: {
    profile: {
      enabled: true,
      summary: "",
      topics: [],
      methods: [],
      favoriteJournals: [],
      avoidTopics: [],
      referencePapers: []
    }
  }
};

async function runPipeline(mode: "run" | "preview-email", env: Env): Promise<void> {
  console.log("Loading app config...");
  await runDailyFeed(mode, env);
}

export async function main(args: string[] = process.argv.slice(2), env: Env = process.env): Promise<void> {
  const mode = parseCliMode(args);

  if (mode === "setup-profile") {
    console.log(JSON.stringify(PROFILE_TEMPLATE, null, 2));
    return;
  }

  if (mode === "test-config") {
    const config = loadAppConfig(env);
    console.log("Config is valid.");
    for (const line of configSummaryLines(config)) {
      console.log(line);
    }
    return;
  }

  if (mode === "notify-maintenance") {
    await sendMaintenanceNotification(env);
    console.log("Sent maintenance notification.");
    return;
  }

  await runPipeline(mode, env);
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
