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
  <a href="https://doi.org/10.1016/j.tbs.2025.101152" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./docs/email_preview_example-dark.svg" />
      <source media="(prefers-color-scheme: light)" srcset="./docs/email_preview_example.svg" />
      <img alt="paper-daily-feed" src="./docs/email_preview_example.svg" width="1000"/>
    </picture>
  </a>
</div>
<div align="center">
<i>每日论文推送预览。</i>
</div>

---

<h2>快速开始</h2>

<h3>使用 AI Agent 配置</h3>

粘贴以下指令：

```text
请按照项目仓库(https://github.com/nehSgnaiL/paper-daily-feed)中的docs/agent-deployment.zh-CN.md，为我部署每日论文智能推送。
```

---

<h3>希望自行配置？</h3>

请按照下方手动步骤操作。在 GitHub 上只需几分钟：Fork 仓库、添加凭据、启用工作流。

- [1. Fork 仓库](#1-fork-仓库)
- [2. 创建 Secrets](#2-创建-secrets)
- [3. 创建变量](#3-创建变量)
- [4. 启用工作流并完成！](#4-启用工作流并完成)

### 1. Fork 仓库

创建你自己的项目副本：

1. 点击这里 [**Fork 仓库**](https://github.com/nehSgnaiL/paper-daily-feed/fork)。
2. 选择你的 GitHub 账号，然后点击 **Create fork**。

### 2. 创建 Secrets

邮件、AI、Zotero 需要密码或 API key。把它们保存为 GitHub **Secrets**。

1. 打开 [Actions Secrets](../../settings/secrets/actions)，或进入 **Settings ⚙️** → **Secrets and variables** → **Actions**。
2. 保持在 **Secrets** 标签页。
3. 点击 **New repository secret**，按需添加下方凭据：

| 要求 | Secret 名称 | 示例值 | 说明 |
| --- | --- | --- | --- |
| :email:`必填` | `RECEIVER` | `reader@example.com` | 接收论文推送的邮箱。 |
| :email:`必填` | `SENDER` | `example@qq.com` | 发送论文推送的邮箱。建议使用专用邮箱或备用邮箱。 |
| :email:`必填` | `SENDER_PASSWORD` | `app-password-or-token` | 发件邮箱**密码、APP Password 或授权码**。<br><br>很多邮箱服务商要求应用密码：[QQ 邮箱](https://wx.mail.qq.com/list/readtemplate?name=app_intro.html#/agreement/authorizationCode)、[Gmail](https://developers.google.com/workspace/gmail/imap/imap-smtp)、[163 邮箱](https://help.mail.163.com/faqDetail.do?code=d7a5dc8471cd0c0e8b4b8f4f8e49998b374173cfe9171305fa1ce630d7f67ac2a5feb28b66796d3b)、[Outlook](https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-for-outlook-com-d088b986-291d-42b8-9564-9c414e2aa040)。 |
| :email:`必填` | `SMTP_SERVER` | `smtp.example.com` | SMTP 服务器地址。参考上方文档。 |
| :email:`必填` | `SMTP_PORT` | `465` | SMTP 服务器端口。参考上方文档。 |
| :closed_book:`可选` | `ZOTERO_ID` | `1234567` | 使用 Zotero 文库时填写。<br><br>在 [Zotero Settings](https://www.zotero.org/settings/security#applications) 的 `Create new private key` 下方找到。见 [Zotero API Key Guide](https://oeysan.github.io/c2z/articles/zotero_api.html#step-1-locate-zotero-settings)。 |
| :closed_book:`可选` | `ZOTERO_KEY` | `zotero-api-key` | Zotero API key。<br><br>在 [Zotero Settings](https://www.zotero.org/settings/security#applications) 创建至少有 Read 权限的新 key。见 [Zotero API Key Guide](https://oeysan.github.io/c2z/articles/zotero_api.html#step-2-create-a-key)。 |
| :robot:`可选` | `OPENAI_BASE_URL` | `https://api.siliconflow.cn/v1` | TLDR 摘要 API 地址。留空则使用论文原始摘要。<br><br>*提示：[SiliconFlow](https://cloud.siliconflow.cn/i/p9BtMTtU) 可获取免费 API，用于开源模型，例如 `Qwen/Qwen3-8B`。* |
| :robot:`可选` | `OPENAI_API_KEY` | `sk-...` | 使用 TLDR 摘要 API 时填写对应 API key。 |


### 3. 创建变量

添加应用设置。使用 **Variable**，不要放进 Secret。

1. 打开 [Actions Variables](../../settings/variables/actions)，或进入 **Settings ⚙️** → **Secrets and variables** → **Actions** → **Variables**。
2. 点击 **New repository variable**。
3. **Name** 填写：`APP_CONFIG`
4. **Value** 粘贴配置，例如：

   **`APP_CONFIG` 示例：**

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
          // 可选：只包含 Zotero 文库中的这些路径；留空表示包含全部
          "includeCollections": ["2026/survey/**", "example/"],
          // 可选：排除指定路径下的论文
          "excludeCollections": ["archive/**"]
        }
      },
      "summary": {
        // 可选：为论文启用 AI 生成的 TLDR 摘要
        "enabled": false,
        // 启用 TLDR 时使用的 AI 模型；留空默认使用 gpt-4o-mini
        "model": "Qwen/Qwen3-8B",
        // TLDR 输出语言
        "language": "简体中文",
      },
      "matching": {
        // 最多推荐的论文数量
        "paperLimit": 10,
        // 论文被推送所需的最低相关性分数
        "minScore": 0.35
      },
      "feeds": {
        // 从 data/journals.config.ts 中选择具体期刊；留空表示包含全部
        "catalogSelections": [],
        // 可选：在这里添加自定义 RSS feeds，包含名称和 URL
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
> 可使用文本画像、Zotero，或两者同时使用。示例为最小配置。启用来源时，把 `"enabled": false` 改成 `true`。
> 
> **需要更多选项？** 见 [自定义](#customization) 部分的高级设置。

### 4. 启用工作流并完成！

GitHub 默认暂停 fork 仓库中的工作流。启用它们：

1. 打开 ▶️ [**Actions**](../../actions)，点击 `I understand my workflows, go ahead and enable them`。
2. **每日推送：** 打开 [**Daily paper feeds**](../../actions/workflows/daily.yml)，点击 `Enable workflow`。
3. **自动更新：** 打开 [**Repository maintenance**](../../actions/workflows/maintenance.yml)，点击 `Enable workflow`。
4. **运行测试：** 打开 [**Test paper feeds**](../../actions/workflows/test.yml)，点击 **Run workflow** → **Run workflow**。

**完成。** 测试通过后会收到一封简短邮件。之后系统会每日自动推送，也可手动运行 [**Daily paper feeds**](../../actions/workflows/daily.yml) 立即获取一次。

---

<h2>反馈</h2>

如果有问题、建议或使用体验，可以在仓库中 [创建 issue](https://github.com/nehSgnaiL/paper-daily-feed/issues/new/choose)。

<h2 id="customization">自定义</h2>

> [!TIP]
> - **更多选项：**
> 查看完整模板 [`config/app.example.jsonc`](./config/app.example.jsonc)。
>
> - **自动更新：**
> [maintenance workflow](../../actions/workflows/maintenance.yml) 会每周保持推送可用并拉取更新。
> 若也想同步工作流文件，请创建仅限你的 fork 的 [fine-grained token](https://github.com/settings/personal-access-tokens)，授予 **Contents** 和 **Workflows** 读写权限，再保存为 Actions secret：`MAINTENANCE_SYNC_TOKEN`。
> 如果更新需要手动操作，工作流会向 `RECEIVER` 发送一封英中双语邮件，其中包含准确步骤和 GitHub 链接。更新成功或没有新版本时不会发送维护邮件。

<details close>
  <summary>自定义说明</summary>

- **保护密钥：** 始终把密码和 API key 放在 [第 2 步](#2-创建-secrets) 的 **Secrets** 中，不要直接写进 `APP_CONFIG`。
- **暂停邮件：** 在 Actions 页面禁用 [**Daily paper feeds**](../../actions/workflows/daily.yml) 工作流即可，之后可随时重新启用。
- **修改发送时间：** 编辑 [`.github/workflows/daily.yml`](./.github/workflows/daily.yml) 中的 `cron: '11 22 * * *'`。需要时可用 [crontab.guru](https://crontab.guru/) 生成。

</details>

<h2>本地运行</h2>

本地配置是可选的。只有当你想在本机预览或自定义推送时才需要。

<details close>
  <summary>本地配置说明</summary>

```bash
# 安装依赖
bun install

# 复制示例文件，然后按你的账号和兴趣修改
cp .env.example .env.local
cp config/app.example.jsonc config/app.jsonc

# 可选：打印一个文本兴趣画像配置片段，方便粘贴到 config/app.jsonc
bun run setup-profile

# 测试
bun run test:config
bun run preview-email
bun run test:feeds:live

# 运行
bun run start -- run
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
