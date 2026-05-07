<p align="center">
  <a href="https://github.com/nehSgnaiL/paper-daily-feed" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./docs/email_header_example-dark.svg" />
      <source media="(prefers-color-scheme: light)" srcset="./docs/email_header_example.svg" />
      <img alt="paper-daily-feed" src="./docs/email_header_example.svg" width="700"/>
    </picture>
  </a>
</p>

# paper-daily-feed
[![Last Update](https://img.shields.io/github/last-commit/nehSgnaiL/paper-daily-feed?label=Last%20update&style=flat-square)](https://github.com/nehSgnaiL/paper-daily-feed)
[![star](https://img.shields.io/github/stars/nehSgnaiL/paper-daily-feed?style=social)](https://github.com/nehSgnaiL/paper-daily-feed/stargazers)
[![fork](https://img.shields.io/github/forks/nehSgnaiL/paper-daily-feed?style=social)](https://github.com/nehSgnaiL/paper-daily-feed/network/members) 

> The AI era's paper bloom is exhausting to track. If you are tired of endlessly chasing new publications, use this repository to curate a daily recommendation & summary tailored exactly to your vibe.

The recommendation can be produced based on two sources (enable either one or both):

- Interest profile: describe your research area directly in text.
- Zotero library: use papers and abstracts in Zotero library.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/email_render_example-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="./docs/email_render_example.svg" />
    <img alt="paper-daily-feed" src="./docs/email_render_example.svg" width="650"/>
  </picture>
</p>
<p align = "center">
<b>Fig. 1</b>. Preview for daily feeds.
</p>

## Get started

### 1. Fork the Repository

- Fork the repository: https://github.com/nehSgnaiL/paper-daily-feed/fork
- Select your GitHub account as the destination

### 2. Create Repository Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **Secrets**. Then create these secrets as needed:

| Key | Description | Example |
| --- | --- | --- |
| `RECEIVER` | `Required` Email address for receiving recommendations. | `reader@example.com` |
| `SENDER` | `Required` Email account used to send recommendations via SMTP server. Suggest using a dedicated/secondary email account. | `example@qq.com` |
| `SENDER_PASSWORD` | `Required` Corresponding sender account password or SMTP authentication code. | `app-password-or-token` |
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
> - Keep passwords and API keys in GitHub Secrets, not directly in `APP_CONFIG`. The default secret names from [step 2](#2-create-repository-secrets) will be read automatically.
> - You can enable either one or both interest sources: Textual profile and Zotero.
> - Below examples show minimal configs for each source. You can add additional parameters by refering to full `APP_CONFIG` template in [`config/app.example.jsonc`](./config/app.example.jsonc) to achieve more customization.


#### Example: Profile-First `APP_CONFIG`:

```json
{
  "interests": {
    "profile": {
      "enabled": true,
      "summary": "Urban mobility, transport equity, and climate adaptation."
    }
  }
}
```

#### Example: Zotero-First `APP_CONFIG`:

```json
{
  "interests": {
    "zotero": {
      "enabled": true,
      "includeCollections": ["2026/survey/**"],
      "excludeCollections": ["archive/**"]
    }
  }
}
```

### 4. Validation

1. Go to **Actions** tab in your forked repo
2. Run the workflow: **"Test paper feeds"**
3. Check logs to confirm config loads correctly
4. If everything goes smoothly, you will :white_check_mark: see the test run successfully and :bell: receive daily paper recommendations starting tomorrow.

The default schedule in [`.github/workflows/daily.yml`](./.github/workflows/daily.yml) is `0 1 * * *`, which is 09:00 at UTC+8. To change when the daily workflow runs, edit the workflow `cron` value directly.

## Local Run

```bash
npm install
cp .env.example .env.local
cp config/app.example.jsonc config/app.jsonc
npm run test:config
npm run preview-email
npm run test:feeds:live
```

For local development, keep non-secret app settings in `config/app.jsonc` and secrets in `.env.local`.

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
- `test-config`: validate that `APP_CONFIG`, `config/app.jsonc`, or `config/app.json` can load.


## Feeds

The app supports bundled catalog feeds and direct RSS feeds.

- `feeds.catalogSelections`: names or abbreviations from `data/journals.config.ts`; empty means all bundled feeds.
- `feeds.customRss`: direct RSS entries with `name` and `rss`.

Run `npm run test:feeds:live` to smoke-test the current bundled publisher feeds against live RSS. Default tests use fixtures and do not require network access.


## Reference

Inspired by [TideDra/zotero-arxiv-daily](https://github.com/TideDra/zotero-arxiv-daily).
