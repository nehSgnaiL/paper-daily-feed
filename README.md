# paper-daily-feed

Daily paper recommendations from journal RSS feeds, ranked against your research interests and delivered as an email digest.

The app has two equal interest-source paths:

- Interest profile: describe your research area directly in config.
- Zotero: use papers and abstracts from a Zotero library.

You can enable either path or both. When both are enabled, the app merges them into one interest corpus before matching papers.

## GitHub Setup

### 1. Create Referenced Secrets

Use GitHub repository secrets for sensitive values. Inside `APP_CONFIG`, reference them with `${oc.env:NAME}` instead of pasting the secret directly into the JSON.

Example secret-backed fields:

- `"apiKey": "${oc.env:OPENAI_API_KEY}"`
- `"userId": "${oc.env:ZOTERO_ID}"`
- `"smtpPassword": "${oc.env:SENDER_PASSWORD}"`

Fields not shown with `${oc.env:...}` can stay as plain values in `APP_CONFIG`.

Create these secrets as needed:

| Key | Required When |
| --- | --- |
| `SENDER` | sending email |
| `SENDER_PASSWORD` | sending email |
| `RECEIVER` | sending email |
| `SMTP_SERVER` | sending email |
| `SMTP_PORT` | sending email |
| `OPENAI_BASE_URL` | using summary generation API via a secret-backed URL |
| `EMBEDDING_BASE_URL` | using embeddings API via a secret-backed URL |
| `EMBEDDING_API_KEY` | using API embeddings |
| `OPENAI_API_KEY` | generating TLDR summaries |
| `ZOTERO_ID` | using Zotero interests via a secret-backed user or group id |
| `ZOTERO_KEY` | using Zotero interests |

### 2. Create `APP_CONFIG`

Create one repository secret named `APP_CONFIG`. This is the canonical JSON config for interests, feeds, matching, summary, delivery, and runtime behavior.

Minimal profile-first `APP_CONFIG`:

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
  "runtime": {
    "debug": false,
    "sendEmpty": false
  }
}
```

Full example with API matching, optional summaries, and SMTP delivery:

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
      "baseUrl": "${oc.env:EMBEDDING_BASE_URL}",
      "model": "text-embedding-3-small",
      "apiKey": "${oc.env:EMBEDDING_API_KEY}",
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
    "baseUrl": "${oc.env:OPENAI_BASE_URL}",
    "model": "gpt-4o-mini",
    "apiKey": "${oc.env:OPENAI_API_KEY}",
    "language": "English",
    "maxTokens": 1024
  },
  "delivery": {
    "mode": "smtp",
    "from": "${oc.env:SENDER}",
    "to": "${oc.env:RECEIVER}",
    "smtpHost": "${oc.env:SMTP_SERVER}",
    "smtpPort": "${oc.env:SMTP_PORT}",
    "smtpPassword": "${oc.env:SENDER_PASSWORD}"
  },
  "runtime": {
    "debug": false,
    "sendEmpty": false
  }
}
```

Zotero-first `APP_CONFIG`:

```json
{
  "interests": {
    "profile": {
      "enabled": false
    },
    "zotero": {
      "enabled": true,
      "userId": "${oc.env:ZOTERO_ID}",
      "apiKey": "${oc.env:ZOTERO_KEY}",
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

### 3. Validate the Config

After creating the referenced secrets and `APP_CONFIG`, run:

```bash
npm run test:config
```

`APP_CONFIG` is also stored as a secret because GitHub Actions prints non-secret env values in logs.

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

For local development, you can set `APP_CONFIG` in `.env.local` or create `config/app.json`. `${oc.env:NAME}` references are resolved when the config loads, so the same config shape works locally and in GitHub Actions.

## Workflows

- Daily digest: `.github/workflows/daily.yml`
- Manual preview: `.github/workflows/test.yml`
- CI: `.github/workflows/ci.yml`

## Reference

Inspired by [TideDra/zotero-arxiv-daily](https://github.com/TideDra/zotero-arxiv-daily).
