import type { AppConfig } from "./app-config.js";

function enabledInterestSources(config: AppConfig): string {
  const sources = [
    config.interests.profile.enabled ? "profile" : "",
    config.interests.zotero.enabled ? "zotero" : ""
  ].filter(Boolean);

  return sources.length > 0 ? sources.join(", ") : "none";
}

function activeMatchingModel(config: AppConfig): { active: "api" | "local"; model: string } {
  if (config.matching.provider === "api" && config.matching.api.apiKey.trim()) {
    return { active: "api", model: config.matching.api.model };
  }

  return { active: "local", model: config.matching.local.model };
}

export function configSummaryLines(config: AppConfig): string[] {
  const matching = activeMatchingModel(config);

  return [
    "Config summary:",
    `- interests: ${enabledInterestSources(config)}`,
    `- feeds: catalog=${config.feeds.catalogSelections.length || "all"}, customRss=${config.feeds.customRss.length}`,
    `- matching: provider=${config.matching.provider}, active=${matching.active}, model=${matching.model}, paperLimit=${config.matching.paperLimit}, maxPaperAgeDays=${config.matching.maxPaperAgeDays}`,
    `- summary: enabled=${config.summary.enabled}, model=${config.summary.model}, language=${config.summary.language}`,
    `- delivery: mode=${config.delivery.mode}, from=${config.delivery.from || "(empty)"}, to=${config.delivery.to || "(empty)"}, smtpHost=${config.delivery.smtpHost || "(empty)"}, smtpPort=${config.delivery.smtpPort}`,
    `- runtime: debug=${config.runtime.debug}, sendEmpty=${config.runtime.sendEmpty}`
  ];
}
