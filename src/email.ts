import nodemailer from "nodemailer";
import packageMetadata from "../package.json";
import type { DeliveryConfig } from "./app-config.js";
import type { DailyRomance } from "./daily-romance.js";
import type { RecommendedPaper } from "./types.js";

const ABSTRACT_EXCERPT_LIMIT = 280;
const EMAIL_PREHEADER = "Today's papers, with a little wonder.";
const EMAIL_SENDER_NAME = "Daily Paper Feeds";
const EMAIL_WIDTH = 600;

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
  if (!value) {
    return "";
  }
  return value.toISOString().slice(0, 10);
}

function truncateText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function renderSummary(paper: RenderablePaper): string {
  if (paper.tldr?.trim()) {
    return `<p style="margin: 16px 0 0 0; color: #424245; font-size: 14px; line-height: 1.6;"><strong style="color: #1d1d1f;">TLDR:</strong> ${escapeHtml(
      paper.tldr.trim()
    )}</p>`;
  }

  if (paper.abstract.trim()) {
    return `<p style="margin: 16px 0 0 0; color: #424245; font-size: 14px; line-height: 1.6;"><strong style="color: #1d1d1f;">Abstract excerpt:</strong> ${escapeHtml(
      truncateText(paper.abstract, ABSTRACT_EXCERPT_LIMIT)
    )}</p>`;
  }

  return `<p style="margin: 16px 0 0 0; color: #424245; font-size: 14px; line-height: 1.6;"><strong style="color: #1d1d1f;">Abstract excerpt:</strong> No abstract provided.</p>`;
}

function renderMetaLine(paper: RenderablePaper): string {
  const date = formatDate(paper.publishedAt);
  const values = [paper.journal, date].filter((value) => value.trim().length > 0);
  return `<p style="margin: 0 0 8px 0; color: #007aff; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">${escapeHtml(
    values.join(" · ")
  )}</p>`;
}

function renderAuthors(paper: RenderablePaper): string {
  if (!paper.authors || paper.authors.length === 0) {
    return "";
  }

  return `<p style="margin: 0 0 8px 0; color: #424245; font-size: 14px; line-height: 1.45;">${escapeHtml(
    paper.authors.join(", ")
  )}</p>`;
}

function renderAffiliation(paper: RenderablePaper): string {
  if (!paper.firstAffiliation?.trim()) {
    return "";
  }

  return `<p style="margin: 0 0 14px 0; color: #6e6e73; font-size: 13px; line-height: 1.45;">${escapeHtml(
    paper.firstAffiliation.trim()
  )}</p>`;
}

function renderPaper(paper: RenderablePaper): string {
  const score = `${(paper.score * 100).toFixed(1)}%`;
  const summary = renderSummary(paper);
  const authors = renderAuthors(paper);
  const affiliation = renderAffiliation(paper);

  return `
        <tr>
          <td style="padding: 0 0 18px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: separate; background: #ffffff; border: 1px solid #d9ebff; border-radius: 18px;">
              <tr>
                <td style="padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif; color: #1d1d1f;">
                  ${renderMetaLine(paper)}
                  <h2 style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif; font-size: 24px; line-height: 1.24; margin: 0 0 12px 0; color: #1d1d1f; letter-spacing: 0;">
                    <a href="${escapeHtml(paper.url)}" style="color: #1d1d1f; text-decoration: none;">${escapeHtml(
                      paper.title
                    )}</a>
                  </h2>
                  ${authors}
                  ${affiliation}
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td bgcolor="#007aff" style="background: #007aff; border-radius: 999px; padding: 8px 13px; color: #ffffff; font-size: 13px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;">Recommendation score: ${score}</td>
                    </tr>
                  </table>
                  ${summary}
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
}

function renderDailyRomance(romance: DailyRomance | null | undefined): string {
  if (!romance) return "";
  const attribution = [
    romance.author,
    romance.sourceTitle === romance.author ? "" : romance.sourceTitle
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" · ");
  return `<p style="margin: 26px auto 0 auto; max-width: 480px; color: #6e6e73; font-family: Georgia, 'Times New Roman', serif; font-size: 14px; line-height: 1.5;">&ldquo;${escapeHtml(
    romance.text
  )}&rdquo;</p>
                <p style="margin: 5px auto 0 auto; max-width: 480px; color: #86868b; font-size: 11px; line-height: 1.4; text-align: right;">&mdash; ${attribution} · <a href="${escapeHtml(
                  romance.sourceUrl
                )}" style="color: inherit; text-decoration: underline;">${escapeHtml(
                  romance.sourceName
                )}</a></p>`;
}

export function renderEmail(
  papers: RecommendedPaper[],
  romance?: DailyRomance | null
): string;
export function renderEmail(papers: RenderablePaper[], romance?: DailyRomance | null): string;
export function renderEmail(
  papers: RenderablePaper[],
  romance?: DailyRomance | null
): string {
  const sortedPapers = [...papers].sort((left, right) => right.score - left.score);
  const content =
    sortedPapers.length === 0
      ? `<tr><td style="background: #ffffff; border: 1px solid #d9ebff; border-radius: 18px; padding: 24px; color: #424245; font-size: 15px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;">No recommended papers today.</td></tr>`
      : sortedPapers.map(renderPaper).join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
    <title>Daily paper feeds</title>
  </head>
  <body bgcolor="#e8f4ff" style="margin: 0; padding: 0; background: #e8f4ff;">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent; mso-hide: all;">${EMAIL_PREHEADER}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#e8f4ff" style="width: 100%; background: #e8f4ff; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 34px 16px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif; color: #1d1d1f;">
          <table role="presentation" width="${EMAIL_WIDTH}" cellpadding="0" cellspacing="0" border="0" align="center" style="width: 100%; max-width: ${EMAIL_WIDTH}px; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 10px 2px 26px 2px; text-align: center;">
                <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif; font-size: 36px; line-height: 1.12; margin: 0; color: #007aff; letter-spacing: 0;">Daily paper feeds</h1>
                ${renderDailyRomance(romance)}
              </td>
            </tr>
            ${content}
            <tr>
              <td align="center" style="padding: 18px 2px 4px 2px; text-align: center; color: #6e6e73; font-size: 13px; line-height: 1.6;">
                <p style="margin: 0;">Built with <a href="${packageMetadata.homepage}" style="color: #007aff; font-weight: 700; text-decoration: none;">paper-daily-feed</a> by <a href="https://nehsgnail.github.io/" style="color: #007aff; font-weight: 700; text-decoration: none;">nehSgnaiL</a>.</p>
                <p style="margin: 8px 0 0 0;"><a href="${packageMetadata.homepage}#customization" style="color: inherit; font-size: 11px; text-decoration: underline;">Unsubscribe</a></p>
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
  if (!normalized) {
    throw new Error(`Missing required delivery value: ${label}.`);
  }
  return normalized;
}

function requiredPort(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`Expected delivery value ${label} to be a number.`);
  }
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
      auth: {
        user: emailAddress(sender),
        pass: senderPassword
      }
    });

    try {
      return await transporter.sendMail({
        from: formatSender(sender),
        to: receiver,
        subject,
        html
      });
    } catch (error) {
      const retryDelay = SMTP_RETRY_DELAYS_MS[attempt];
      if (!isSmtpConnectionError(error) || retryDelay === undefined) {
        throw error;
      }

      console.warn(
        `SMTP connection attempt ${attempt + 1}/${SMTP_RETRY_DELAYS_MS.length + 1} failed; retrying in ${retryDelay}ms.`
      );
      await wait(retryDelay);
    }
  }
}
