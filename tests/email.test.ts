import { beforeEach, describe, expect, it, vi } from "vitest";
import nodemailer from "nodemailer";
import { renderEmail, sendEmail } from "../src/email.js";
import type { AppConfig } from "../src/config.js";
import type { RankedPaper } from "../src/types.js";

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn()
  }
}));

describe("renderEmail", () => {
  it("renders recommended papers with journal, score, matched Zotero item, and link", () => {
    const papers: RankedPaper[] = [
      {
        journal: "Nature Cities",
        title: "Transit accessibility improves climate resilience",
        abstract: "Public transit accessibility and climate resilience in neighborhoods.",
        url: "https://example.test/transit",
        publishedAt: new Date("2026-04-28T10:30:00.000Z"),
        score: 0.456,
        matchedZoteroTitle: "Urban mobility and climate adaptation"
      }
    ];

    const html = renderEmail(papers);

    expect(html).toContain("Transit accessibility improves climate resilience");
    expect(html).toContain("Nature Cities");
    expect(html).toContain("45.6%");
    expect(html).toContain("Urban mobility and climate adaptation");
    expect(html).toContain("https://example.test/transit");
  });

  it("renders a no-paper message for an empty digest", () => {
    expect(renderEmail([])).toContain("No recommended papers today");
  });
});

describe("sendEmail", () => {
  const config: AppConfig = {
    zotero: {
      userId: "123456",
      apiKey: "zotero-key",
      libraryType: "user",
      includePath: null,
      excludePath: null
    },
    email: {
      sender: "sender@example.test",
      senderPassword: "sender-password",
      receiver: "receiver@example.test",
      smtpServer: "smtp.example.test",
      smtpPort: 465
    },
    maxPaperAgeDays: 7,
    maxPapers: 3,
    debug: false,
    subscriptions: ["Nature"],
    embedding: null,
    generation: null,
    sendEmpty: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("configures bounded SMTP timeouts and sends to the configured receiver", async () => {
    const sendMail = vi.fn().mockResolvedValue({
      messageId: "message-id",
      accepted: ["receiver@example.test"]
    });
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);

    const result = await sendEmail(config, "<p>Hello</p>", "Subject");

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.example.test",
        port: 465,
        secure: true,
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 30000
      })
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "sender@example.test",
        to: "receiver@example.test",
        subject: "Subject",
        html: "<p>Hello</p>"
      })
    );
    expect(result).toMatchObject({
      messageId: "message-id",
      accepted: ["receiver@example.test"]
    });
  });
});
