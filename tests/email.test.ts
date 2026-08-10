import { beforeEach, describe, expect, it, mock } from "bun:test";
import packageMetadata from "../package.json";
import { renderEmail, sendEmail } from "../src/email.js";
import type { DeliveryConfig } from "../src/app-config.js";
import type { RecommendedPaper } from "../src/types.js";

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
    expect(html).toContain(packageMetadata.homepage);
    expect(html).toContain(">Unsubscribe</a>");
    expect(html).toContain(`${packageMetadata.homepage}#customization`);
    expect(html).toContain('lang="en"');
    expect(html).toContain("Today's papers, with a little wonder.");
    expect(html).toContain('name="viewport" content="width=device-width, initial-scale=1.0"');
    expect(html).toContain('<table role="presentation" width="600"');
    expect(html).toContain('align="center"');
    expect(html).toContain("border: 1px solid #d9ebff");
    expect(html).not.toContain("<article");
    expect(html).not.toContain("<main");
  });

  it("renders a no-paper message for an empty digest", () => {
    expect(renderEmail([])).toContain("No recommended papers today");
  });

  it("replaces repetitive header copy with a sourced daily quotation", () => {
    const html = renderEmail([], {
      text: "空山新雨后，天气晚来秋。",
      author: "王维",
      sourceTitle: "山居秋暝",
      sourceUrl: "https://hitokoto.cn?uuid=example",
      sourceName: "一言"
    });

    expect(html).toContain("空山新雨后，天气晚来秋。");
    expect(html).toContain("王维");
    expect(html).toContain(">一言</a>");
    expect(html).toContain("山居秋暝");
    expect(html).toContain("https://hitokoto.cn?uuid=example");
    expect(html).toContain(
      "margin: 26px auto 0 auto; max-width: 480px; color: #6e6e73; font-family: Georgia, 'Times New Roman', serif; font-size: 14px; line-height: 1.5;"
    );
    expect(html).toContain("padding: 10px 2px 26px 2px; text-align: center;");
    expect(html).toContain("font-size: 11px; line-height: 1.4; text-align: right;");
    expect(html).not.toContain("Research Bulletin");
    expect(html).not.toContain(
      "A recommendation of papers based on your research interests."
    );
    expect(html).not.toContain("Anonymous");
  });

  it("keeps English daily quotations visually subordinate to paper titles", () => {
    const html = renderEmail([], {
      text: "The quieter you become, the more you are able to hear.",
      author: "Rumi",
      sourceTitle: "",
      sourceUrl: "https://zenquotes.io/",
      sourceName: "ZenQuotes"
    });

    expect(html).toContain("serif; font-size: 14px; line-height: 1.5;");
  });

  it("renders recommended papers from highest score to lowest score", () => {
    const html = renderEmail([
      {
        journal: "Science",
        title: "Low score paper",
        abstract: "",
        url: "https://example.test/low",
        publishedAt: null,
        score: 0.4
      },
      {
        journal: "Nature",
        title: "High score paper",
        abstract: "",
        url: "https://example.test/high",
        publishedAt: null,
        score: 0.9
      }
    ]);

    expect(html.indexOf("High score paper")).toBeLessThan(html.indexOf("Low score paper"));
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
    mock.clearAllMocks();
  });

  it("configures bounded SMTP timeouts and sends to the configured receiver", async () => {
    const sendMail = mock().mockResolvedValue({
      messageId: "message-id",
      accepted: ["receiver@example.test"]
    });
    const createTransport = mock(() => ({ sendMail } as never));

    const result = await sendEmail(delivery, "<p>Hello</p>", "Subject", createTransport);

    expect(createTransport).toHaveBeenCalledWith(
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
        from: "\"Daily Paper Feeds\" <sender@example.test>",
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

  it("retries a refused SMTP connection before giving up", async () => {
    const connectionError = Object.assign(new Error("connect ECONNREFUSED"), {
      code: "ESOCKET",
      command: "CONN"
    });
    const sendMail = mock()
      .mockRejectedValueOnce(connectionError)
      .mockResolvedValueOnce({
        messageId: "message-id-after-retry",
        accepted: ["receiver@example.test"]
      });
    const createTransport = mock(() => ({ sendMail } as never));
    const sleep = mock(() => Promise.resolve());

    const result = await sendEmail(delivery, "<p>Hello</p>", "Subject", createTransport, sleep);

    expect(createTransport).toHaveBeenCalledTimes(2);
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2_000);
    expect(result).toMatchObject({ messageId: "message-id-after-retry" });
  });

  it("limits SMTP connection retries and preserves the final error", async () => {
    const connectionError = Object.assign(new Error("connect ECONNREFUSED"), {
      code: "ESOCKET",
      command: "CONN"
    });
    const sendMail = mock().mockRejectedValue(connectionError);
    const createTransport = mock(() => ({ sendMail } as never));
    const sleep = mock(() => Promise.resolve());

    await expect(
      sendEmail(delivery, "<p>Hello</p>", "Subject", createTransport, sleep)
    ).rejects.toBe(connectionError);

    expect(createTransport).toHaveBeenCalledTimes(3);
    expect(sendMail).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 2_000);
    expect(sleep).toHaveBeenNthCalledWith(2, 5_000);
  });

  it("does not retry failures after the SMTP connection is established", async () => {
    const authenticationError = Object.assign(new Error("Invalid login"), {
      code: "EAUTH",
      command: "AUTH"
    });
    const sendMail = mock().mockRejectedValue(authenticationError);
    const createTransport = mock(() => ({ sendMail } as never));
    const sleep = mock(() => Promise.resolve());

    await expect(
      sendEmail(delivery, "<p>Hello</p>", "Subject", createTransport, sleep)
    ).rejects.toBe(authenticationError);

    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
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
