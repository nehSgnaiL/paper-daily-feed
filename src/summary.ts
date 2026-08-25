import type { SummaryConfig } from "./app-config.js";
import type { RecommendedPaper } from "./types.js";

const MAX_ABSTRACT_INPUT_LENGTH = 4_000;
const BRIEFING_META_LANGUAGE = [
  /\b(?:this|the) (?:brief|briefing|digest|newsletter)\b/iu,
  /\b(?:today['’]s|these|the selected) papers\b/iu,
  /\b(?:this|the) (?:email|recommendation|selection)\b/iu,
  /(?:本|这份|这个)(?:简报|摘要|邮件|推荐)/u,
  /(?:今天|今日|这些|本期|所选)(?:的)?论文/u
];

export type PaperBrief = {
  takeaway: string;
  tldr: string;
};

export type EditorialDigest = {
  headline: string;
  overview: string;
  preheader: string;
  papers: PaperBrief[];
};

export type SummarizeDigest = (
  papers: RecommendedPaper[],
  researchProfile: string
) => Promise<EditorialDigest>;

function compact(value: string, maxLength = Number.POSITIVE_INFINITY): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function responseJson(content: string): unknown {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("Generation API returned no JSON object.");
  }
  return JSON.parse(content.slice(start, end + 1));
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Generation API returned an invalid ${label}.`);
  }
  return compact(value);
}

function researchSynthesis(value: unknown, label: string): string {
  const text = requiredText(value, label);
  if (BRIEFING_META_LANGUAGE.some((pattern) => pattern.test(text))) {
    throw new Error(`Generation API returned ${label} with briefing meta-language.`);
  }
  return text;
}

function parseDigest(value: unknown, paperCount: number): EditorialDigest {
  if (!value || typeof value !== "object") {
    throw new Error("Generation API returned an invalid digest.");
  }

  const candidate = value as Record<string, unknown>;
  const paperBriefs = candidate.papers;
  if (!Array.isArray(paperBriefs) || paperBriefs.length !== paperCount) {
    throw new Error("Generation API returned the wrong number of paper briefs.");
  }

  return {
    headline: researchSynthesis(candidate.headline, "headline"),
    overview: researchSynthesis(candidate.overview, "overview"),
    preheader: compact(requiredText(candidate.preheader, "preheader"), 180),
    papers: paperBriefs.map((paperBrief, index) => {
      if (!paperBrief || typeof paperBrief !== "object") {
        throw new Error(`Generation API returned an invalid brief for paper ${index}.`);
      }
      const brief = paperBrief as Record<string, unknown>;
      return {
        takeaway: requiredText(brief.takeaway, `takeaway for paper ${index}`),
        tldr: requiredText(brief.tldr, `tldr for paper ${index}`)
      };
    })
  };
}

function paperPrompt(paper: RecommendedPaper, index: number): string {
  const match = paper.matchContext;
  const matchHint = match
    ? [match.bestMatchTitle, ...match.bestMatchTopics].filter(Boolean).join(", ")
    : "None";

  return [
    `Paper ${index}`,
    `Journal: ${paper.journal}`,
    `Title: ${paper.title}`,
    `Abstract: ${compact(paper.abstract || "No abstract provided.", MAX_ABSTRACT_INPUT_LENGTH)}`,
    `Matching hint: ${matchHint || "None"}`
  ].join("\n");
}

export function createOpenAIEditorialSummarizer(config: SummaryConfig): SummarizeDigest {
  return async (papers, researchProfile) => {
    const apiKey = config.apiKey.trim();
    if (!apiKey) {
      throw new Error("Missing summary API key.");
    }
    if (papers.length === 0) {
      throw new Error("Cannot generate an editorial digest without papers.");
    }

    const endpoint = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content: [
              "You are the careful editor of a personalized academic paper briefing.",
              `Write all reader-facing copy in ${config.language}.`,
              "Your job is to help the reader decide quickly whether each paper is worth opening.",
              "Use only the supplied titles, abstracts, and research profile. Never invent results, claims, or trends.",
              "The headline must be one fluent, complete, conclusion-led sentence with a clear grammatical subject and predicate: name a research area, object, method, or direction and state what is changing, emerging, being revealed, or becoming possible.",
              "Never return a noun phrase, topic label, colon heading, keyword list, or stack of research terms as the headline.",
              "The headline and overview must speak directly about the research, never about the briefing process, the repository, the email, the editor, the reader, the recommendation, or the set of selected papers.",
              "Do not use framing such as this brief, this briefing, today's papers, these papers, the selected papers, we highlight, 本简报, 今天的论文, 这些论文, or 本期推荐.",
              "The overview must directly explain the headline's research conclusion with concrete methods, findings, contrasts, or shared directions from the supplied papers, without introducing or summarizing the email itself.",
              "Synthesize only when a genuine shared thread exists; otherwise state the distinct research directions directly without referring to the papers as a collection.",
              "Each takeaway must be one fluent, conclusion-led sentence that states the paper's main contribution, finding, or methodological advance: the single point the reader should remember.",
              "Each paper tldr must be a faithful, concise translation and compression of that paper's supplied abstract into the requested language, using the title only as context.",
              "A tldr may use multiple fluent sentences when needed to preserve the abstract's concrete method, contribution, scope, findings, or qualifications; do not force it into one sentence.",
              "The takeaway should prioritize the central result or advance, while the tldr should supply concise abstract-level context; they must not repeat the same sentence or merely paraphrase each other.",
              "Never return a method name or noun phrase by itself, merely restate the title, add praise or significance, mention the reader or research profile, explain recommendation fit, or mention a recommendation score.",
              "Keep each tldr concise even when it uses multiple sentences; retain only the abstract details that materially help the reader understand the work.",
              "If the abstract does not support a claimed result, describe only what the paper examines or proposes; never fill the gap by guessing.",
              "Keep the headline under 14 words, overview to at most 2 sentences, each takeaway to exactly 1 sentence, and preheader under 140 characters.",
              "Return only one JSON object with exactly these keys: headline, overview, preheader, papers.",
              "Each item in papers must contain exactly takeaway and tldr, in the same order as the input papers."
            ].join(" ")
          },
          {
            role: "user",
            content: `Reader research profile:\n${compact(researchProfile) || "No profile supplied."}\n\n${papers
              .map(paperPrompt)
              .join("\n\n")}`
          }
        ],
        temperature: 0.2,
        ...(config.maxTokens ? { max_tokens: config.maxTokens } : {})
      })
    });

    if (!response.ok) {
      throw new Error(`Generation API request failed (${response.status} ${response.statusText}).`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Generation API returned empty content.");
    }
    return parseDigest(responseJson(content), papers.length);
  };
}
