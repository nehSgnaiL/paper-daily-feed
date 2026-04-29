# paper-daily-feed

Daily journal-paper feeds based on your reading at Zotero.

The workflow reads journal RSS feeds, fetches Zotero items with abstracts, ranks recent journal papers using embeddings, and emails an HTML digest.

---

## GitHub Setup Guide

### 1. Create GitHub Secrets
Navigate to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Key                            | Description                                           |
| ------------------------------ | ----------------------------------------------------- |
| `ZOTERO_ID`                    | Zotero user or group library ID                       |
| `ZOTERO_KEY`                   | Zotero API key (read access)                          |
| `SENDER`                       | SMTP sender email address                             |
| `SENDER_PASSWORD`              | SMTP password or app password                         |
| `RECEIVER`                     | Recipient email address                               |
| `OPENAI_API_KEY` (Optional)    | API key for TLDR generation (e.g. OpenAI/DeepSeek)    |
| `EMBEDDING_API_KEY` (Optional) | API key for embedding service (if using `api` ranker) |


### 2. Create GitHub Variables
Navigate to **Settings → Secrets and variables → Actions → Variables → New repository variable**:

| Key                  | Description                                            | Example                         |
| -------------------- | ------------------------------------------------------ | ------------------------------- |
| `SMTP_SERVER`        | SMTP server host                                       | `smtp.gmail.com`                |
| `SMTP_PORT`          | SMTP server port                                       | `465`                           |
| `OPENAI_API_BASE`    | Base URL for LLM API                                   | `https://api.openai.com/v1`     |
| `EMBEDDING_API_BASE` | Base URL for Embedding API                             | `https://api.openai.com/v1`     |
| `CUSTOM_CONFIG`      | Custom YAML configuration (see exhaustive example below) | (See example)                   |

### 3. Exhaustive `CUSTOM_CONFIG` Example
Use `${oc.env:NAME}` to reference secrets or variables.

```yaml
zotero:
  user_id: ${oc.env:ZOTERO_ID}       # Required
  api_key: ${oc.env:ZOTERO_KEY}      # Required
  library_type: user                 # user or group
  include_path: ["2026/survey/**"]   # Glob patterns for collections
  exclude_path: ["archive/**"]       # Glob patterns for collections

email:
  sender: ${oc.env:SENDER}           # Required
  receiver: ${oc.env:RECEIVER}       # Required
  sender_password: ${oc.env:SENDER_PASSWORD} # Required
  smtp_server: ${oc.env:SMTP_SERVER} # host
  smtp_port: ${oc.env:SMTP_PORT}     # port

llm:
  api:
    key: ${oc.env:OPENAI_API_KEY}    # Optional: for TLDR generation
    base_url: ${oc.env:OPENAI_API_BASE}
  generation_kwargs:
    model: gpt-4o-mini
    max_tokens: 4096
  language: English                  # TLDR language

reranker:
  local:
    model: jinaai/jina-embeddings-v5-text-nano # HF model ID
    batch_size: 16
  api:
    key: ${oc.env:EMBEDDING_API_KEY} # Required if reranker is api
    base_url: ${oc.env:EMBEDDING_API_BASE}
    model: text-embedding-3-small
    batch_size: 100

executor:
  debug: false                       # Logs email instead of sending
  send_empty: false                  # Send email even if 0 recommendations
  max_paper_num: 10                  # Max recommendations in email
  max_paper_age_days: 7              # Filter RSS papers by age
  source: ["Nature", "Science"]      # Filter journals by name/abbr. null for all.
  reranker: local                    # local or api
```

### 4. Workflows
- **Daily Digest (`daily.yml`)**: Runs automatically at `1:00 UTC` (`9:00 UTC+8`) every day.
- **Smoke Test (`test.yml`)**: Manual trigger to verify connectivity.
- **CI (`ci.yml`)**: Runs tests and type-checks on every push.

---

## Local Run Guide

### 1. Installation
```bash
git clone https://github.com/nehSgnaiL/paper-daily-feed.git
cd paper-daily-feed
npm install
```

### 2. Local Configuration
Create `.env.local`:
```bash
cp .env.example .env.local
```
Fill credentials in `.env.local`.

(Optional) Create `config/custom.yaml` to override settings.

### 3. Run
```bash
npm run build
npm start
```

---

## Journals
Managed in `data/journals.config.ts`. Filter in YAML:
```yaml
executor:
  source: ["Nature", "Science", "PANS", "CEUS", "IJGIS", "IEEE T-ITS"]
```

## Reference
Inspired by [TideDra/zotero-arxiv-daily](https://github.com/TideDra/zotero-arxiv-daily).
