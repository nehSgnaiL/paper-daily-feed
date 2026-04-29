import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("requires YAML config from CUSTOM_CONFIG or config/custom.yaml", () => {
    expect(() => loadConfig({}, " ")).toThrow(
      "Missing config. Set CUSTOM_CONFIG or create config/custom.yaml."
    );
  });

  it("loads explicit YAML text before any file fallback", () => {
    const config = loadConfig(
      {
        ZOTERO_ID: "123456",
        ZOTERO_KEY: "zotero-key",
        SENDER: "sender@example.test",
        SENDER_PASSWORD: "sender-password",
        RECEIVER: "receiver@example.test"
      },
      `
zotero:
  user_id: \${oc.env:ZOTERO_ID}
  api_key: \${oc.env:ZOTERO_KEY}
email:
  sender: \${oc.env:SENDER}
  receiver: \${oc.env:RECEIVER}
  smtp_server: smtp.example.test
  smtp_port: 465
  sender_password: \${oc.env:SENDER_PASSWORD}
executor:
  max_paper_num: 2
  reranker: local
`
    );

    expect(config.maxPapers).toBe(2);
  });

  it("merges override YAML over example YAML", () => {
    const config = loadConfig(
      {
        ZOTERO_ID: "123456",
        ZOTERO_KEY: "zotero-key",
        SENDER: "sender@example.test",
        SENDER_PASSWORD: "sender-password",
        RECEIVER: "receiver@example.test"
      },
      `
zotero:
  user_id: \${oc.env:ZOTERO_ID}
  api_key: \${oc.env:ZOTERO_KEY}
email:
  sender: \${oc.env:SENDER}
  receiver: \${oc.env:RECEIVER}
  smtp_server: smtp.example.test
  smtp_port: 465
  sender_password: \${oc.env:SENDER_PASSWORD}
executor:
  send_empty: false
  max_paper_num: 10
  source: ["Nature"]
  reranker: local
`,
      `
executor:
  send_empty: true
  max_paper_num: 2
`
    );

    expect(config.sendEmpty).toBe(true);
    expect(config.maxPapers).toBe(2);
    expect(config.subscriptions).toEqual(["Nature"]);
  });

  it("can load the checked-in custom example config with email sending enabled", () => {
    const originalArgv = process.argv;
    process.argv = ["node", "src/index.ts", "config/custom.example.yaml"];

    try {
      const config = loadConfig({
        ZOTERO_ID: "123456",
        ZOTERO_KEY: "zotero-key",
        SENDER: "sender@example.test",
        SENDER_PASSWORD: "sender-password",
        RECEIVER: "receiver@example.test"
      });

      expect(config.debug).toBe(false);
      expect(config.maxPapers).toBe(10);
      expect(config.subscriptions).toEqual([
        "Nature",
        "Science",
        "PANS",
        "CEUS",
        "IJGIS",
        "IEEE T-ITS",
      ]);
    } finally {
      process.argv = originalArgv;
    }
  });

  it("uses values from the provided env after YAML interpolation", () => {
    const config = loadConfig(
      {
        ZOTERO_ID: "from-env",
        ZOTERO_KEY: "zotero-key",
        SENDER: "sender@example.test",
        SENDER_PASSWORD: "sender-password",
        RECEIVER: "receiver@example.test",
        SMTP_SERVER: "smtp.env.example.test",
        SMTP_PORT: "587"
      },
      `
zotero:
  user_id: \${oc.env:ZOTERO_ID}
  api_key: \${oc.env:ZOTERO_KEY}
email:
  sender: \${oc.env:SENDER}
  receiver: \${oc.env:RECEIVER}
  smtp_server: \${oc.env:SMTP_SERVER}
  smtp_port: \${oc.env:SMTP_PORT}
  sender_password: \${oc.env:SENDER_PASSWORD}
executor:
  reranker: local
`
    );

    expect(config.zotero.userId).toBe("from-env");
    expect(config.email.smtpServer).toBe("smtp.env.example.test");
    expect(config.email.smtpPort).toBe(587);
  });

  it("requires SMTP_SERVER when the YAML placeholder interpolates to an empty value", () => {
    expect(() =>
      loadConfig(
        {
          ZOTERO_ID: "123456",
          ZOTERO_KEY: "zotero-key",
          SENDER: "sender@example.test",
          SENDER_PASSWORD: "sender-password",
          RECEIVER: "receiver@example.test"
        },
        `
zotero:
  user_id: \${oc.env:ZOTERO_ID}
  api_key: \${oc.env:ZOTERO_KEY}
email:
  sender: \${oc.env:SENDER}
  receiver: \${oc.env:RECEIVER}
  smtp_server: \${oc.env:SMTP_SERVER}
  smtp_port: \${oc.env:SMTP_PORT}
  sender_password: \${oc.env:SENDER_PASSWORD}
executor:
  reranker: local
`
      )
    ).toThrow("Missing required environment variable: SMTP_SERVER");
  });

  it("loads the reference-style YAML config with environment interpolation", () => {
    const config = loadConfig(
      {
        ZOTERO_ID: "123456",
        ZOTERO_KEY: "zotero-key",
        SENDER: "sender@example.test",
        SENDER_PASSWORD: "sender-password",
        RECEIVER: "receiver@example.test",
        OPENAI_API_KEY: "llm-key",
        OPENAI_API_BASE: "https://llm.example.test/v1",
        EMBEDDING_API_KEY: "embedding-key"
      },
      `
zotero:
  user_id: \${oc.env:ZOTERO_ID}
  api_key: \${oc.env:ZOTERO_KEY}
  include_path: ["2026/survey/**"]
  exclude_path: ["archive/**"]
email:
  sender: \${oc.env:SENDER}
  receiver: \${oc.env:RECEIVER}
  smtp_server: smtp.example.test
  smtp_port: 465
  sender_password: \${oc.env:SENDER_PASSWORD}
llm:
  api:
    key: \${oc.env:OPENAI_API_KEY}
    base_url: \${oc.env:OPENAI_API_BASE}
  generation_kwargs:
    max_tokens: 4096
    model: Qwen/Qwen3-8B
  language: Chinese
reranker:
  api:
    key: \${oc.env:EMBEDDING_API_KEY}
    base_url: https://embedding.example.test/v1
    model: text-embedding-3-large
    batch_size: 32
executor:
  debug: true
  send_empty: true
  max_paper_num: 10
  source: ["Nature", "Science"]
  reranker: api
`
    );

    expect(config).toMatchObject({
      zotero: {
        userId: "123456",
        apiKey: "zotero-key",
        includePath: ["2026/survey/**"],
        excludePath: ["archive/**"]
      },
      email: {
        sender: "sender@example.test",
        receiver: "receiver@example.test",
        smtpServer: "smtp.example.test",
        smtpPort: 465,
        senderPassword: "sender-password"
      },
      maxPapers: 10,
      debug: true,
      sendEmpty: true,
      subscriptions: ["Nature", "Science"],
      generation: {
        apiKey: "llm-key",
        baseUrl: "https://llm.example.test/v1",
        model: "Qwen/Qwen3-8B",
        language: "Chinese",
        maxTokens: 4096
      },
      embedding: {
        apiKey: "embedding-key",
        baseUrl: "https://embedding.example.test/v1",
        model: "text-embedding-3-large",
        batchSize: 32
      }
    });
  });

  it("keeps reranker.local as the no-API fallback in this Node implementation", () => {
    const config = loadConfig(
      {
        ZOTERO_ID: "123456",
        ZOTERO_KEY: "zotero-key",
        SENDER: "sender@example.test",
        SENDER_PASSWORD: "sender-password",
        RECEIVER: "receiver@example.test"
      },
      `
zotero:
  user_id: \${oc.env:ZOTERO_ID}
  api_key: \${oc.env:ZOTERO_KEY}
email:
  sender: \${oc.env:SENDER}
  receiver: \${oc.env:RECEIVER}
  smtp_server: smtp.example.test
  smtp_port: 465
  sender_password: \${oc.env:SENDER_PASSWORD}
reranker:
  local:
    model: jinaai/jina-embeddings-v5-text-nano
  api:
    base_url: https://embedding.example.test/v1
    model: text-embedding-3-large
executor:
  source: null
  reranker: local
`
    );

    expect(config.embedding).toEqual({
      provider: "local",
      model: "jinaai/jina-embeddings-v5-text-nano",
      batchSize: null
    });
    expect(config.subscriptions).toBeNull();
  });
});
