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
  it("renders recommended papers with journal, score, link, authors, affiliation, and abstract excerpt fallback", () => {
    const papers: RecommendedPaper[] = [
      {
        journal: "Nature Cities",
        title: "Transit accessibility improves climate resilience",
        abstract:
          "Public transit accessibility and climate resilience in neighborhoods. This abstract continues with enough detail to prove the renderer uses a compact excerpt rather than dumping the full source text into the bulletin.",
        url: "https://example.test/transit",
        publishedAt: new Date("2026-04-28T10:30:00.000Z"),
        authors: ["Ada Lovelace", "Grace Hopper"],
        firstAffiliation: "Example University",
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
    expect(html).toContain("2026-04-28");
    expect(html).toContain("Ada Lovelace, Grace Hopper");
    expect(html).toContain("Example University");
    expect(html).toContain("45.6%");
    expect(html).not.toContain("Matched your interests");
    expect(html).not.toContain("Urban mobility and climate adaptation");
    expect(html).toContain("Abstract excerpt");
    expect(html).toContain("Public transit accessibility and climate resilience in neighborhoods.");
    expect(html).toContain("https://example.test/transit");
    expect(html).toContain("https://github.com/nehSgnaiL/paper-daily-feed");
    expect(html).toContain('<table role="presentation" width="680"');
    expect(html).toContain('align="center"');
    expect(html).toContain("border: 1px solid #d9ebff");
    expect(html).not.toContain("<article");
    expect(html).not.toContain("<main");
  });

  it("renders a no-paper message for an empty digest", () => {
    expect(renderEmail([])).toContain("No recommended papers today");
  });

  it("hides unavailable metadata and omits match context", () => {
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

    expect(html).not.toContain("Matched your interests");
    expect(html).not.toContain("urban heat, shade equity");
    expect(html).not.toContain("Unknown date");
    expect(html).not.toContain("Authors unavailable");
    expect(html).toContain("No abstract provided.");
  });
});

describe("sendEmail", () => {
  const delivery: DeliveryConfig = {
    mode: "smtp",
    from: "sender@example.test",
    to: "receiver@example.test",
    smtpHost: "smtp.example.test",
    smtpPort: 465,
    smtpPassword: "sender-password"
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

    const result = await sendEmail(delivery, "<p>Hello</p>", "Subject");

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

  it("throws a clear error when a required delivery value is missing", async () => {
    await expect(sendEmail({ ...delivery, from: "" }, "<p>Hello</p>", "Subject")).rejects.toThrow(
      "Missing required delivery value: from."
    );
  });

  it("throws a clear error when smtpPort is not a valid number", async () => {
    await expect(
      sendEmail({ ...delivery, smtpPort: Number.NaN }, "<p>Hello</p>", "Subject")
    ).rejects.toThrow("Expected delivery value smtpPort to be a number.");
  });
});
