import nodemailer from "nodemailer";
import type { DeliveryConfig } from "./app-config.js";
import type { RecommendedPaper } from "./types.js";

const ABSTRACT_EXCERPT_LIMIT = 280;

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
    return `<p style="margin: 16px 0 0; color: #424245; font-size: 14px; line-height: 1.6;"><strong style="color: #1d1d1f;">TLDR:</strong> ${escapeHtml(
      paper.tldr.trim()
    )}</p>`;
  }

  if (paper.abstract.trim()) {
    return `<p style="margin: 16px 0 0; color: #424245; font-size: 14px; line-height: 1.6;"><strong style="color: #1d1d1f;">Abstract excerpt:</strong> ${escapeHtml(
      truncateText(paper.abstract, ABSTRACT_EXCERPT_LIMIT)
    )}</p>`;
  }

  return `<p style="margin: 16px 0 0; color: #424245; font-size: 14px; line-height: 1.6;"><strong style="color: #1d1d1f;">Abstract excerpt:</strong> No abstract provided.</p>`;
}

function renderMetaLine(paper: RenderablePaper): string {
  const date = formatDate(paper.publishedAt);
  const values = [paper.journal, date].filter((value) => value.trim().length > 0);
  return `<p style="margin: 0 0 8px; color: #007aff; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">${escapeHtml(
    values.join(" · ")
  )}</p>`;
}

function renderAuthors(paper: RenderablePaper): string {
  if (!paper.authors || paper.authors.length === 0) {
    return "";
  }

  return `<p style="margin: 0 0 8px; color: #424245; font-size: 14px; line-height: 1.45;">${escapeHtml(
    paper.authors.join(", ")
  )}</p>`;
}

function renderAffiliation(paper: RenderablePaper): string {
  if (!paper.firstAffiliation?.trim()) {
    return "";
  }

  return `<p style="margin: 0 0 14px; color: #6e6e73; font-size: 13px; line-height: 1.45;">${escapeHtml(
    paper.firstAffiliation.trim()
  )}</p>`;
}

function renderPaper(paper: RenderablePaper): string {
  const score = `${(paper.score * 100).toFixed(1)}%`;
  const summary = renderSummary(paper);
  const authors = renderAuthors(paper);
  const affiliation = renderAffiliation(paper);

  return `
          <article style="background: #ffffff; border: 1px solid #d9ebff; border-radius: 18px; padding: 24px; margin: 0 0 18px; box-shadow: 0 8px 24px rgba(0, 122, 255, 0.08);">
            ${renderMetaLine(paper)}
            <h2 style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif; font-size: 24px; line-height: 1.24; margin: 0 0 12px; color: #1d1d1f; letter-spacing: 0;">
              <a href="${escapeHtml(paper.url)}" style="color: #1d1d1f; text-decoration: none;">${escapeHtml(
                paper.title
              )}</a>
            </h2>
            ${authors}
            ${affiliation}
            <p style="display: inline-block; margin: 0; padding: 8px 13px; border-radius: 999px; background: #007aff; color: #ffffff; font-size: 13px; font-weight: 700; box-shadow: 0 4px 12px rgba(0, 122, 255, 0.24);">Recommendation score: ${score}</p>
            ${summary}
          </article>`;
}

export function renderEmail(papers: RecommendedPaper[]): string;
export function renderEmail(papers: RenderablePaper[]): string;
export function renderEmail(papers: RenderablePaper[]): string {
  const content =
    papers.length === 0
      ? `<div style="background: #ffffff; border: 1px solid #d9ebff; border-radius: 18px; padding: 24px; color: #424245; font-size: 15px; line-height: 1.6; box-shadow: 0 8px 24px rgba(0, 122, 255, 0.08);">No recommended papers today.</div>`
      : papers.map(renderPaper).join("\n");

  return `<!doctype html>
<html>
  <body style="margin: 0; padding: 0; background: #e8f4ff;">
    <div style="background: linear-gradient(135deg, #e8f4ff 0%, #ffffff 100%); margin: 0; padding: 34px 16px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif; color: #1d1d1f;">
      <main style="max-width: 680px; margin: 0 auto;">
        <header style="padding: 10px 2px 26px; margin: 0 0 22px; text-align: center;">
          <p style="margin: 0 0 8px; color: #007aff; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;">Research Bulletin</p>
          <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif; font-size: 36px; line-height: 1.12; margin: 0; color: #007aff; letter-spacing: 0;">Daily paper feeds</h1>
          <p style="margin: 12px auto 0; color: #6e6e73; font-size: 15px; line-height: 1.55; max-width: 520px;">A recommendation of papers based on your research interests.</p>
        </header>
        ${content}
        <footer style="padding: 18px 2px 4px; text-align: center; color: #6e6e73; font-size: 13px; line-height: 1.6;">
          <p style="margin: 0;">Built with <a href="https://github.com/nehSgnaiL/paper-daily-feed" style="color: #007aff; font-weight: 700; text-decoration: none;">paper-daily-feed</a>.</p>
        </footer>
      </main>
    </div>
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

export async function sendEmail(
  delivery: DeliveryConfig,
  html: string,
  subject: string
): Promise<unknown> {
  const sender = requiredValue(delivery.from, "from");
  const receiver = requiredValue(delivery.to, "to");
  const smtpServer = requiredValue(delivery.smtpHost, "smtpHost");
  const smtpPort = requiredPort(delivery.smtpPort, "smtpPort");
  const senderPassword = requiredValue(delivery.smtpPassword, "smtpPassword");

  const transporter = nodemailer.createTransport({
    host: smtpServer,
    port: smtpPort,
    secure: smtpPort === 465,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    auth: {
      user: sender,
      pass: senderPassword
    }
  });

  return transporter.sendMail({
    from: sender,
    to: receiver,
    subject,
    html
  });
}
