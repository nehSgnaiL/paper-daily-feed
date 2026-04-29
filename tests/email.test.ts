import { beforeEach, describe, expect, it, vi } from "vitest";
import nodemailer from "nodemailer";
import { renderEmail, sendEmail } from "../src/email.js";
import type { DeliveryConfig } from "../src/app-config.js";
import type { RecommendedPaper } from "../src/types.js";

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn()
  }
}));

describe("renderEmail", () => {
  it("renders recommended papers with journal, score, link, match line, and abstract excerpt fallback", () => {
    const papers: RecommendedPaper[] = [
      {
        journal: "Nature Cities",
        title: "Transit accessibility improves climate resilience",
        abstract:
          "Public transit accessibility and climate resilience in neighborhoods. This abstract continues with enough detail to prove the renderer uses a compact excerpt rather than dumping the full source text into the bulletin.",
        url: "https://example.test/transit",
        publishedAt: new Date("2026-04-28T10:30:00.000Z"),
        score: 0.456,
        matchContext: {
          bestMatchSource: "zotero",
          bestMatchTitle: "Urban mobility and climate adaptation",
          bestMatchTopics: ["transit", "climate resilience"]
        }
      }
    ];

    const html = renderEmail(papers);

    expect(html).toContain("Transit accessibility improves climate resilience");
    expect(html).toContain("Nature Cities");
    expect(html).toContain("45.6%");
    expect(html).toContain("Matched your interests");
    expect(html).toContain("Urban mobility and climate adaptation");
    expect(html).toContain("Abstract excerpt");
    expect(html).toContain("Public transit accessibility and climate resilience in neighborhoods.");
    expect(html).toContain("https://example.test/transit");
  });

  it("renders a no-paper message for an empty digest", () => {
    expect(renderEmail([])).toContain("No recommended papers today");
  });

  it("renders matched topics when there is no best match title", () => {
    const html = renderEmail([
      {
        journal: "Science",
        title: "Heat risk and urban shade",
        abstract: "",
        url: "https://example.test/heat",
        publishedAt: null,
        score: 0.8,
        matchContext: {
          bestMatchSource: "profile",
          bestMatchTitle: null,
          bestMatchTopics: ["urban heat", "shade equity"]
        }
      }
    ]);

    expect(html).toContain("Matched your interests");
    expect(html).toContain("urban heat, shade equity");
    expect(html).toContain("No abstract provided.");
  });
});

describe("sendEmail", () => {
  const delivery: DeliveryConfig = {
    mode: "smtp",
    fromEnv: "MAIL_FROM",
    toEnv: "MAIL_TO",
    smtpHostEnv: "MAIL_HOST",
    smtpPortEnv: "MAIL_PORT",
    smtpPasswordEnv: "MAIL_PASSWORD"
  };
  const env = {
    MAIL_FROM: "sender@example.test",
    MAIL_TO: "receiver@example.test",
    MAIL_HOST: "smtp.example.test",
    MAIL_PORT: "465",
    MAIL_PASSWORD: "sender-password"
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

    const result = await sendEmail(delivery, env, "<p>Hello</p>", "Subject");

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

  it("throws a clear error when required delivery env is missing", async () => {
    await expect(sendEmail(delivery, {}, "<p>Hello</p>", "Subject")).rejects.toThrow(
      "Missing required delivery environment variable: MAIL_FROM."
    );
  });
});
