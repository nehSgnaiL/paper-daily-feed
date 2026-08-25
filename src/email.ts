import nodemailer from "nodemailer";
import { fileURLToPath } from "node:url";
import packageMetadata from "../package.json";
import type { DeliveryConfig } from "./app-config.js";
import type { DailyRomance } from "./daily-romance.js";
import type { EditorialDigest, PaperBrief } from "./summary.js";
import type { RecommendedPaper } from "./types.js";

const ABSTRACT_EXCERPT_LIMIT = 320;
const EMAIL_SENDER_NAME = "Daily Paper Feeds";
const EMAIL_ICON_CID = "paper-daily-feed-icon";
const EMAIL_WIDTH = 600;
const FALLBACK_PREHEADER = "Research selected for you, ready when you are.";

type RenderablePaper = Omit<RecommendedPaper, "matchContext"> & {
  matchContext?: RecommendedPaper["matchContext"];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value: Date | null): string {
  return value?.toISOString().slice(0, 10) ?? "";
}

function formatEditionDate(value: Date): string {
  return value
    .toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC"
    })
    .toUpperCase();
}

function truncateText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function ensureSentenceEnding(value: string): string {
  const normalized = value.trim();
  if (!normalized || /[.!?。！？…]["'”’）)]?$/.test(normalized)) return normalized;
  return `${normalized}${/[\u3400-\u9fff]/.test(normalized) ? "。" : "."}`;
}

function fallbackPreheader(papers: RenderablePaper[]): string {
  const firstPaper = papers[0];
  if (!firstPaper) return FALLBACK_PREHEADER;
  return truncateText(firstPaper.abstract || firstPaper.title, 150) || FALLBACK_PREHEADER;
}

function renderRomance(romance: DailyRomance | null | undefined): string {
  if (!romance) return "";

  const romanceByline = [
    romance.author,
    romance.sourceTitle === romance.author ? "" : romance.sourceTitle
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" · ");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="left" class="romance-copy-cell" style="padding: 0; text-align: left;">
                        <p class="text-tertiary" style="margin: 0; color: #6e6e73; font-family: Georgia, 'Times New Roman', serif; font-size: 14px; line-height: 1.65;">&ldquo;${escapeHtml(
                          romance.text
                        )}&rdquo;</p>
                        <p class="text-tertiary" style="margin: 7px 0 0 0; color: #86868b; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Arial, sans-serif; font-size: 10.5px; line-height: 1.45; letter-spacing: 0.02em; text-align: left;">&mdash;&nbsp;${romanceByline ? `${romanceByline} · ` : ""}<a href="${escapeHtml(
                          romance.sourceUrl
                        )}" style="color: inherit; text-decoration: underline;">${escapeHtml(romance.sourceName)}</a></p>
                      </td>
                    </tr>
                  </table>`;
}

function renderBrand(editionDate: Date): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td valign="middle">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="44" valign="middle">
                              <img src="cid:${EMAIL_ICON_CID}" width="40" height="40" alt="" style="display: block; width: 40px; height: 40px; border: 0; border-radius: 12px;">
                            </td>
                            <td valign="middle" style="padding-left: 10px; color: #007aff; font-size: 18px; font-weight: 700; letter-spacing: -0.01em; white-space: nowrap;" class="accent">Daily Paper Feeds</td>
                          </tr>
                        </table>
                      </td>
                      <td valign="middle" align="right" style="color: #007aff; font-size: 11px; font-weight: 600; letter-spacing: 0.06em;" class="accent">${formatEditionDate(
                        editionDate
                      )}</td>
                    </tr>
                  </table>`;
}

function renderEditorial(digest: EditorialDigest): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px;">
                    <tr>
                      <td class="editorial-copy" style="padding: 0 20px; text-align: left;">
                        <h1 class="text-primary" style="margin: 0; color: #1d1d1f; font-size: 30px; line-height: 1.14; font-weight: 700; letter-spacing: -0.025em;">${escapeHtml(
                          digest.headline
                        )}</h1>
                        <p class="text-secondary" style="margin: 14px 0 0 0; color: #424245; font-size: 16px; line-height: 1.58;">${escapeHtml(
                          digest.overview
                        )}</p>
                      </td>
                    </tr>
                  </table>`;
}

function renderMetaLine(paper: RenderablePaper): string {
  const date = formatDate(paper.publishedAt);
  const values = [paper.journal, date].filter(Boolean);
  return `<p class="accent" style="margin: 0 0 9px 0; color: #007aff; font-size: 12px; font-weight: 700; line-height: 1.4; letter-spacing: 0.08em; text-transform: uppercase; overflow-wrap: anywhere; word-break: break-word;">${escapeHtml(
    values.join(" · ")
  )}</p>`;
}

function renderAuthors(paper: RenderablePaper): string {
  if (!paper.authors?.length) return "";
  return `<p class="text-secondary" style="margin: 0 0 8px 0; color: #424245; font-size: 14px; line-height: 1.45;">${escapeHtml(
    paper.authors.join(", ")
  )}</p>`;
}

function renderAffiliation(paper: RenderablePaper): string {
  if (!paper.firstAffiliation?.trim()) return "";
  return `<p class="text-tertiary" style="margin: 0; color: #6e6e73; font-size: 13px; line-height: 1.45;">${escapeHtml(
    paper.firstAffiliation.trim()
  )}</p>`;
}

function renderRecommendationScore(paper: RenderablePaper): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top: 14px;">
                    <tr>
                      <td bgcolor="#007aff" style="background: #007aff; border-radius: 999px; padding: 8px 13px; color: #ffffff; font-size: 13px; font-weight: 700; line-height: 1.2;">Recommendation score: ${(
                        paper.score * 100
                      ).toFixed(1)}%</td>
                    </tr>
                  </table>`;
}

function renderBrief(brief: PaperBrief | undefined, paper: RenderablePaper): string {
  if (brief) {
    return `<p style="margin: 18px 0 0 0; color: #424245; font-size: 14px; line-height: 1.6;"><strong class="text-primary" style="color: #1d1d1f;">TLDR:</strong> <span class="text-primary" style="color: #1d1d1f;">${escapeHtml(
      ensureSentenceEnding(brief.takeaway)
    )}</span> <span class="text-tertiary" style="color: #6e6e73;">${escapeHtml(
      ensureSentenceEnding(brief.tldr)
    )}</span></p>`;
  }

  const abstract = paper.abstract.trim()
    ? truncateText(paper.abstract, ABSTRACT_EXCERPT_LIMIT)
    : "No abstract provided.";
  return `<p class="text-secondary" style="margin: 18px 0 0 0; color: #424245; font-size: 14px; line-height: 1.6;"><strong class="text-primary" style="color: #1d1d1f;">Abstract:</strong> ${escapeHtml(
    ensureSentenceEnding(abstract)
  )}</p>`;
}

function renderPaper(paper: RenderablePaper, brief?: PaperBrief): string {
  return `<tr>
            <td style="padding: 0 0 18px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="paper-card border-color" style="width: 100%; table-layout: fixed; background: #ffffff; border: 1px solid #d9ebff; border-radius: 18px; border-collapse: separate;">
                <tr>
                  <td class="paper-pad" style="padding: 24px; overflow-wrap: anywhere; word-break: break-word;">
                    ${renderMetaLine(paper)}
                    <h2 style="margin: 0 0 12px 0; font-size: 24px; line-height: 1.24; font-weight: 700; letter-spacing: 0; overflow-wrap: anywhere; word-break: break-word;">
                      <a class="text-primary" href="${escapeHtml(paper.url)}" style="color: #1d1d1f; text-decoration: none;">${escapeHtml(
                        paper.title
                      )}</a>
                    </h2>
                    ${renderAuthors(paper)}
                    ${renderAffiliation(paper)}
                    ${renderRecommendationScore(paper)}
                    ${renderBrief(brief, paper)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

export function renderEmail(
  papers: RenderablePaper[],
  romance: DailyRomance | null = null,
  digest: EditorialDigest | null = null,
  now = new Date()
): string {
  const sortedPapers = [...papers].sort((left, right) => right.score - left.score);
  const briefByUrl = new Map(
    papers.map((paper, index) => [paper.url, digest?.papers[index]] as const)
  );
  const preheader = digest?.preheader || fallbackPreheader(sortedPapers);
  const content =
    sortedPapers.length === 0
      ? `<tr><td class="paper-card text-secondary border-color" style="background: #ffffff; border: 1px solid #d9ebff; border-radius: 18px; padding: 24px; color: #424245; font-size: 15px; line-height: 1.6;">No recommended papers today.</td></tr>`
      : sortedPapers.map((paper) => renderPaper(paper, briefByUrl.get(paper.url))).join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>Daily Paper Feeds</title>
    <style>
      :root { color-scheme: light dark; supported-color-schemes: light dark; }
      @media only screen and (max-width: 680px) {
        .page-pad { padding: 24px 10px !important; }
        .email-shell { width: 100% !important; max-width: 100% !important; table-layout: fixed !important; }
        .header-pad { padding: 8px 8px 22px 8px !important; }
        .closing-pad { padding-left: 19px !important; padding-right: 19px !important; }
        .editorial-copy { padding-left: 10px !important; padding-right: 10px !important; }
        .paper-pad { padding-left: 18px !important; padding-right: 18px !important; }
      }
      @media (prefers-color-scheme: dark) {
        .email-body, .page { background: #000000 !important; }
        .paper-card { background: #1c1c1e !important; }
        .border-color, .paper-card { border-color: #30363d !important; }
        .text-primary { color: #c9d1d9 !important; }
        .text-secondary { color: #8b949e !important; }
        .text-tertiary { color: #7d8590 !important; }
        .accent { color: #0a84ff !important; }
      }
      [data-ogsc] .email-body, [data-ogsc] .page { background: #000000 !important; }
      [data-ogsc] .paper-card { background: #1c1c1e !important; }
      [data-ogsc] .border-color, [data-ogsc] .paper-card { border-color: #30363d !important; }
      [data-ogsc] .text-primary { color: #c9d1d9 !important; }
      [data-ogsc] .text-secondary { color: #8b949e !important; }
      [data-ogsc] .text-tertiary { color: #7d8590 !important; }
      [data-ogsc] .accent { color: #0a84ff !important; }
    </style>
  </head>
  <body class="email-body" bgcolor="#e8f4ff" style="margin: 0; padding: 0; background: #e8f4ff;">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent; mso-hide: all;">${escapeHtml(
      preheader
    )}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#e8f4ff" class="page" style="width: 100%; background: #e8f4ff; border-collapse: collapse;">
      <tr>
        <td align="center" class="page-pad" style="padding: 34px 16px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1d1d1f;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" class="email-shell" style="width: 100%; max-width: ${EMAIL_WIDTH}px; table-layout: fixed; border-collapse: collapse;">
            <tr>
              <td class="header-pad" style="padding: 10px 4px 26px 4px;">
                ${renderBrand(now)}
                ${digest ? renderEditorial(digest) : ""}
              </td>
            </tr>
            ${content}
            <tr>
              <td align="left" style="padding: ${romance ? "10px" : "18px"} 25px 4px 25px; text-align: left; color: #86868b; font-size: 12px; line-height: 1.6;" class="closing-pad text-tertiary">
                ${romance ? renderRomance(romance) : ""}
                <table role="presentation" width="40" cellpadding="0" cellspacing="0" border="0" style="width: 40px; margin-top: ${romance ? "24px" : "0"};">
                  <tr>
                    <td height="1" bgcolor="#bddcf5" style="height: 1px; background: #bddcf5; font-size: 0; line-height: 0;">&nbsp;</td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-top: 15px;">
                  <tr>
                    <td align="left" valign="middle" class="footer-credit" style="padding: 0; color: #86868b; font-size: 11px; line-height: 1.5; text-align: left;">Built with <a href="${packageMetadata.homepage}" class="accent" style="color: #007aff; font-weight: 700; text-decoration: none;">paper-daily-feed</a> by <a href="https://nehsgnail.github.io/" class="accent" style="color: #007aff; font-weight: 700; text-decoration: none;">nehSgnaiL</a>.</td>
                  </tr>
                  <tr>
                    <td align="left" valign="middle" class="footer-action" style="padding: 6px 0 0 0; color: #86868b; font-size: 11px; line-height: 1.5; text-align: left;"><a href="${packageMetadata.homepage}#customization" style="color: inherit; text-decoration: underline;">Unsubscribe</a></td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function requiredValue(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`Missing required delivery value: ${label}.`);
  return normalized;
}

function requiredPort(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`Expected delivery value ${label} to be a number.`);
  return value;
}

function emailAddress(value: string): string {
  return value.match(/<([^>]+)>/)?.[1]?.trim() ?? value;
}

function formatSender(value: string): string {
  return `"${EMAIL_SENDER_NAME}" <${emailAddress(value)}>`;
}

const SMTP_RETRY_DELAYS_MS = [2_000, 5_000] as const;

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isSmtpConnectionError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "command" in error && error.command === "CONN";
}

export async function sendEmail(
  delivery: DeliveryConfig,
  html: string,
  subject: string,
  createTransport: typeof nodemailer.createTransport = nodemailer.createTransport,
  wait: (milliseconds: number) => Promise<void> = sleep
): Promise<unknown> {
  const sender = requiredValue(delivery.from, "from");
  const receiver = requiredValue(delivery.to, "to");
  const smtpServer = requiredValue(delivery.smtpHost, "smtpHost");
  const smtpPort = requiredPort(delivery.smtpPort, "smtpPort");
  const senderPassword = requiredValue(delivery.smtpPassword, "smtpPassword");

  for (let attempt = 0; ; attempt += 1) {
    const transporter = createTransport({
      host: smtpServer,
      port: smtpPort,
      secure: smtpPort === 465,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
      auth: { user: emailAddress(sender), pass: senderPassword }
    });

    try {
      return await transporter.sendMail({
        from: formatSender(sender),
        to: receiver,
        subject,
        html,
        attachments: [
          {
            filename: "paper-daily-feed-icon.png",
            path: fileURLToPath(new URL("../docs/paper-daily-feed-icon.png", import.meta.url)),
            cid: EMAIL_ICON_CID,
            contentDisposition: "inline"
          }
        ]
      });
    } catch (error) {
      const retryDelay = SMTP_RETRY_DELAYS_MS[attempt];
      if (!isSmtpConnectionError(error) || retryDelay === undefined) throw error;
      console.warn(
        `SMTP connection attempt ${attempt + 1}/${SMTP_RETRY_DELAYS_MS.length + 1} failed; retrying in ${retryDelay}ms.`
      );
      await wait(retryDelay);
    }
  }
}
