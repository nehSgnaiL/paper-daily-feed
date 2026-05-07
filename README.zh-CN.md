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
  <a href="https://github.com/nehSgnaiL/paper-daily-feed"><img alt="Last update" src="https://img.shields.io/github/last-commit/nehSgnaiL/paper-daily-feed?label=Last%20update&style=flat-square" /></a>
  <a href="https://github.com/nehSgnaiL/paper-daily-feed/actions/workflows/daily.yml"><img alt="Success feeds" src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.github.com%2Frepos%2FnehSgnaiL%2Fpaper-daily-feed%2Factions%2Fworkflows%2Fdaily.yml%2Fruns%3Fstatus%3Dsuccess&query=%24.total_count&label=Success%20feeds&color=success&style=flat-square" /></a>
  <a href="https://github.com/nehSgnaiL/paper-daily-feed/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/nehSgnaiL/paper-daily-feed?style=social" /></a>
  <a href="https://github.com/nehSgnaiL/paper-daily-feed/network/members"><img alt="GitHub forks" src="https://img.shields.io/github/forks/nehSgnaiL/paper-daily-feed?style=social" /></a>
</div>

> AI 时代论文爆发式增长，持续追踪新论文非常耗费精力。让 [`paper-daily-feed`](https://github.com/nehSgnaiL/paper-daily-feed) 按你的研究兴趣自动筛选总结每日论文。

<h1>paper-daily-feed</h1>

[English](./README.md) | [简体中文](./README.zh-CN.md)

**智能每日论文推送**，可根据你的研究兴趣或 Zotero 文库个性化筛选。最新、最相关的论文会直接发送到你的邮箱。全流程云端运行，**免费**、**无需本地安装**，配置很快。

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/email_render_example-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="./docs/email_render_example.svg" />
    <img alt="paper-daily-feed" src="./docs/email_render_example.svg" width="650"/>
  </picture>
</div>
<div align="center">
<i>每日论文推送预览。</i>
</div>

<h2>快速开始</h2>

配置完全在 GitHub 中完成。Fork 仓库，添加几个 Secrets 和一个配置变量，然后启用工作流即可。

- [1. Fork 仓库](#1-fork-仓库)
- [2. 创建 Secrets](#2-创建-secrets)
- [3. 创建变量](#3-创建变量)
- [4. 启用工作流并完成](#4-启用工作流并完成)

### 1. Fork 仓库

- 点击这里 Fork 仓库：https://github.com/nehSgnaiL/paper-daily-feed/fork
- 选择你的 GitHub 账号作为目标位置

### 2. 创建 Secrets

部分功能需要认证信息，例如发送邮件、访问 Zotero 或调用 LLM API。请在 GitHub 仓库中创建 Secrets 保存这些凭据。

进入仓库的 [Actions Secrets 页面](../../settings/secrets/actions)，或手动进入 **Settings** ⚙️ → **Secrets and variables** → **Actions**。然后按需要点击绿色的 **New repository secret** 按钮创建以下 Secrets：

| Secret 名称 | 示例值 | 说明 | 备注 |
| --- | --- | --- | --- |
| `RECEIVER` | `reader@example.com` | 接收论文推送的邮箱。 | :email:`必填` |
| `SENDER` | `example@qq.com` | 发送论文推送的邮箱。建议使用专用邮箱或备用邮箱。 | :email:`必填` |
| `SENDER_PASSWORD` | `app-password-or-token` | 发件邮箱对应的密码或 SMTP 授权码。部分服务商必须使用授权码。可参考服务商文档：[QQ 邮箱](https://wx.mail.qq.com/list/readtemplate?name=app_intro.html#/agreement/authorizationCode)、[Gmail](https://developers.google.com/workspace/gmail/imap/imap-smtp)、[163 邮箱](https://help.mail.163.com/faqDetail.do?code=d7a5dc8471cd0c0e8b4b8f4f8e49998b374173cfe9171305fa1ce630d7f67ac2a5feb28b66796d3b)、[Outlook](https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-for-outlook-com-d088b986-291d-42b8-9564-9c414e2aa040)。 | :email:`必填` |
| `SMTP_SERVER` | `smtp.example.com` | 邮件发送服务器地址。请参考邮箱服务商文档。 | :email:`必填` |
| `SMTP_PORT` | `465` | SMTP 服务器端口。请参考邮箱服务商文档。 | :email:`必填` |
| `ZOTERO_ID` | `1234567` | 使用 Zotero 文库时填写。在 [Zotero Settings](https://www.zotero.org/settings/security#applications) 的 `Create new private key` 按钮下面找到`ZOTERO_ID`。可参考 [Zotero API Key Guide](https://oeysan.github.io/c2z/articles/zotero_api.html#step-1-locate-zotero-settings)。 | :closed_book:`推荐` |
| `ZOTERO_KEY` | `zotero-api-key` | Zotero API key。在 [Zotero Settings](https://www.zotero.org/settings/security#applications) 点击`Create new private key`，创建一个至少有 Read 权限的新 key。可参考 [Zotero API Key Guide](https://oeysan.github.io/c2z/articles/zotero_api.html#step-2-create-a-key)。 | :closed_book:`推荐` |
| `OPENAI_BASE_URL` | `https://api.siliconflow.cn/v1` | OpenAI 兼容的 LLM API，用于生成论文 TLDR 摘要。不设置时会直接使用论文摘要。你也可以在 [SiliconFlow](https://cloud.siliconflow.cn/i/p9BtMTtU) 获取免费 API，用于开源模型，例如 `Qwen/Qwen3-8B`。 | :robot:`推荐` |
| `OPENAI_API_KEY` | `sk-...` | 使用 TLDR 摘要 API 时填写对应 API key。 | :robot:`推荐` |
| `EMBEDDING_BASE_URL` | `https://api.openai.com/v1` | 文本匹配所用的 Embeddings API。通常可以留空，因为本地 embedding 模型的效果已经可用。 | :computer:`可选` |
| `EMBEDDING_API_KEY` | `sk-...` | 使用 Embeddings API 进行文本匹配时填写对应 key。 | :computer:`可选` |

### 3. 创建变量

接下来添加应用配置。因为这些配置不是密码等敏感信息，所以使用 **Variable**，不要放在 Secret 中。

1. 进入仓库的 [Actions Variables 页面](../../settings/variables/actions)，或手动进入 **Settings ⚙️** → **Secrets and variables** → **Actions**，并切换到 **Variables** 标签页。
2. 点击绿色的 **New repository variable** 按钮。
3. **Name** 填写：`APP_CONFIG`
4. **Value** 粘贴你的配置，例如下面的 JSONC 示例。

   **`APP_CONFIG` 示例值：**

    ```json5
    {
      "interests": {
        "profile": {
          // 启用文本研究兴趣作为兴趣来源
          "enabled": true,
          // 简短描述你的研究兴趣
          "summary": "Urban mobility, transport equity, and climate adaptation."
        },
        "zotero": {
          // 可选：设为 true 以启用 Zotero
          "enabled": false,
          // 可选：只包含 Zotero 文库中的这些路径；为空表示包含全部
          "includeCollections": ["2026/survey/**", "example/"],
          // 可选：排除 Zotero 文库中的这些路径
          "excludeCollections": ["archive/**"]
        }
      },
      "summary": {
        // 可选：启用 LLM 生成 TLDR 摘要
        "enabled": false,
        // 可选：启用 TLDR 时使用的摘要模型。为空或省略时默认使用 gpt-4o-mini
        "model": "Qwen/Qwen3-8B",
        // TLDR 输出语言
        "language": "简体中文",
      },
      "matching": {
        // 推荐论文数量
        "paperLimit": 10,
      },
      "feeds": {
        // 从 data/journals.config.ts 中选择期刊名称或缩写。留空表示包含全部
        "catalogSelections": [],
        // 可选：自定义 RSS feeds，包含名称和 URL
        "customRss": [
          // {
          //   "name": "Example Lab Feed",
          //   "rss": "https://example.test/feed.xml"
          // },
        ]
      },
    }
    ```

> [!TIP]
> **自定义兴趣来源：**
> 你可以启用文本画像、Zotero，或同时启用两者。上面的示例是最小配置。把对应来源的 `"enabled": false` 改成 `true` 即可启用。
> 
> **更多自定义：** 见 [自定义](#customization) 部分。

### 4. 启用工作流并完成

Fork 仓库后，GitHub 会默认暂停自动任务。需要手动启用一次。

1. 进入仓库顶部的 ▶️ [**Actions**](../../actions) 标签页。
2. 如果这是 fork 仓库，点击绿色的 **"I understand my workflows, go ahead and enable them"** 按钮。
3. 在左侧栏点击 [**Test paper feeds**](../../actions/workflows/test.yml)，再点击右侧的 **Run workflow** 下拉按钮，并点击绿色 **Run workflow**。
4. 接着在左侧栏点击 [**Daily paper feeds**](../../actions/workflows/daily.yml) 并启用它。
5. 如果一切顺利，运行会通过，并且你会收到一封简短的推荐邮件。
6. 完成。之后你会收到自动每日邮件，也可以随时手动触发 [**Daily paper feeds**](../../actions/workflows/daily.yml) 工作流来立即获取一次推送。

> [!TIP]
> **保持 fork 仓库更新：**
> 每日工作流会检查你的 fork 是否落后于 [`nehSgnaiL/paper-daily-feed`](https://github.com/nehSgnaiL/paper-daily-feed)。如果落后，GitHub Actions 会显示一个不影响运行的 **Sync fork reminder**，提醒你同步以获取最新功能和 bug 修复。
>
> 更新时，打开你的 fork 仓库，点击 **Sync fork** → **Update branch**。

<h2>反馈</h2>

如果有问题、建议或使用体验，可以在仓库中 [创建 issue](https://github.com/nehSgnaiL/paper-daily-feed/issues/new/choose)。

<h2 id="customization">自定义</h2>

> [!TIP]
> - 你可以参考完整 `APP_CONFIG` 模板 [`config/app.example.jsonc`](./config/app.example.jsonc)，添加更多参数来进行自定义。
> - 密码和 API key 应该放在 GitHub Secrets 中，不要直接写进 `APP_CONFIG`。第 2 步中的默认 Secret 名称会被自动读取。
> - `APP_CONFIG` 支持标准 JSON 加 JSONC 注释（`//`、`/* ... */`、`#`）和尾随逗号。
> - **修改每日邮件发送时间：** 默认计划任务在 UTC+8 的 06:11 运行，也就是 UTC 的 22:11。这个时间由 `cron` 表达式控制，默认是：`11 22 * * *`。如需修改，打开 [`.github/workflows/daily.yml`](./.github/workflows/daily.yml)，点击右上角 ✏️ [**pencil icon**](../../edit/main/.github/workflows/daily.yml) 编辑 cron 数字。可以用 [crontab.guru](https://crontab.guru/) 辅助理解和生成 cron 表达式。

本项目支持内置期刊目录 feeds 和直接 RSS feeds。

- 目录 feeds：`feeds.catalogSelections`，填写 [`data/journals.config.ts`](./data/journals.config.ts) 中的名称或缩写；为空表示使用全部内置 feeds。
- 自定义 feeds：`feeds.customRss`，填写包含 `name` 和 `rss` 的直接 RSS 条目。

**自定义 Feeds 的 `APP_CONFIG` 示例：**

```json5
{
  // ... 其他配置参数 ...
  "feeds": {
    // 选择内置 feeds 的名称或缩写；为空表示全部
    "catalogSelections": ["nature", "science"],
    // 自定义 RSS feeds，包含名称和 URL
    "customRss": [
      {
        "name": "MIT Technology Review",
        "rss": "https://www.technologyreview.com/feed/"
      }
    ]
  }
}
```

<h2>本地运行</h2>

本地配置是可选的。只有当你想在本机预览或自定义推送时才需要。

<details close>
  <summary>本地配置说明</summary>

```bash
# 安装依赖
npm install

# 复制示例文件，然后按你的账号和兴趣修改
cp .env.example .env.local
cp config/app.example.jsonc config/app.jsonc

# 可选：打印一个文本兴趣画像配置片段，方便粘贴到 config/app.jsonc
npm run setup-profile

# 测试
npm run test:config
npm run preview-email
npm run test:feeds:live

# 运行
npm start -- run
```

本地开发时，把非敏感应用配置放在 `config/app.jsonc`，把 secrets 放在 `.env.local`。

CLI 模式：

- `run`：获取论文、匹配兴趣、按需总结、渲染邮件并发送。
- `preview-email`：获取论文、匹配兴趣、渲染 HTML，并打印结果但不发送。
- `setup-profile`：打印一个可用的文本兴趣画像 JSON 片段。
- `test-config`：验证 `APP_CONFIG`、`config/app.jsonc` 或 `config/app.json` 是否可以加载。

其他脚本：

- `test:feeds:live`：对当前内置 publisher feeds 做 live RSS smoke test。默认测试使用 fixtures，不需要网络。

</details>

<h2>参考</h2>

灵感来自 [TideDra/zotero-arxiv-daily](https://github.com/TideDra/zotero-arxiv-daily)。
