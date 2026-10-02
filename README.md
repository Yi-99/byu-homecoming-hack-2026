# Homegrown

Turn a real function from your codebase into a three-part, LeetCode-style
interview question. Connect the models you want with your own API keys, pick a
codebase and the data structures and algorithms to test, approve which functions
the models may read, and compare each model's question side by side.

## Run it

Requires Python 3.11+, Node 20+, [uv](https://docs.astral.sh/uv/), and
[pnpm](https://pnpm.io).

```bash
cd frontend && pnpm install && pnpm build && cd ..
cd backend && uv run uvicorn app.main:app --port 8000
```

`uv run` creates `backend/.venv` and installs the locked dependencies on first use.

Open <http://127.0.0.1:8000>.

The app has no model access of its own and no server-side API key. Each user
connects at least one provider in the page with their own key:

| Provider | Key from |
| --- | --- |
| Anthropic | <https://console.anthropic.com> |
| OpenAI | <https://platform.openai.com/api-keys> |
| xAI Grok | <https://console.x.ai> |

The first run downloads tree-sitter grammars for the languages it meets, so it
needs network access once per language.

### Frontend development

Run the API and the Vite dev server side by side. Vite proxies `/api` to port 8000.

```bash
cd backend && uv run uvicorn app.main:app --port 8000 --reload
cd frontend && pnpm dev
```

### Backend tasks and Docker

With [Task](https://taskfile.dev) installed, from the repo root:

| Command | Does |
| --- | --- |
| `task dev` | Run the backend locally with reload |
| `task build` | Build the backend Docker image |
| `task up` | Build and run the container on <http://127.0.0.1:8000> |
| `task logs` | Follow the container logs |
| `task down` | Stop the container |

The image holds the API only. Run `pnpm dev` in `frontend/` for the page.

## How it works

1. **Connect.** Paste a key for one or more providers. The app lists that
   provider's models live and you pick one each.
2. **Ingest.** Upload a folder or give a public GitHub URL. Dependencies, tests,
   build output, lockfiles, and `.env*` files are skipped.
3. **Outline.** tree-sitter parses each file. Every function becomes one compact
   line: path, name, signature, size, loop depth, recursion, callees.
4. **Rank.** The outline and your topics go to the first connected model, which
   picks up to five functions that fit.
5. **Approve.** You see the exact, secret-scrubbed code for each pick and choose
   up to three.
6. **Generate and compare.** The approved snippets go to every connected model
   in parallel. Results appear in aligned columns, with time and token counts,
   so Part 1 sits next to Part 1.

Supported languages: Python, JavaScript, TypeScript/TSX, Java, Go, Rust, Ruby, C,
C++, C#, Kotlin, Swift, PHP, Scala.

## What reaches the models

| Data | Sent? |
| --- | --- |
| Source files | No. Parsed in server memory, then discarded. |
| Function outline | Signatures and names only, up to 300 functions, to the ranking model. |
| Function bodies | Only the ones you approve, after secret scrubbing, to each connected model. |

API keys:

- Kept in the browser tab's `sessionStorage`; closing the tab removes them.
  "Remove key" deletes one immediately.
- Sent with each request to this app's server, which forwards the key to that
  provider only. The server does not store or log keys, and error responses
  never echo request bodies.
- A request without a key is rejected. There is no fallback key.

Other controls:

- Nothing is stored or logged. The server is stateless between requests.
- GitHub archives are read from memory and never extracted to disk.
- Only `https://github.com/owner/repo` URLs are accepted.
- Limits: 50 MB archive, 200 KB per file, 2000 files.
- The page loads no third-party scripts, fonts, or styles.

## Known limits

- Keys travel from the browser to this server. Serve it over HTTPS if it is
  ever hosted beyond localhost.
- Secret scrubbing is regex-based and best-effort. Read the preview before you
  approve a function.
- Example outputs are worked out by the model, not executed. Verify them before
  using a question.
- A model must support JSON-schema structured output. Models that do not are
  rejected by their provider with a message shown in that column.
- No authentication or rate limiting on the app itself.
- An upload over 1 MB per file would be spooled to a temp file by the web
  framework. The page never sends files over 200 KB.
- Loop detection is a node-name heuristic and does not count `forEach`/`map`.
- Public GitHub repos only. For private code, upload the folder.

## Layout

```text
backend/pyproject.toml    Python dependencies, managed with uv
backend/app/main.py       API routes, serves the built frontend
backend/app/ingest.py     folder and GitHub ingest, filters, limits
backend/app/skeleton.py   tree-sitter outline and secret scrubbing
backend/app/llm.py        provider calls (Anthropic SDK, OpenAI-style HTTP) and prompts
frontend/src/             React + Vite + Tailwind single-page app, managed with pnpm
```
