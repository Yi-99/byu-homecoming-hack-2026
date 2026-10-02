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

Or with [Task](https://taskfile.dev), from the repo root:

```bash
pnpm --dir frontend install && pnpm --dir frontend build
task dev
```

To try it without your own code, upload or ingest the sample repo in
`examples/stayly/`.

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

Run the API and the Vite dev server side by side in two terminals. Vite proxies
`/api` to port 8000.

```bash
task dev                    # terminal 1: API with reload on :8000
cd frontend && pnpm dev     # terminal 2: Vite dev server
```

Without Task: `cd backend && uv run uvicorn app.main:app --port 8000 --reload`.

| pnpm command (in `frontend/`) | Does |
| --- | --- |
| `pnpm install` | Install frontend dependencies |
| `pnpm dev` | Vite dev server with hot reload |
| `pnpm build` | Build to `frontend/dist`, which the backend serves |
| `pnpm preview` | Serve the built bundle locally |

### Backend tasks and Docker

With [Task](https://taskfile.dev) installed, from the repo root:

| Command | Does |
| --- | --- |
| `task` | List all tasks |
| `task dev` | Run the backend locally with reload |
| `task build` | Build the backend Docker image |
| `task up` | Build and run the container on <http://127.0.0.1:8000> |
| `task logs` | Follow the container logs |
| `task down` | Stop the container |

The image holds the API only. Run `pnpm dev` in `frontend/` for the page.

### Notion (optional)

Sending questions to Notion needs a Notion public integration. Without these
settings the rest of the app works and "Connect Notion" reports that it is not
set up.

1. Create a public integration at <https://www.notion.so/profile/integrations>
   with the "Insert content" and "Read content" capabilities.
2. Add a redirect URI: `http://localhost:8000/api/notion/callback`, or
   `http://localhost:5173/api/notion/callback` when using the Vite dev server.
3. Open the app on the same host as the redirect URI (`localhost`, not
   `127.0.0.1`), or the sign-in check fails.
4. Set these before starting the backend. `task up` passes them into the container.

```bash
export NOTION_CLIENT_ID=...
export NOTION_CLIENT_SECRET=...
export NOTION_REDIRECT_URI=http://localhost:8000/api/notion/callback
```

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
7. **Keep.** Save a question in the browser, copy it, download it as Markdown,
   save it as a PDF through the print dialog, or send it to Notion. Each works
   with or without the interviewer notes.

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

Notion, if you connect it:

- Off by default. The page asks for confirmation before the first sign-in,
  because it is the one path where a question leaves the browser for a third
  party.
- Sign-in is OAuth 2.0 in a pop-up. The server swaps the code for an access
  token and hands it to the browser in a URL fragment; it does not keep it.
- The token lives in `sessionStorage` like the model keys. "Disconnect Notion"
  forgets it. To revoke access entirely, remove the integration in Notion.
- Each question you send passes through this server to Notion and is stored in
  your workspace, under the first page you shared at sign-in. Source files and
  model keys are never sent to Notion.

Other controls:

- Nothing is stored or logged. The server is stateless between requests.
  Saved questions stay in this browser's `localStorage`.
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
backend/app/notion.py     Notion OAuth and page creation
frontend/src/             React + Vite + Tailwind single-page app, managed with pnpm
```
