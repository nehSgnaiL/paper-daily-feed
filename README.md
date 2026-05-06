# paper-daily-feed

> The AI era's paper bloom is exhausting to track. If you are tired of endlessly chasing new publications, this repository curates a daily recommendation & summary tailored exactly to your vibe.

<p align="center">
  <div style="max-width:600px;margin:auto;">
    <article style="background: #ffffff; border: 1px solid #d9ebff; border-radius: 18px; padding: 24px; margin: 0 0 18px; box-shadow: 0 8px 24px rgba(0, 122, 255, 0.08);">
      <p style="margin: 0 0 8px; color: #007aff; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">Travel Behaviour and Society</p>
      <h2 style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif; font-size: 20px; line-height: 1.24; margin: 0 0 12px; color: #1d1d1f; letter-spacing: 0;">
        <a href="https://linkinghub.elsevier.com/retrieve/pii/S2214367X2500170X" style="color: #1d1d1f; text-decoration: none;">Predicting short-term urban bike sharing demand in a coupled continuous and network space</a>
      </h2>
      <p style="display: inline-block; margin: 0; padding: 8px 13px; border-radius: 999px; background: #007aff; color: #ffffff; font-size: 11px; font-weight: 700; box-shadow: 0 4px 12px rgba(0, 122, 255, 0.24);">Recommendation score: 62.0%</p>
      <p style="margin: 16px 0 0; color: #424245; font-size: 12px; line-height: 1.6;"><strong style="color: #1d1d1f;">TLDR:</strong> This study proposes GeoTopo-Net, a framework that jointly models dependencies in continuous and network spaces to significantly improve the accuracy of short-term urban bike sharing demand prediction.</p>
    </article>
  </div>
</p>


The recommendation can be produced via two sources (enable either one or both):

- Interest profile: describe your research area directly in config.
- Zotero library: use papers and abstracts in Zotero library.


## Get started

### 1. Fork the Repository

- Fork the repository: https://github.com/nehSgnaiL/paper-daily-feed/fork
- Select your GitHub account as the destination

### 2. Create Repository Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **Secrets**. Then create these secrets as needed:

| Key | Description | Example |
| --- | --- | --- |
| `RECEIVER` | `Required` Email address for receiving recommendations. | `reader@example.com` |
| `SENDER` | `Required` Email account used to send recommendations via SMTP server. | `example@qq.com` |
| `SENDER_PASSWORD` | `Required` Sender account password or SMTP authentication code. | `app-password-or-token` |
| `SMTP_SERVER` | `Required` SMTP server of the sender account. Get to know SMTP in [English](https://developers.google.com/workspace/gmail/imap/imap-smtp) / [Chinese](https://wx.mail.qq.com/list/readtemplate?name=app_intro.html#/agreement/authorizationCode). | `smtp.example.com` |
| `SMTP_PORT` | `Required` Corresponding SMTP server port. | `465` |
| `OPENAI_BASE_URL` | `Recommended` OpenAI-compatible LLM API used for summarying paper. <br>If the API is not set, the summary of recommended papers will be the corresponding abstract. <br>You can get FREE API in [SiliconFlow](https://cloud.siliconflow.cn/i/p9BtMTtU) for using open source LLMs (e.g., `Qwen/Qwen3-8B`). | `https://api.siliconflow.cn/v1` |
| `OPENAI_API_KEY` | `Recommended` Set corresponding API key if you use API for TLDR summaries. | `sk-...` |
| `ZOTERO_ID` | `Recommended` Set it when using Zotero Library. Get `ZOTERO_ID` from [Zotero Settings](https://www.zotero.org/settings/security#applications). See steps 1&2 in [Zotero API Key Guide](https://oeysan.github.io/c2z/articles/zotero_api.html). | `1234567` |
| `ZOTERO_KEY` | `Recommended` Corresponding Zotero API key with read access. Get `ZOTERO_KEY` from [Zotero Settings](https://www.zotero.org/settings/security#applications). | `zotero-api-key` |
| `EMBEDDING_BASE_URL` | `Optional` Embeddings API for text matching. Generally leave it empty, since the performance of local embedding model is acceptable. | `https://api.openai.com/v1` |
| `EMBEDDING_API_KEY` | `Optional` Set corresponding key if you use Embeddings API. | `sk-...` |

### 3. Create Repository Variable `APP_CONFIG`

In **Settings** → **Secrets and variables** → **Actions** → **Variables**, create a variable named `APP_CONFIG`.

> [!TIP]
> - You can enable either one or two both sources for description your interests. Full config refers to [`config/app.example.json`](./config/app.example.json) for all available options.
> - Use `${oc.env:SECRET_NAME}` syntax to reference secrets (e.g., `"apiKey": "${oc.env:OPENAI_API_KEY}"`)

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

### 4. Validation

1. Go to **Actions** tab in your forked repo
2. Run the workflow: **"Test paper feeds"**
3. Check logs to confirm config loads correctly
4. If everything goes smoothly, you will :white_check_mark: see the test run successfully and :bell: receive daily paper recommendations starting tomorrow.

## Local Run

```bash
npm install
cp .env.example .env.local
cp config/app.example.json config/app.json
npm run test:config
npm run preview-email
npm run test:feeds:live
```

For local development, keep non-secret app settings in `config/app.json` and secrets in `.env.local`.

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
