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
    return "Unknown date";
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

function renderMatchLine(paper: RenderablePaper): string {
  if (!paper.matchContext) {
    return "";
  }

  if (paper.matchContext.bestMatchTitle) {
    return `<p style="margin: 12px 0 0; color: #6f4f1f; font-size: 13px; line-height: 1.45;"><strong style="color: #4f3514;">Matched your interests:</strong> ${escapeHtml(
      paper.matchContext.bestMatchTitle
    )}</p>`;
  }

  if (paper.matchContext.bestMatchTopics.length > 0) {
    return `<p style="margin: 12px 0 0; color: #6f4f1f; font-size: 13px; line-height: 1.45;"><strong style="color: #4f3514;">Matched your interests:</strong> ${escapeHtml(
      paper.matchContext.bestMatchTopics.join(", ")
    )}</p>`;
  }

  return "";
}

function renderSummary(paper: RenderablePaper): string {
  if (paper.tldr?.trim()) {
    return `<p style="margin: 14px 0 0; color: #334155; font-size: 14px; line-height: 1.6;"><strong style="color: #111827;">TLDR:</strong> ${escapeHtml(
      paper.tldr.trim()
    )}</p>`;
  }

  if (paper.abstract.trim()) {
    return `<p style="margin: 14px 0 0; color: #334155; font-size: 14px; line-height: 1.6;"><strong style="color: #111827;">Abstract excerpt:</strong> ${escapeHtml(
      truncateText(paper.abstract, ABSTRACT_EXCERPT_LIMIT)
    )}</p>`;
  }

  return `<p style="margin: 14px 0 0; color: #334155; font-size: 14px; line-height: 1.6;"><strong style="color: #111827;">Abstract excerpt:</strong> No abstract provided.</p>`;
}

function renderPaper(paper: RenderablePaper): string {
  const score = `${(paper.score * 100).toFixed(1)}%`;
  const matchLine = renderMatchLine(paper);
  const summary = renderSummary(paper);

  return `
          <article style="background: #ffffff; border: 1px solid #e6dfd3; border-radius: 18px; padding: 24px; margin: 0 0 18px; box-shadow: 0 1px 0 rgba(20, 16, 10, 0.04);">
            <p style="margin: 0 0 8px; color: #7c6f64; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">${escapeHtml(
              paper.journal
            )} · ${formatDate(
        paper.publishedAt
      )}</p>
            <h2 style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; line-height: 1.24; margin: 0 0 14px; color: #1f2933;">
              <a href="${escapeHtml(paper.url)}" style="color: #1f2933; text-decoration: none;">${escapeHtml(
                paper.title
              )}</a>
            </h2>
            <p style="display: inline-block; margin: 0; padding: 7px 11px; border-radius: 999px; background: #f5ead8; color: #5c3d12; font-size: 13px; font-weight: 700;">Recommendation score: ${score}</p>
            ${matchLine}
            ${summary}
          </article>`;
}

export function renderEmail(papers: RecommendedPaper[]): string;
export function renderEmail(papers: RenderablePaper[]): string;
export function renderEmail(papers: RenderablePaper[]): string {
  const content =
    papers.length === 0
      ? `<div style="background: #ffffff; border: 1px solid #e6dfd3; border-radius: 18px; padding: 24px; color: #4b5563; font-size: 15px; line-height: 1.6;">No recommended papers today.</div>`
      : papers.map(renderPaper).join("\n");

  return `<!doctype html>
<html>
  <body style="margin: 0; padding: 0; background: #f6f1e8;">
    <div style="background: #f6f1e8; margin: 0; padding: 32px 16px; font-family: Arial, Helvetica, sans-serif; color: #1f2933;">
      <main style="max-width: 680px; margin: 0 auto;">
        <header style="padding: 8px 2px 24px; border-bottom: 1px solid #ded4c5; margin: 0 0 22px;">
          <p style="margin: 0 0 8px; color: #9a6a21; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;">Research Bulletin</p>
          <h1 style="font-family: Georgia, 'Times New Roman', serif; font-size: 34px; line-height: 1.12; margin: 0; color: #18212f;">Daily paper feeds</h1>
          <p style="margin: 12px 0 0; color: #6b7280; font-size: 15px; line-height: 1.55;">A concise digest of papers aligned with your research interests.</p>
        </header>
        ${content}
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
