<div align="center">
  <a href="https://github.com/nehSgnaiL/paper-daily-feed" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./docs/email_header_example-dark.svg" />
      <source media="(prefers-color-scheme: light)" srcset="./docs/email_header_example.svg" />
      <img alt="paper-daily-feed" src="./docs/email_header_example.svg" width="700"/>
    </picture>
  </a>
</div>

<div align="center">

[![Last Update](https://img.shields.io/github/last-commit/nehSgnaiL/paper-daily-feed?label=Last%20update&style=flat-square)](https://github.com/nehSgnaiL/paper-daily-feed)
[![Success Count](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.github.com%2Frepos%2FnehSgnaiL%2Fpaper-daily-feed%2Factions%2Fworkflows%2Fdaily.yml%2Fruns%3Fstatus%3Dsuccess&query=%24.total_count&label=Success%20feeds&color=success&style=flat-square)](https://github.com/nehSgnaiL/paper-daily-feed/actions/workflows/daily.yml)
[![Stars](https://img.shields.io/github/stars/nehSgnaiL/paper-daily-feed?style=social)](https://github.com/nehSgnaiL/paper-daily-feed/stargazers)
[![Forks](https://img.shields.io/github/forks/nehSgnaiL/paper-daily-feed?style=social)](https://github.com/nehSgnaiL/paper-daily-feed/network/members)

</div>

<h1>paper-daily-feed</h1>

> The AI era's paper boom is exhausting to track. Stop endlessly chasing new papers, and let [`paper-daily-feed`](https://github.com/nehSgnaiL/paper-daily-feed) curate daily summaries personalized for your vibe.

**Smart daily feeds** tailored to your research interests or Zotero library. Get the latest, most relevant papers **delivered straight to your inbox**. 100% cloud-based, **free**, **no installs**, and quick to set up.

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/email_render_example-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="./docs/email_render_example.svg" />
    <img alt="paper-daily-feed" src="./docs/email_render_example.svg" width="650"/>
  </picture>
</div>
<div align="center">
<i>Preview for daily feeds.</i>
</div>

<h2>Table of Contents</h2>

- [Get started](#get-started)
  - [1. Fork the Repository](#1-fork-the-repository)
  - [2. Create Secrets](#2-create-secrets)
  - [3. Create Variable](#3-create-variable)
  - [4. Done \& Validation](#4-done--validation)
- [Feeds](#feeds)
- [Local Run](#local-run)
- [Reference](#reference)

## Get started

Setup happens entirely in GitHub. Fork the repo, add a few secrets and one config variable, then run the test workflow.

### 1. Fork the Repository

- Fork the repository: https://github.com/nehSgnaiL/paper-daily-feed/fork
- Select your GitHub account as the destination

### 2. Create Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **Secrets**. Then create these secrets as needed:

| Key | Description | Example |
| --- | --- | --- |
| `RECEIVER` | `Required` Email address for receiving recommendations. | `reader@example.com` |
| `SENDER` | `Required` Email account used to send recommendations via SMTP server. Suggest using a dedicated/secondary email account. | `example@qq.com` |
| `SENDER_PASSWORD` | `Required` Corresponding sender account password or SMTP authentication code. | `app-password-or-token` |
| `SMTP_SERVER` | `Required` SMTP server of the sender account. Get to know SMTP in [English](https://developers.google.com/workspace/gmail/imap/imap-smtp) / [Chinese](https://wx.mail.qq.com/list/readtemplate?name=app_intro.html#/agreement/authorizationCode). | `smtp.example.com` |
| `SMTP_PORT` | `Required` Corresponding SMTP server port. | `465` |
| `OPENAI_BASE_URL` | `Recommended` OpenAI-compatible LLM API used for summarizing paper. <br>If the API is not set, the summary of recommended papers will be the corresponding abstract. <br>You can get FREE API in [SiliconFlow](https://cloud.siliconflow.cn/i/p9BtMTtU) for using open source LLMs (e.g., `Qwen/Qwen3-8B`). | `https://api.siliconflow.cn/v1` |
| `OPENAI_API_KEY` | `Recommended` Set corresponding API key if you use API for TLDR summaries. | `sk-...` |
| `ZOTERO_ID` | `Recommended` Set it when using Zotero Library. Get `ZOTERO_ID` from [Zotero Settings](https://www.zotero.org/settings/security#applications). See steps 1&2 in [Zotero API Key Guide](https://oeysan.github.io/c2z/articles/zotero_api.html). | `1234567` |
| `ZOTERO_KEY` | `Recommended` Corresponding Zotero API key with read access. Get `ZOTERO_KEY` from [Zotero Settings](https://www.zotero.org/settings/security#applications). | `zotero-api-key` |
| `EMBEDDING_BASE_URL` | `Optional` Embeddings API for text matching. Generally leave it empty, since the performance of local embedding model is acceptable. | `https://api.openai.com/v1` |
| `EMBEDDING_API_KEY` | `Optional` Set corresponding key if you use Embeddings API. | `sk-...` |

### 3. Create Variable

In your GitHub repository, **Settings** → **Secrets and variables** → **Actions** → **Variables**, create a variable named **`APP_CONFIG`**.

> [!TIP]
> - You can enable either one or both interest sources: Textual profile and Zotero. Below examples show minimal configs for each source. 

**Example: Profile-First `APP_CONFIG`:**

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

**Example: Zotero-First `APP_CONFIG`:**

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

> [!NOTE]
> - You can add additional parameters by refering to full `APP_CONFIG` template in [`config/app.example.jsonc`](./config/app.example.jsonc) to achieve more customization.
> - Keep passwords and API keys in GitHub Secrets, not directly in `APP_CONFIG`. The default secret names from [step 2](#2-create-repository-secrets) will be read automatically.

### 4. Done & Validation

1. Go to the **Actions** tab at the top of your forked repository.
2. Select the **"Test paper feeds"** workflow from the left sidebar and click **Run workflow**.
3. If everything goes smoothly, the run will pass and you will receive a short recommendation email.
4. Done! :smile: Wait for the next scheduled daily email, or manually trigger **"Daily paper feeds"** to receive the full feed immediately.

> [!NOTE]
> The default schedule in [`.github/workflows/daily.yml`](./.github/workflows/daily.yml) is `11 1 * * *`, which is 09:11 at UTC+8 (01:11 UTC). To change when the daily workflow runs, edit the workflow `cron` value directly (see [crontab.guru](https://crontab.guru/)).

## Feeds

This repo supports bundled catalog feeds and direct RSS feeds.

- Catalog feeds: `feeds.catalogSelections`: names or abbreviations from [`data/journals.config.ts`](./data/journals.config.ts); empty means all bundled feeds.
- Custom feeds: `feeds.customRss`: direct RSS entries with `name` and `rss`.

**Example `APP_CONFIG` for Custom Feeds:**
```json
{
  "feeds": {
    "catalogSelections": ["nature", "science"],
    "customRss": [
      {
        "name": "MIT Technology Review",
        "rss": "https://www.technologyreview.com/feed/"
      }
    ]
  }
}
```

## Local Run

Local setup is optional. Use it only if you want to preview or customize the feed on your machine.

```bash
# Install dependencies
npm install

# Copy the examples, then edit them for your account and interests
cp .env.example .env.local
cp config/app.example.jsonc config/app.jsonc

# Optional: print a starter profile block to paste into config/app.jsonc
npm run setup-profile

# Test
npm run test:config
npm run preview-email
npm run test:feeds:live

# Run
npm start -- run
```

For local development, keep non-secret app settings in `config/app.jsonc` and secrets in `.env.local`.


CLI modes:

- `run`: fetch, match, summarize if enabled, render, and send.
- `preview-email`: fetch, match, render HTML, and print it without sending.
- `setup-profile`: print a starter profile JSON fragment.
- `test-config`: validate that `APP_CONFIG`, `config/app.jsonc`, or `config/app.json` can load.

Other scripts:

- `test:feeds:live`: smoke-test the current bundled publisher feeds against live RSS. Default tests use fixtures and do not require network access.

## Reference

Inspired by [TideDra/zotero-arxiv-daily](https://github.com/TideDra/zotero-arxiv-daily).
