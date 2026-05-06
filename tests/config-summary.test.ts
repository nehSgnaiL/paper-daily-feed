import { describe, expect, it } from "vitest";
import { loadAppConfig } from "../src/app-config.js";
import { configSummaryLines } from "../src/config-summary.js";

function json(value: unknown): string {
  return JSON.stringify(value);
}

describe("config summary", () => {
  it("prints operational context without secrets", () => {
    const config = loadAppConfig(
      {
        ZOTERO_ID: "12345678",
        ZOTERO_KEY: "zotero-secret",
        EMBEDDING_API_KEY: "embedding-secret",
        OPENAI_API_KEY: "summary-secret",
        SENDER: "sender@example.test",
        RECEIVER: "receiver@example.test",
        SMTP_SERVER: "smtp.example.test",
        SMTP_PORT: "465",
        SENDER_PASSWORD: "mail-secret"
      },
      json({
        interests: {
          profile: {
            enabled: true,
            summary: "urban mobility"
          },
          zotero: {
            enabled: true,
            includeCollections: ["2026/survey/**"],
            excludeCollections: ["archive/**"]
          }
        },
        feeds: {
          catalogSelections: ["Nature"],
          customRss: [{ name: "Lab", rss: "https://example.test/feed.xml" }]
        },
        matching: {
          provider: "api"
        },
        summary: {
          enabled: true,
          language: "Chinese"
        },
      })
    );

    const output = configSummaryLines(config).join("\n");

    expect(output).toContain("interests: profile, zotero");
    expect(output).toContain("feeds: catalog=1, customRss=1");
    expect(output).toContain("matching: provider=api, active=api, model=text-embedding-3-small");
    expect(output).toContain("summary: enabled=true, model=gpt-4o-mini, language=Chinese");
    expect(output).toContain("delivery: mode=smtp, from=sender@example.test, to=receiver@example.test, smtpHost=smtp.example.test, smtpPort=465");
    expect(output).not.toContain("zotero-secret");
    expect(output).not.toContain("embedding-secret");
    expect(output).not.toContain("summary-secret");
    expect(output).not.toContain("mail-secret");
  });

});
