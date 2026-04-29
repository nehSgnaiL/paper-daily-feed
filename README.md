# paper-daily-feed

Daily paper recommendations from journal RSS feeds, ranked against your research interests and delivered as an email digest.

The app has two equal interest-source paths:

- Interest profile: describe your research area directly in config.
- Zotero: use papers and abstracts from a Zotero library.

You can enable either path or both. When both are enabled, the app merges them into one interest corpus before matching papers.

## GitHub Setup

### 1. Repository Secret

Create this repository secret:

| Key | Description |
| --- | --- |
| `APP_CONFIG` | Canonical JSON configuration for interests, feeds, matching, summary, delivery, and runtime behavior |

Minimal profile-first example:

```json
{
  "interests": {
    "profile": {
      "enabled": true,
      "summary": "Urban mobility, transport equity, and climate adaptation.",
      "topics": ["urban mobility", "transport equity", "climate adaptation"],
      "methods": ["GIS", "causal inference"],
      "favoriteJournals": ["Nature Cities"],
      "avoidTopics": ["protein folding"],
      "referencePapers": [
        {
          "title": "Transit accessibility and climate resilience",
          "abstract": "Public transit accessibility, climate adaptation, and cities."
        }
      ]
    },
    "zotero": {
      "enabled": false
    }
  },
  "feeds": {
    "catalogSelections": ["Nature", "Science", "Nature Cities"],
    "customRss": [
      {
        "name": "Example Lab Feed",
        "rss": "https://example.test/feed.xml"
      }
    ]
  },
  "matching": {
    "provider": "api",
    "api": {
      "baseUrl": "https://api.openai.com/v1",
      "model": "text-embedding-3-small",
      "apiKeyEnv": "EMBEDDING_API_KEY",
      "batchSize": 32
    },
    "local": {
      "model": "Xenova/all-MiniLM-L6-v2",
      "batchSize": 16
    },
    "paperLimit": 10,
    "maxPaperAgeDays": 7
  },
  "summary": {
    "enabled": false,
    "baseUrl": "https://api.openai.com/v1",
    "model": "gpt-4o-mini",
    "apiKeyEnv": "OPENAI_API_KEY",
    "language": "English",
    "maxTokens": 1024
  },
  "delivery": {
    "mode": "smtp",
    "fromEnv": "SENDER",
    "toEnv": "RECEIVER",
    "smtpHostEnv": "SMTP_SERVER",
    "smtpPortEnv": "SMTP_PORT",
    "smtpPasswordEnv": "SENDER_PASSWORD"
  },
  "runtime": {
    "debug": false,
    "sendEmpty": false
  }
}
```

Zotero-first example:

```json
{
  "interests": {
    "profile": {
      "enabled": false
    },
    "zotero": {
      "enabled": true,
      "userId": "12345678",
      "apiKeyEnv": "ZOTERO_KEY",
      "libraryType": "user",
      "includeCollections": ["2026/survey/**"],
      "excludeCollections": ["archive/**"]
    }
  },
  "feeds": {
    "catalogSelections": ["Nature", "Science"],
    "customRss": []
  }
}
```

### 2. Repository Secrets

Create these secrets as needed:

| Key | Required When |
| --- | --- |
| `SENDER` | sending email |
| `SENDER_PASSWORD` | sending email |
| `RECEIVER` | sending email |
| `SMTP_SERVER` | sending email |
| `SMTP_PORT` | sending email |
| `EMBEDDING_API_KEY` | using API embeddings |
| `OPENAI_API_KEY` | generating TLDR summaries |
| `ZOTERO_KEY` | using Zotero interests |

Keep credentials in separate secrets and reference them through `apiKeyEnv` or delivery env fields. `APP_CONFIG` is also stored as a secret because GitHub Actions prints non-secret env values in logs.

## Matching

The matcher uses an OpenAI-compatible embeddings API first when `matching.provider` is `api` and the configured API key exists. If the API key is missing, it falls back to the configured local Hugging Face model.

The default local model is selected for practical GitHub Actions runtime rather than maximum benchmark quality.

## Feeds

The app supports bundled catalog feeds and direct RSS feeds.

- `feeds.catalogSelections`: names or abbreviations from `data/journals.config.ts`; empty means all bundled feeds.
- `feeds.customRss`: direct RSS entries with `name` and `rss`.

## CLI

```bash
npm start -- run
npm run preview-email
npm run setup-profile
npm run test:config
```

Modes:

- `run`: fetch, match, summarize if enabled, render, and send.
- `preview-email`: fetch, match, render HTML, and print it without sending.
- `setup-profile`: print a starter profile JSON fragment.
- `test-config`: validate that `APP_CONFIG` or `config/app.json` can load.

## Local Run

```bash
npm install
cp .env.example .env.local
npm run test:config
npm run preview-email
```

For local development, you can set `APP_CONFIG` in `.env.local` or create `config/app.json`.

## Workflows

- Daily digest: `.github/workflows/daily.yml`
- Manual preview: `.github/workflows/test.yml`
- CI: `.github/workflows/ci.yml`

## Reference

Inspired by [TideDra/zotero-arxiv-daily](https://github.com/TideDra/zotero-arxiv-daily).
