# paper-daily-feed

Daily journal-paper feeds based on your reading at Zotero.

The workflow reads journal RSS feeds, fetches Zotero items with abstracts, ranks recent journal papers using embeddings, and emails an HTML digest.

## Configuration Reference

### Environment Variables
These are typically set in GitHub Secrets or a local `.env.local` file.

| Group | Variable Name | Description | Required |
| :--- | :--- | :--- | :--- |
| **Zotero** | `ZOTERO_ID` | Zotero User or Group ID | Yes |
| **Zotero** | `ZOTERO_KEY` | Zotero API Key with read access | Yes |
| **Email** | `SENDER` | SMTP sender email address | Yes |
| **Email** | `SENDER_PASSWORD` | SMTP password or app password | Yes |
| **Email** | `RECEIVER` | Email address that receives the digest | Yes |
| **Email** | `SMTP_SERVER` | SMTP server host (e.g., `smtp.gmail.com`) | Yes |
| **Email** | `SMTP_PORT` | SMTP server port (usually `465` for SSL) | Yes |
| **LLM** | `OPENAI_API_KEY` | API key for TLDR generation | No |
| **LLM** | `OPENAI_API_BASE` | Base URL for TLDR API | No |
| **Reranker** | `EMBEDDING_API_KEY` | API key for embedding-based ranking | No |
| **Reranker** | `EMBEDDING_API_BASE` | Base URL for embedding API | No |

### YAML Configuration
Settings in `config/custom.yaml` or the `CUSTOM_CONFIG` variable.

#### Workflow (`executor`)
| Parameter | Description | Default |
| :--- | :--- | :--- |
| `debug` | If `true`, logs the email content to console and skips sending | `false` |
| `send_empty` | If `true`, sends an email even if no papers match | `false` |
| `max_paper_num` | Maximum number of recommended papers to include | `10` |
| `max_paper_age_days` | Maximum age of papers (in days) to consider from RSS | `7` |
| `source` | List of journal names/abbr to include. `null` for all | `null` |
| `reranker` | Ranking method: `local` (HuggingFace) or `api` (Embeddings API) | `local` |

#### Zotero Library (`zotero`)
| Parameter | Description | Default |
| :--- | :--- | :--- |
| `library_type` | Type of Zotero library: `user` or `group` | `user` |
| `include_path` | List of collection paths to include | `null` |
| `exclude_path` | List of collection paths to exclude | `null` |

#### TLDR Generation (`llm`)
| Parameter | Description | Default |
| :--- | :--- | :--- |
| `generation_kwargs.model` | Model name for chat completion | `gpt-4o-mini` |
| `language` | Language for the TLDR summaries | `English` |
| `generation_kwargs.max_tokens` | Maximum tokens for the summary | `16384` |

#### API Reranker (`reranker`)
Used only if `executor.reranker` is `api`.
| Parameter | Description | Default |
| :--- | :--- | :--- |
| `api.model` | Embedding model name | `text-embedding-3-small` |
| `api.batch_size` | Number of items per embedding request | `null` |

#### Local Reranker (`reranker.local`)
Used only if `executor.reranker` is `local`.
| Parameter | Description | Default |
| :--- | :--- | :--- |
| `local.model` | HuggingFace model ID (e.g., `jinaai/jina-embeddings-v5-text-nano`) | (See config) |

---

## GitHub Setup Guide

### 1. Create GitHub Secrets
Navigate to **Settings → Secrets and variables → Actions → New repository secret** and add the following:

- `ZOTERO_ID`
- `ZOTERO_KEY`
- `SENDER`
- `SENDER_PASSWORD`
- `RECEIVER`
- `SMTP_SERVER`
- `SMTP_PORT`
- `OPENAI_API_KEY` (Optional)
- `EMBEDDING_API_KEY` (Optional)

### 2. Create GitHub Variables
Navigate to **Settings → Secrets and variables → Actions → Variables → New repository variable**:

- `CUSTOM_CONFIG`: Your custom YAML configuration. You can use `${oc.env:NAME}` to reference secrets.
  Example:
  ```yaml
  executor:
    max_paper_num: 5
    reranker: api
  llm:
    language: Chinese
  ```

### 3. Workflows
- **Daily Digest (`daily.yml`)**: Runs automatically at `22:00 UTC` every day. Can be triggered manually via `workflow_dispatch`.
- **Smoke Test (`test.yml`)**: A manual trigger that runs with a minimal config (limited sources, small paper count) to verify connectivity.
- **CI (`ci.yml`)**: Automatically runs tests and type-checks on every push to `main`.

---

## Local Run Guide

### 1. Prerequisites
- Node.js (v18+)
- npm

### 2. Installation
```bash
git clone https://github.com/nehSgnaiL/paper-daily-feed.git
cd paper-daily-feed
npm install
```

### 3. Local Configuration
Create a `.env.local` file in the root directory:
```bash
cp .env.example .env.local
```
Fill in your Zotero and Email credentials in `.env.local`.

(Optional) Create `config/custom.yaml` to override default settings:
```bash
cp config/custom.example.yaml config/custom.yaml
```

### 4. Normal Run
Build the project and start the recommendation engine:
```bash
npm run build
npm start
```

### 5. Test Run
To verify your setup without sending a full digest:

**A. Debug Mode (No Email)**
Set `debug: true` in `config/custom.yaml` and run:
```bash
npm start
```
This will print the HTML email content to your terminal instead of sending it.

**B. Smoke Test Email**
Run the dedicated test command:
```bash
npm run test:feed
```
This uses your local config but is intended for quick verification of the email delivery path.

---

## Journals
Journal RSS feeds are managed in `data/journals.config.ts`. You can add, remove, or rename sources there.
To filter sources in your run, use the `executor.source` parameter in your YAML config:
```yaml
executor:
  source: ["Nature", "Science", "PANS", "CEUS", "IJGIS", "IEEE T-ITS"]
```

## Recommendation Algorithm
1. **Local Mode (`local`)**: Uses an in-process HuggingFace model (e.g., `jinaai/jina-embeddings-v5-text-nano`) to embed RSS papers and Zotero abstracts. It then ranks by cosine similarity. This mode runs entirely on your local machine and does not require an external API.
2. **API Mode (`api`)**: Requires `EMBEDDING_API_BASE`. It embeds both the RSS papers and Zotero abstracts using a remote model (e.g., OpenAI `text-embedding-3-small`) and ranks by cosine similarity.

## Reference
Inspired by [TideDra/zotero-arxiv-daily](https://github.com/TideDra/zotero-arxiv-daily).
