# paper-daily-feed

> The AI era's paper bloom is exhausting to track. If you are tired of endlessly chasing new publications, this repository curates a daily recommendation & summary tailored exactly to your vibe.

The recommendation can be produced via two sources (enable either one or both):

- Interest profile: describe your research area directly in config.
- Zotero library: use papers and abstracts in Zotero library.


## GitHub Setup

### 1. Fork the Repository

- Go to: https://github.com/nehSgnaiL/paper-daily-feed
- Click the **"Fork"** button in the top-right corner
- Select your GitHub account as the destination

### 2. Create Repository Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **Variables**. Then create these secrets as needed:

| Function | Key | Description | Example |
| --- | --- | --- | --- |
| Email | `RECEIVER` | Email address that receives recommendations. Required when sending email. | `reader@example.com` |
| Email | `SENDER` | Email account used by the SMTP server to send recommendations. | `digest@example.com` |
| Email | `SENDER_PASSWORD` | Sender account password or SMTP authentication code. This may differ from the email login password. | `app-password-or-token` |
| Email | `SMTP_SERVER` | SMTP server that sends the email. | `smtp.example.com` |
| Email | `SMTP_PORT` | SMTP server port. | `465` |
| LLM summary | `OPENAI_BASE_URL` | OpenAI-compatible LLM API, required when summarying paper. You can get FREE API for using open source LLMs (e.g., `Qwen/Qwen3-8B`) in [SiliconFlow](https://cloud.siliconflow.cn/i/p9BtMTtU). | `https://api.siliconflow.cn/v1` |
| LLM summary | `OPENAI_API_KEY` | Summary generation API key. Required when generating TLDR summaries. | `sk-...` |
| Zotero | `ZOTERO_ID` | Zotero user or group ID (not your username). Get it from [here](https://www.zotero.org/settings/security). Required when using Zotero Library. | `1234567` |
| Zotero | `ZOTERO_KEY` | Zotero API key with read access. Get key from [here](https://www.zotero.org/settings/security). Required when using Zotero Library. | `zotero-api-key` |
| Embeddings | `EMBEDDING_BASE_URL` | If this is not specified, the default local embedding model will be used. | `https://api.openai.com/v1` |
| Embeddings | `EMBEDDING_API_KEY` | Embeddings API key. Required when using API embeddings. | `sk-...` |

### 3. Create Repository Variable `APP_CONFIG`

In **Settings** → **Secrets and variables** → **Actions** → **Variables**, create a variable named `APP_CONFIG`.

> [!TIP]
> Use `${oc.env:SECRET_NAME}` syntax to reference secrets (e.g., `"apiKey": "${oc.env:OPENAI_API_KEY}"`)

#### Example: Profile-First Config:

```json
{
  "interests": {
    "profile": {
      "enabled": true,
      "summary": "Urban mobility, transport equity, and climate adaptation.",
      "topics": ["urban mobility", "transport equity", "climate adaptation"],
      "methods": ["deep learning"],
      "favoriteJournals": ["Nature"],
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

#### Example Zotero-First Config:

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

Full config refers to [`config/app.example.json`](./config/app.example.json) for all available options.

### 4. Validation

1. Go to **Actions** tab in your forked repo
2. Run the workflow: **"Test paper feeds"**
3. Check logs to confirm config loads correctly

## Local Run

```bash
npm install
cp .env.example .env.local
cp config/app.example.json config/app.json
npm run test:config
npm run preview-email
npm run test:feeds:live
```

For local development, keep non-secret app settings in `config/app.json` and secrets in `.env.local`. `${oc.env:NAME}` references are resolved when the config loads, so the same config shape works locally and in GitHub Actions. `APP_CONFIG` is still supported for GitHub repository variables.

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


## Feeds

The app supports bundled catalog feeds and direct RSS feeds.

- `feeds.catalogSelections`: names or abbreviations from `data/journals.config.ts`; empty means all bundled feeds.
- `feeds.customRss`: direct RSS entries with `name` and `rss`.

Run `npm run test:feeds:live` to smoke-test the current bundled publisher feeds against live RSS. Default tests use fixtures and do not require network access.


## Reference

Inspired by [TideDra/zotero-arxiv-daily](https://github.com/TideDra/zotero-arxiv-daily).
