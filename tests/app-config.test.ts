import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { loadAppConfig } from "../src/app-config.js";

const appConfigPath = "config/app.json";
const originalAppConfigText = existsSync(appConfigPath) ? readFileSync(appConfigPath, "utf8") : null;

function json(value: unknown): string {
  return JSON.stringify(value);
}

function writeAppConfigFile(value: unknown): void {
  mkdirSync("config", { recursive: true });
  writeFileSync(appConfigPath, json(value));
}

afterEach(() => {
  if (originalAppConfigText === null) {
    if (existsSync(appConfigPath)) {
      unlinkSync(appConfigPath);
    }
    return;
  }

  writeFileSync(appConfigPath, originalAppConfigText);
});

describe("loadAppConfig", () => {
  it("loads JSON from APP_CONFIG", () => {
    const config = loadAppConfig({
      APP_CONFIG: json({
        interests: {
          profile: {
            enabled: true,
            summary: "geospatial AI",
            topics: ["remote sensing"],
            methods: ["contrastive learning"],
            favoriteJournals: ["Nature"],
            avoidTopics: ["benchmark-only papers"],
            referencePapers: [
              {
                title: "Foundation Models for Geospatial AI",
                abstract: "Survey abstract",
                notes: "Useful framing"
              }
            ]
          }
        },
        matching: { paperLimit: 3 }
      })
    });

    expect(config.interests.profile).toEqual({
      enabled: true,
      summary: "geospatial AI",
      topics: ["remote sensing"],
      methods: ["contrastive learning"],
      favoriteJournals: ["Nature"],
      avoidTopics: ["benchmark-only papers"],
      referencePapers: [
        {
          title: "Foundation Models for Geospatial AI",
          abstract: "Survey abstract",
          notes: "Useful framing"
        }
      ]
    });
    expect(config.matching.paperLimit).toBe(3);
  });

  it("prefers explicit JSON text over APP_CONFIG and file fallback", () => {
    writeAppConfigFile({ matching: { paperLimit: 99 } });

    const config = loadAppConfig(
      {
        APP_CONFIG: json({ matching: { paperLimit: 50 } })
      },
      json({ matching: { paperLimit: 5 } })
    );

    expect(config.matching.paperLimit).toBe(5);
  });

  it("loads config/app.json when no explicit text or APP_CONFIG exists", () => {
    writeAppConfigFile({
      feeds: {
        catalogSelections: ["Nature"],
        customRss: [{ name: "Example Feed", rss: "https://example.test/rss.xml" }]
      }
    });

    const config = loadAppConfig({});

    expect(config.feeds.catalogSelections).toEqual(["Nature"]);
    expect(config.feeds.customRss).toEqual([{ name: "Example Feed", rss: "https://example.test/rss.xml" }]);
  });

  it("applies practical defaults for omitted optional sections", () => {
    const config = loadAppConfig({}, "{}");

    expect(config).toEqual({
      interests: {
        profile: {
          enabled: false,
          summary: "",
          topics: [],
          methods: [],
          favoriteJournals: [],
          avoidTopics: [],
          referencePapers: []
        },
        zotero: {
          enabled: false,
          userId: "",
          apiKeyEnv: "ZOTERO_KEY",
          libraryType: "user",
          includeCollections: [],
          excludeCollections: []
        }
      },
      feeds: {
        catalogSelections: [],
        customRss: []
      },
      matching: {
        provider: "api",
        api: {
          baseUrl: "https://api.openai.com/v1",
          model: "text-embedding-3-small",
          apiKeyEnv: "EMBEDDING_API_KEY",
          batchSize: 32
        },
        local: {
          model: "Xenova/all-MiniLM-L6-v2",
          batchSize: 16
        },
        paperLimit: 10,
        maxPaperAgeDays: 7
      },
      summary: {
        enabled: false,
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
        apiKeyEnv: "OPENAI_API_KEY",
        language: "English",
        maxTokens: 1024
      },
      delivery: {
        mode: "smtp",
        fromEnv: "SENDER",
        toEnv: "RECEIVER",
        smtpHostEnv: "SMTP_SERVER",
        smtpPortEnv: "SMTP_PORT",
        smtpPasswordEnv: "SENDER_PASSWORD"
      },
      runtime: {
        debug: false,
        sendEmpty: false
      }
    });
  });

  it("requires APP_CONFIG or config/app.json", () => {
    expect(() => loadAppConfig({})).toThrow(
      "Missing app config. Set APP_CONFIG or provide a local config file."
    );
  });

  it("wraps invalid JSON parse errors with app config context", () => {
    expect(() => loadAppConfig({}, "{")).toThrow(/^Invalid app config JSON:/);
  });
});
