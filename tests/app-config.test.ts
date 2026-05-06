import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { parse as parseDotenv } from "dotenv";
import { afterEach, describe, expect, it } from "vitest";
import { loadAppConfig } from "../src/app-config.js";

const appConfigPath = "config/app.json";
const appConfigJsoncPath = "config/app.jsonc";
const originalAppConfigText = existsSync(appConfigPath) ? readFileSync(appConfigPath, "utf8") : null;
const originalAppConfigJsoncText = existsSync(appConfigJsoncPath) ? readFileSync(appConfigJsoncPath, "utf8") : null;

function json(value: unknown): string {
  return JSON.stringify(value);
}

function writeAppConfigFile(value: unknown): void {
  mkdirSync("config", { recursive: true });
  writeFileSync(appConfigPath, json(value));
}

function writeAppConfigJsoncFile(value: string): void {
  mkdirSync("config", { recursive: true });
  writeFileSync(appConfigJsoncPath, value);
}

function removeAppConfigFile(): void {
  if (existsSync(appConfigPath)) {
    unlinkSync(appConfigPath);
  }
}

function removeAppConfigJsoncFile(): void {
  if (existsSync(appConfigJsoncPath)) {
    unlinkSync(appConfigJsoncPath);
  }
}

afterEach(() => {
  if (originalAppConfigText === null) {
    if (existsSync(appConfigPath)) {
      unlinkSync(appConfigPath);
    }
  } else {
    writeFileSync(appConfigPath, originalAppConfigText);
  }

  if (originalAppConfigJsoncText === null) {
    if (existsSync(appConfigJsoncPath)) {
      unlinkSync(appConfigJsoncPath);
    }
  } else {
    writeFileSync(appConfigJsoncPath, originalAppConfigJsoncText);
  }
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

  it("loads APP_CONFIG with JSONC comments outside strings", () => {
    const config = loadAppConfig(
      {},
      `{
        // top-level comment
        "interests": {
          "profile": {
            "enabled": true, // enable manual profile
            /* JSONC block comment */
            "summary": "urban // mobility"
          }
        },
        "feeds": {
          "customRss": [
            {
              "name": "Feed",
              "rss": "https://example.test/rss.xml#latest"
            }
          ]
        },
        "matching": {
          "paperLimit": 4,
        }
      }`
    );

    expect(config.interests.profile.enabled).toBe(true);
    expect(config.interests.profile.summary).toBe("urban // mobility");
    expect(config.feeds.customRss).toEqual([{ name: "Feed", rss: "https://example.test/rss.xml#latest" }]);
    expect(config.matching.paperLimit).toBe(4);
  });

  it("keeps .env.example focused on environment variables", () => {
    const parsedEnv = parseDotenv(readFileSync(".env.example"));

    expect(parsedEnv.APP_CONFIG).toBeUndefined();
    expect(parsedEnv.OPENAI_BASE_URL).toBe("https://api.openai.com/v1");
    expect(parsedEnv.EMBEDDING_BASE_URL).toBe("https://api.openai.com/v1");
  });

  it("keeps config/app.example.jsonc parseable as app config", () => {
    const configText = readFileSync("config/app.example.jsonc", "utf8");
    const config = loadAppConfig(
      {
        ZOTERO_ID: "1234567",
        ZOTERO_KEY: "example-zotero-api-key",
        EMBEDDING_BASE_URL: "https://api.openai.com/v1",
        EMBEDDING_API_KEY: "",
        OPENAI_BASE_URL: "https://api.openai.com/v1",
        OPENAI_API_KEY: "",
        SENDER: "sender@example.com",
        RECEIVER: "receiver@example.com",
        SMTP_SERVER: "smtp.example.com",
        SMTP_PORT: "465",
        SENDER_PASSWORD: "example-smtp-app-password"
      },
      configText
    );

    expect(config.interests.profile.enabled).toBe(true);
    expect(config.feeds.catalogSelections).toContain("Nature");
    expect(config.runtime.debug).toBe(true);
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
    removeAppConfigJsoncFile();
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

  it("uses default environment variable names for service credentials", () => {
    const config = loadAppConfig(
      {
        ZOTERO_ID: "12345678",
        ZOTERO_KEY: "zotero-secret",
        EMBEDDING_BASE_URL: "https://embedding.example.test/v1",
        EMBEDDING_API_KEY: "embedding-secret",
        OPENAI_BASE_URL: "https://summary.example.test/v1",
        OPENAI_API_KEY: "summary-secret",
        SENDER: "sender@example.test",
        RECEIVER: "receiver@example.test",
        SMTP_SERVER: "smtp.example.test",
        SMTP_PORT: "2525",
        SENDER_PASSWORD: "mail-secret"
      },
      json({
        interests: {
          zotero: {
            enabled: true
          }
        },
        summary: {
          enabled: true
        }
      })
    );

    expect(config.interests.zotero.userId).toBe("12345678");
    expect(config.interests.zotero.apiKey).toBe("zotero-secret");
    expect(config.matching.api.baseUrl).toBe("https://embedding.example.test/v1");
    expect(config.matching.api.apiKey).toBe("embedding-secret");
    expect(config.summary.baseUrl).toBe("https://summary.example.test/v1");
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

  it("requires APP_CONFIG or config/app.json", () => {
    removeAppConfigFile();
    removeAppConfigJsoncFile();

    expect(() => loadAppConfig({})).toThrow(
      "Missing app config. Set APP_CONFIG or provide config/app.jsonc or config/app.json."
    );
  });

  it("loads config/app.jsonc before config/app.json when no explicit text or APP_CONFIG exists", () => {
    writeAppConfigFile({
      interests: {
        profile: {
          enabled: true,
          summary: "json fallback"
        }
      }
    });
    writeAppConfigJsoncFile(`{
      // local JSONC config should take priority
      "interests": {
        "profile": {
          "enabled": true,
          "summary": "jsonc fallback",
        }
      }
    }`);

    const config = loadAppConfig({});

    expect(config.interests.profile.summary).toBe("jsonc fallback");
  });

  it("wraps invalid JSON parse errors with app config context", () => {
    expect(() => loadAppConfig({}, "{")).toThrow(/^Invalid app config JSON\/JSONC:/);
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
