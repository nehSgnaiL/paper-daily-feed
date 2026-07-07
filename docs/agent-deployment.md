# Agent deployment instructions

[English](./agent-deployment.md) | [简体中文](./agent-deployment.zh-CN.md)

> These instructions are for AI coding agents. Complete the setup for the user instead of merely explaining how to do it.

## Follow the project guide

- Read and follow `@README.md` from beginning to end, especially **Get started**.
- Consult `@config/app.example.jsonc` only when the user wants more settings.
- Deploy only the canonical repository: <https://github.com/nehSgnaiL/paper-daily-feed>.
- If these instructions and `@README.md` differ, follow `@README.md`.

## Work with the user

- Use the user's preferred language throughout. Ask one simple question at a time and explain what is needed.
- Ask whether the user wants Zotero and AI summaries before requesting those details.
- The user should only provide choices and configuration details, and approve GitHub sign-in when required. Handle all other pages, commands, saving, and checks for them.
- Prefer `gh` and complete as much as possible in the current conversation and terminal to minimize page switching.
- Confirm the GitHub account and target fork before making changes. Reuse an existing fork when possible and never change the canonical repository.

## Setup checklist

Complete these items in order and check each one:

- [ ] **Prepare GitHub:** Check whether `gh` is available and install it when possible if missing. Check the login; if needed, start the web login and have the user only approve it on GitHub. Confirm the signed-in account.
- [ ] **Prepare the fork:** Find the user's existing fork or create it for them. Confirm that it belongs to the user and that the current account can manage it.
- [ ] **Collect email settings:** Ask in turn for the receiving address, sending address, SMTP server, and port. When the sender password, app password, or authorization code is needed, open secure input rather than asking for it in chat.
- [ ] **Choose interest sources:** Help the user write a short research-interest summary. Ask whether they use Zotero; if so, collect `ZOTERO_ID` and a read-only `ZOTERO_KEY`.
- [ ] **Choose summary style:** Ask whether to create AI-generated TLDRs. If enabled, confirm the API URL, API key, model, and output language. Otherwise use the paper's original abstract.
- [ ] **Save Secrets:** Save the required `RECEIVER`, `SENDER`, `SENDER_PASSWORD`, `SMTP_SERVER`, and `SMTP_PORT` in the target fork, plus `ZOTERO_ID`, `ZOTERO_KEY`, `OPENAI_BASE_URL`, and `OPENAI_API_KEY` for enabled features.
- [ ] **Save app settings:** Build the smallest useful configuration from the user's choices. Show the non-secret contents for confirmation, then save it as the Actions variable `APP_CONFIG`. Include at least the research interests, Zotero and summary on/off choices, summary language, paper limit, minimum score, and feed sources.
- [ ] **Enable complete auto-updates:** Include workflow files in weekly updates by default. Create a fine-grained token for the target fork only, give **Contents** and **Workflows** read/write access, and save it directly as the Actions secret `MAINTENANCE_SYNC_TOKEN`. Do not ask the user to copy, paste, or enter this token. Involve them only if GitHub requires a new sign-in or two-factor check.
- [ ] **Enable workflows:** Enable Actions in the fork, then enable **Daily paper feeds**, **Repository maintenance**, and **Test paper feeds**.
- [ ] **Check auto-updates:** Run **Repository maintenance** and wait for it to finish. Confirm that weekly keepalive and automatic syncing work, including workflow files.
- [ ] **Send a test email:** Run **Test paper feeds** and wait for it to finish. If it fails, inspect only non-secret logs, correct the settings, and rerun it until it succeeds.
- [ ] **Hand off:** Give the user the fork link, successful test-run link, daily-delivery status, and the simple way to pause **Daily paper feeds** in Actions. Never repeat a credential.

## Protect credentials

- Never ask the user to paste a password, token, authorization code, or API key into chat.
- Never expose credentials in commands, output, logs, temporary files, configuration, or shell history.
- Use an Agent-created `MAINTENANCE_SYNC_TOKEN` only for weekly updates in the target fork, never for local login or another project.
- Keep credentials out of `APP_CONFIG`. Show the new non-secret configuration and obtain confirmation before replacing an existing value.

## Completion requirements

Finish only after every checklist item is complete, the maintenance workflow succeeds, the test workflow succeeds, and the test email arrives. Do not weaken security or edit application/workflow code to force a successful test.
