import nodemailer from "nodemailer";
import type { AppConfig } from "./config.js";
import type { RankedPaper } from "./types.js";

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

function renderPaper(paper: RankedPaper): string {
  const score = `${(paper.score * 100).toFixed(1)}%`;
  const matched = paper.matchedZoteroTitle
    ? `<p style="margin: 6px 0; color: #555;"><strong>Closest Zotero match:</strong> ${escapeHtml(
        paper.matchedZoteroTitle
      )}</p>`
    : "";

  return `
    <article style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin: 0 0 16px; font-family: Arial, sans-serif;">
      <p style="margin: 0 0 6px; color: #666; font-size: 13px;">${escapeHtml(paper.journal)} · ${formatDate(
        paper.publishedAt
      )}</p>
      <h2 style="font-size: 18px; margin: 0 0 8px;"><a href="${escapeHtml(
        paper.url
      )}" style="color: #174ea6; text-decoration: none;">${escapeHtml(paper.title)}</a></h2>
      <p style="margin: 6px 0; color: #333;"><strong>Recommendation score:</strong> ${score}</p>
      ${matched}
      <p style="margin: 10px 0 0; line-height: 1.45; color: #333;"><strong>TLDR:</strong> ${escapeHtml(
        paper.tldr || paper.abstract || "No abstract provided."
      )}</p>
    </article>`;
}

export function renderEmail(papers: RankedPaper[]): string {
  const content =
    papers.length === 0
      ? `<p style="font-family: Arial, sans-serif;">No recommended papers today.</p>`
      : papers.map(renderPaper).join("\n");

  return `<!doctype html>
<html>
  <body>
    <h1 style="font-family: Arial, sans-serif; font-size: 22px;">Daily paper feeds</h1>
    ${content}
  </body>
</html>`;
}

export async function sendEmail(config: AppConfig, html: string, subject: string): Promise<unknown> {
  const transporter = nodemailer.createTransport({
    host: config.email.smtpServer,
    port: config.email.smtpPort,
    secure: config.email.smtpPort === 465,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    auth: {
      user: config.email.sender,
      pass: config.email.senderPassword
    }
  });

  return transporter.sendMail({
    from: config.email.sender,
    to: config.email.receiver,
    subject,
    html
  });
}
