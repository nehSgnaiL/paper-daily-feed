# Agent 部署说明

[English](./agent-deployment.md) | [简体中文](./agent-deployment.zh-CN.md)

> 本文件是给 AI 编程 Agent 的补充指令。请替用户完成安装，不要只告诉用户如何操作。

## 以项目文档为准

- 从头到尾阅读并执行 `@README.zh-CN.md`，重点遵循其中的 **快速开始**。
- 只有当用户需要更多设置时，才查阅 `@config/app.example.jsonc`。
- 只部署规范仓库：<https://github.com/nehSgnaiL/paper-daily-feed>。
- 如果本文件与 `@README.zh-CN.md` 不一致，以 `@README.zh-CN.md` 为准。

## 与用户协作

- 全程使用用户的惯用语言。每次只问一个简单问题，并说明需要什么。
- 先了解用户是否需要 Zotero 和 AI 摘要，再询问对应信息。
- 用户只需提供选择、配置信息，以及完成 GitHub 要求的登录确认。其余页面操作、命令、保存和检查均由 Agent 完成。
- 优先使用 `gh`，尽量在当前对话和终端中完成安装，减少用户跳转页面。
- 修改前确认 GitHub 账号和目标 fork。尽量复用已有 fork；不得修改规范仓库。

## 安装清单

按顺序完成并逐项检查：

- [ ] **准备 GitHub：** 检查本地是否可用 `gh`；缺少时尽可能直接安装。检查登录状态，未登录时由 Agent 发起网页登录，用户只需在 GitHub 确认。确认登录账号无误。
- [ ] **准备 fork：** 查找用户已有的 fork；没有时替用户创建。确认目标是用户自己的 fork，且当前账号可以管理它。
- [ ] **收集邮件设置：** 依次询问收件邮箱、发件邮箱、SMTP 地址和端口。需要发件密码、APP Password 或授权码时，直接打开安全输入，不要让用户发到聊天中。
- [ ] **确认兴趣来源：** 帮用户写一段简短的研究兴趣。询问是否使用 Zotero；若使用，再收集 `ZOTERO_ID` 和只读的 `ZOTERO_KEY`。
- [ ] **确认摘要方式：** 询问是否启用 AI 生成的 TLDR。若启用，再确认 API 地址、API key、模型和输出语言；若不启用，则使用论文原始摘要。
- [ ] **保存 Secrets：** 在目标 fork 中保存必填的 `RECEIVER`、`SENDER`、`SENDER_PASSWORD`、`SMTP_SERVER`、`SMTP_PORT`，以及已启用功能需要的 `ZOTERO_ID`、`ZOTERO_KEY`、`OPENAI_BASE_URL`、`OPENAI_API_KEY`。
- [ ] **保存应用设置：** 根据用户的选择生成最小可用配置，展示不含密码和 API key 的内容并请用户确认，然后保存为 Actions variable `APP_CONFIG`。至少包含研究兴趣、Zotero 和摘要的启用状态、摘要语言、推荐数量、最低相关度和论文来源。
- [ ] **开启完整自动更新：** 默认让每周自动更新包含工作流文件。由 Agent 创建一个只用于目标 fork 的 fine-grained token，将 **Contents** 和 **Workflows** 设为读写，并直接保存为 Actions secret `MAINTENANCE_SYNC_TOKEN`。不要让用户复制、粘贴或输入这个 token；只有 GitHub 要求重新登录或二次验证时，才请用户确认。
- [ ] **启用工作流：** 启用 fork 中的 Actions，以及 **Daily paper feeds**、**Repository maintenance** 和 **Test paper feeds**。
- [ ] **检查自动更新：** 运行 **Repository maintenance** 并等待完成。确认每周保活和自动同步可用，且工作流文件可以同步。
- [ ] **发送测试邮件：** 运行 **Test paper feeds** 并等待完成。若失败，检查不含密钥的日志，修正设置后重新运行，直到测试成功。
- [ ] **完成交付：** 告知用户 fork 链接、测试运行链接、每日推送状态，以及如何在 Actions 中暂停 **Daily paper feeds**。不要重复任何凭据。

## 保护凭据

- 不要让用户在聊天中粘贴密码、token、授权码或 API key。
- 不得在命令、输出、日志、临时文件、配置或 shell 历史中暴露凭据。
- Agent 创建的 `MAINTENANCE_SYNC_TOKEN` 只用于目标 fork 的每周自动更新，不得用于本地登录或其他项目。
- `APP_CONFIG` 不得包含凭据。替换已有值前，先展示新的非敏感配置并获得确认。

## 完成条件

只有在清单全部完成、维护工作流成功、测试工作流成功并收到测试邮件后，才结束部署。不得削弱安全设置，也不得修改应用或工作流代码来强行通过测试。
