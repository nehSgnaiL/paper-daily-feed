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
  <a href="https://github.com/nehSgnaiL/paper-daily-feed" style="text-decoration: none;">
    <img alt="Last update" src="https://img.shields.io/github/last-commit/nehSgnaiL/paper-daily-feed?label=Last%20update&amp;style=flat-square" />
  </a><a href="https://github.com/nehSgnaiL/paper-daily-feed/actions/workflows/daily.yml" style="text-decoration: none;">
    <img alt="Success feeds" src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.github.com%2Frepos%2FnehSgnaiL%2Fpaper-daily-feed%2Factions%2Fworkflows%2Fdaily.yml%2Fruns%3Fstatus%3Dsuccess&amp;query=%24.total_count&amp;label=Success%20feeds&amp;color=success&amp;style=flat-square" />
  </a><a href="https://github.com/nehSgnaiL/paper-daily-feed/stargazers" style="text-decoration: none;">
    <img alt="GitHub stars" src="https://img.shields.io/github/stars/nehSgnaiL/paper-daily-feed?style=social" />
  </a><a href="https://github.com/nehSgnaiL/paper-daily-feed/network/members" style="text-decoration: none;">
    <img alt="GitHub forks" src="https://img.shields.io/github/forks/nehSgnaiL/paper-daily-feed?style=social" />
  </a>
</div>

> The AI era's paper boom is exhausting to track. Stop endlessly chasing new papers, and let [`paper-daily-feed`](https://github.com/nehSgnaiL/paper-daily-feed) curate daily summaries personalized for your vibe.

<h1>paper-daily-feed</h1>

[English](./README.md) | [简体中文](./README.zh-CN.md)

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

<h2>Get started</h2>

Setup happens entirely in GitHub. Fork the repo, add a few secrets and one config variable, then enable the workflow.

- [1. Fork the Repository](#1-fork-the-repository)
- [2. Create Secrets](#2-create-secrets)
- [3. Create Variable](#3-create-variable)
- [4. Enable workflow \& Done](#4-enable-workflow--done)

### 1. Fork the Repository

- Fork the repository by clicking: https://github.com/nehSgnaiL/paper-daily-feed/fork
- Select your GitHub account as the destination

### 2. Create Secrets

Since some functions require authentication (e.g., sending email, accessing Zotero, or using LLM APIs), you need to create secrets in your GitHub repository to store the corresponding credentials.

Go to your repository's [Actions Secrets page](../../settings/secrets/actions) (or manually navigate to **Settings** ⚙️ → **Secrets and variables** → **Actions**). Then, create the following secrets as needed by clicking the green **New repository secret** button:

| Secret Name | Example of Secret Value | Description | Note |
| --- | --- | --- | --- |
| `RECEIVER` | `reader@example.com` |  Email address for **receiving** feeds. | :email:`Required` |
| `SENDER` | `example@qq.com` |  Email account used to **send** feeds. Suggest using a dedicated/secondary account. | :email:`Required` |
| `SENDER_PASSWORD` | `app-password-or-token` | Corresponding sender account **password or SMTP authentication code**. <br>Some providers require authentication code. Check with the providers docs: [QQ Mail](https://wx.mail.qq.com/list/readtemplate?name=app_intro.html#/agreement/authorizationCode), [Gmail](https://developers.google.com/workspace/gmail/imap/imap-smtp), [163 Mail](https://help.mail.163.com/faqDetail.do?code=d7a5dc8471cd0c0e8b4b8f4f8e49998b374173cfe9171305fa1ce630d7f67ac2a5feb28b66796d3b), [Outlook](https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-for-outlook-com-d088b986-291d-42b8-9564-9c414e2aa040).  | :email:`Required` |
| `SMTP_SERVER` | `smtp.example.com` |  SMTP server for sending email. Check with above docs. | :email:`Required` |
| `SMTP_PORT` | `465` |  Corresponding SMTP server port. Check with above docs. | :email:`Required` |
| `ZOTERO_ID` | `1234567` | Set it when using Zotero Library.<br> Get `ZOTERO_ID` under the button `Create new private key` in [Zotero Settings](https://www.zotero.org/settings/security#applications). See [Zotero API Key Guide](https://oeysan.github.io/c2z/articles/zotero_api.html#step-1-locate-zotero-settings). | :closed_book:`Recommended` |
| `ZOTERO_KEY` | `zotero-api-key` | Corresponding Zotero API key. <br> Get `ZOTERO_KEY` by creating a new key with appropriate permissions (at least "Read" access) in [Zotero Settings](https://www.zotero.org/settings/security#applications). See [Zotero API Key Guide](https://oeysan.github.io/c2z/articles/zotero_api.html#step-2-create-a-key). | :closed_book:`Recommended` |
| `OPENAI_BASE_URL` | `https://api.siliconflow.cn/v1` | OpenAI-compatible LLM API used for summarizing paper. <br>If not set, paper abstracts will be used as summaries. <br>You can get FREE API in [SiliconFlow](https://cloud.siliconflow.cn/i/p9BtMTtU) for using open source LLMs (e.g., `Qwen/Qwen3-8B`). | :robot:`Recommended` |
| `OPENAI_API_KEY` | `sk-...` | Set corresponding API key if you use API for TLDR summaries. | :robot:`Recommended` |
| `EMBEDDING_BASE_URL` | `https://api.openai.com/v1` | API for text matching. Generally leave it empty, since the performance of local embedding model is acceptable. | :computer:`Optional` |
| `EMBEDDING_API_KEY` | `sk-...` | Set corresponding key if you use Embeddings API for text matching. | :computer:`Optional` |

### 3. Create Variable

Next, we need to add your configuration settings. Because this isn't sensitive data (like a password), we will add it as a **Variable** instead of a Secret.

1. Go to your repository's [Actions Variables page](../../settings/variables/actions) (or manually navigate to **Settings ⚙️** → **Secrets and variables** → **Actions**, and make sure to click the **Variables** tab).
2. Click the green **New repository variable** button.
3. For the **Name**, type exactly: `APP_CONFIG`
4. For the **Value**, paste your configuration (like the example below) in JSONC format.
   
   **Example `APP_CONFIG` value:**

    ```json5
    {
      "interests": {
        "profile": {
          // Enable profile as an interest source
          "enabled": true,  
          // A short summary of your research interests.
          "summary": "Urban mobility, transport equity, and climate adaptation." 
        },
        "zotero": {
          // Optional: set it to true to enable Zotero
          "enabled": false,  
          // Optional: only include papers from these path(s) in your Zotero library; empty means include all.
          "includeCollections": ["2026/survey/**", "example/"],  
          // Optional: exclude papers from these path(s) in your Zotero library
          "excludeCollections": ["archive/**"]  
        }
      }
    }
    ```

> [!TIP]
> **Customizing your sources:** 
> You can enable either one or both interest sources (your Textual profile and Zotero). The example above shows a minimal config. Just flip "enabled": `false` to `true` for whichever sources you want to use!

### 4. Enable workflow & Done

Because you forked this repository, GitHub automatically pauses automated tasks to be safe. We just need to turn them on!

1. Go to the ▶️ [**Actions**](../../actions) tab at the top of your forked repository.
2. Since this is a forked repo, click the green **"I understand my workflows, go ahead and enable them"** button.
3. In the left sidebar, click [**Test paper feeds**](../../actions/workflows/test.yml). Then, click the **Run workflow** dropdown on the right and hit the green **Run workflow** button.
4. Next, click [**Daily paper feeds**](../../actions/workflows/daily.yml) in the left sidebar and enable it.
5. If everything goes smoothly ✅, the run will pass and you will receive a short recommendation email.
6. **Done!** 😄 You will now get your automated daily emails. You can also manually trigger the [**Daily paper feeds**](../../actions/workflows/daily.yml) workflow anytime to get an instant update.

> [!NOTE]
> **Changing the daily email time:** 
> By default, the system is scheduled to run at 06:11 UTC+8 (22:11 UTC). This schedule is set using a format called `cron` which looks like this: `11 22 * * *`. 
> 
> To change the time, click on this file: [`.github/workflows/daily.yml`](./.github/workflows/daily.yml), click the ✏️ [**pencil icon**](../../edit/main/.github/workflows/daily.yml) in the top right to edit it, and change the cron numbers. You can use a free tool like [crontab.guru](https://crontab.guru/) to help translate your desired time into the `cron` format.

> [!TIP]
> **Keep your fork updated:**
> The daily workflow checks whether your fork is behind [`nehSgnaiL/paper-daily-feed`](https://github.com/nehSgnaiL/paper-daily-feed). If it is behind, GitHub Actions will show a non-blocking **Sync fork reminder** so you can receive the latest features and bug fixes.
>
> To update, open your fork on GitHub and click **Sync fork** → **Update branch**.

<h2>Feedback</h2>

Any issues, questions, or experience could be shared via [raising issue](https://github.com/nehSgnaiL/paper-daily-feed/issues/new/choose) in the repository.

<h2>Customization</h2>

> [!TIP]
> - You can add additional parameters by refering to full `APP_CONFIG` template in [`config/app.example.jsonc`](./config/app.example.jsonc) to achieve more customization.
> - Keep passwords and API keys in GitHub Secrets, not directly in `APP_CONFIG`. The default secret names from [step 2](#2-create-secrets) will be read automatically.
> - `APP_CONFIG` supports standard JSON plus JSONC comments (`//`, `/* ... */`, and `#`) and trailing commas.

This repo supports bundled catalog feeds and direct RSS feeds.

- Catalog feeds: `feeds.catalogSelections`: names or abbreviations from [`data/journals.config.ts`](./data/journals.config.ts); empty means all bundled feeds.
- Custom feeds: `feeds.customRss`: direct RSS entries with `name` and `rss`.

**Example `APP_CONFIG` for Custom Feeds:**
```json5
{
  // ... other config parameters ...
  "feeds": {
    // selected bundled feeds by name or abbreviation; empty means all
    "catalogSelections": ["nature", "science"],
    // custom RSS feeds with name and URL
    "customRss": [
      {
        "name": "MIT Technology Review",
        "rss": "https://www.technologyreview.com/feed/"
      }
    ]
  }
}
```

<h2>Local Run</h2>

Local setup is optional. Use it only if you want to preview or customize the feed on your local device.
<details close>
  <summary>Local setup instructions</summary>

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

</details>

<h2>Reference</h2>

Inspired by [TideDra/zotero-arxiv-daily](https://github.com/TideDra/zotero-arxiv-daily).
