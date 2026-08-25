import { writeFile } from "node:fs/promises";
import { renderEmail } from "../src/email.js";
import type { EditorialDigest } from "../src/summary.js";
import type { RecommendedPaper } from "../src/types.js";

const papers: RecommendedPaper[] = [
  {
    journal: "Travel Behaviour and Society",
    title: "Predicting short-term urban bike sharing demand in a coupled continuous and network space",
    abstract:
      "This study proposes GeoTopo-Net, a framework that jointly models dependencies in continuous and network spaces to improve short-term bike-sharing demand prediction across heterogeneous urban contexts.",
    url: "https://example.com/geotopo-net",
    publishedAt: new Date("2026-08-24T00:00:00Z"),
    authors: ["Shen Liang", "Yang Xu", "Guangyue Li", "Xiaohu Zhang", "Qiuping Li"],
    firstAffiliation: "The Hong Kong Polytechnic University",
    score: 0.91,
    matchContext: {
      bestMatchSource: "profile",
      bestMatchTitle: "Urban mobility and geospatial AI",
      bestMatchTopics: ["human mobility", "spatial modeling"]
    }
  },
  {
    journal: "Nature Cities",
    title: "Street-network accessibility reveals unequal exposure to urban heat",
    abstract:
      "By combining pedestrian networks with high-resolution thermal observations, the authors identify neighborhoods where limited access to shaded routes compounds heat exposure and mobility disadvantage.",
    url: "https://example.com/heat-access",
    publishedAt: new Date("2026-08-23T00:00:00Z"),
    authors: ["Ada Lovelace", "Grace Hopper"],
    firstAffiliation: "Example Urban Analytics Lab",
    score: 0.84,
    matchContext: {
      bestMatchSource: "zotero",
      bestMatchTitle: "Transport equity under climate risk",
      bestMatchTopics: ["accessibility", "climate resilience"]
    }
  },
  {
    journal: "Computers, Environment and Urban Systems",
    title: "Learning transferable mobility representations from sparse trajectory data",
    abstract:
      "The paper introduces a self-supervised representation method that transfers across cities with limited labeled trajectories while preserving interpretable temporal and geographic structure.",
    url: "https://example.com/mobility-representations",
    publishedAt: new Date("2026-08-22T00:00:00Z"),
    authors: ["Lin Chen", "Maria Santos", "Noah Williams"],
    score: 0.78,
    matchContext: {
      bestMatchSource: "reference-paper",
      bestMatchTitle: "Foundation models for human mobility",
      bestMatchTopics: ["representation learning"]
    }
  }
];

const digest: EditorialDigest = {
  headline: "Spatial structure is becoming part of the model",
  overview:
    "Networks, accessibility, and geography are moving from background context into the learning objective itself. This shift supports urban models that transfer across settings without losing spatial meaning.",
  preheader: "Start with GeoTopo-Net, then explore heat equity and transferable mobility representations.",
  papers: [
    {
      takeaway:
        "GeoTopo-Net makes street-network topology a first-class signal in short-term bike-sharing prediction.",
      tldr:
        "The model jointly learns continuous-space and street-network dependencies from urban bike-sharing demand data."
    },
    {
      takeaway:
        "Pedestrian-network accessibility reveals where missing shaded routes intensify unequal heat exposure.",
      tldr:
        "The study measures neighborhood heat risk through the accessibility of shaded routes on pedestrian networks."
    },
    {
      takeaway:
        "Self-supervised mobility representations remain transferable when labeled trajectories are scarce.",
      tldr:
        "The method learns temporal and geographic structure from sparse trajectories for transfer across cities."
    }
  ]
};

const romance = {
  text: "The quieter you become, the more you are able to hear.",
  author: "Rumi",
  sourceTitle: "",
  sourceUrl: "https://zenquotes.io/",
  sourceName: "ZenQuotes"
};

const date = new Date("2026-08-25T00:00:00Z");

function resolvePreviewIcons(html: string): string {
  return html.replaceAll("cid:paper-daily-feed-icon", "./paper-daily-feed-icon.png");
}

await Promise.all([
  writeFile(
    "docs/email-preview.html",
    resolvePreviewIcons(renderEmail(papers, romance, digest, date))
  ),
  writeFile(
    "docs/email-preview-no-llm.html",
    resolvePreviewIcons(renderEmail(papers, romance, null, date))
  )
]);

console.log("Rendered docs/email-preview.html and docs/email-preview-no-llm.html");
