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
  it("loads JSON from APP_CONFIG and resolves env placeholders", () => {
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
        summary: {
          apiKey: "${oc.env:SUMMARY_API_KEY}"
        },
        matching: { paperLimit: 3 }
      }),
      SUMMARY_API_KEY: "resolved-summary-key"
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
    expect(config.summary.apiKey).toBe("resolved-summary-key");
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
          apiKey: "",
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
          apiKey: "",
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
        apiKey: "",
        language: "English",
        maxTokens: 1024
      },
      delivery: {
        mode: "smtp",
        from: "",
        to: "",
        smtpHost: "",
        smtpPort: 465,
        smtpPassword: ""
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

  it("resolves ${oc.env:NAME} placeholders throughout the config", () => {
    const config = loadAppConfig(
      {
        ZOTERO_ID: "12345678",
        ZOTERO_KEY: "zotero-secret",
        EMBEDDING_BASE_URL: "https://embedding.example.test/v1",
        EMBEDDING_API_KEY: "embedding-secret",
        SUMMARY_API_KEY: "summary-secret",
        MAIL_FROM: "sender@example.test",
        MAIL_TO: "receiver@example.test",
        MAIL_HOST: "smtp.example.test",
        MAIL_PASSWORD: "mail-secret"
      },
      json({
        interests: {
          zotero: {
            enabled: true,
            userId: "${oc.env:ZOTERO_ID}",
            apiKey: "${oc.env:ZOTERO_KEY}"
          }
        },
        matching: {
          api: {
            baseUrl: "${oc.env:EMBEDDING_BASE_URL}",
            apiKey: "${oc.env:EMBEDDING_API_KEY}"
          }
        },
        summary: {
          apiKey: "${oc.env:SUMMARY_API_KEY}"
        },
        delivery: {
          from: "${oc.env:MAIL_FROM}",
          to: "${oc.env:MAIL_TO}",
          smtpHost: "${oc.env:MAIL_HOST}",
          smtpPort: 2525,
          smtpPassword: "${oc.env:MAIL_PASSWORD}"
        }
      })
    );

    expect(config.interests.zotero.userId).toBe("12345678");
    expect(config.interests.zotero.apiKey).toBe("zotero-secret");
    expect(config.matching.api.baseUrl).toBe("https://embedding.example.test/v1");
    expect(config.matching.api.apiKey).toBe("embedding-secret");
    expect(config.summary.apiKey).toBe("summary-secret");
    expect(config.delivery).toEqual({
      mode: "smtp",
      from: "sender@example.test",
      to: "receiver@example.test",
      smtpHost: "smtp.example.test",
      smtpPort: 2525,
      smtpPassword: "mail-secret"
    });
  });

  it("throws when an ${oc.env:NAME} placeholder references a missing environment variable", () => {
    expect(() =>
      loadAppConfig(
        {},
        json({
          summary: {
            apiKey: "${oc.env:MISSING_SUMMARY_KEY}"
          }
        })
      )
    ).toThrow("Missing environment variable for app config secret reference: MISSING_SUMMARY_KEY.");
  });
});
