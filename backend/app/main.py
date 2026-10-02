import json
import secrets
from pathlib import Path
from typing import Literal
from urllib.parse import urlencode

from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, SecretStr, ValidationError

from . import llm, notion
from .ingest import MAX_FILES, IngestError, collect, fetch_github, zip_entries
from .skeleton import CODE_LANGS, extract, scrub, select, skeleton_line

app = FastAPI(title="Interview question generator", docs_url=None, redoc_url=None)

MAX_TOPICS = 8
MAX_TOPIC_LEN = 40
MAX_SNIPPETS = 3
STATE_COOKIE = "notion_state"

Provider = Literal["anthropic", "openai", "xai"]
Key = SecretStr


class Credentials(BaseModel):
    provider: Provider
    key: Key = Field(min_length=8, max_length=400)


class LLM(Credentials):
    model: str = Field(min_length=1, max_length=120, pattern=r"^[\w.:/\-]+$")

    def who(self) -> tuple[str, str, str]:
        return self.provider, self.model, self.key.get_secret_value()


@app.exception_handler(RequestValidationError)
async def invalid_request(request: Request, exc: RequestValidationError):
    # the default handler echoes the request body, which would include the API key
    problems = "; ".join(f"{'.'.join(map(str, e['loc'][1:]))}: {e['msg']}" for e in exc.errors())
    return JSONResponse({"detail": f"Invalid request. {problems}"}, status_code=422)


def _topics(raw) -> list[str]:
    if not isinstance(raw, list) or not all(isinstance(t, str) for t in raw):
        raise HTTPException(400, "Topics must be a list of strings.")
    topics = [t.strip()[:MAX_TOPIC_LEN] for t in raw if t.strip()][:MAX_TOPICS]
    if not topics:
        raise HTTPException(400, "Pick at least one data structure or algorithm.")
    return topics


async def _llm(call):
    try:
        return await call
    except llm.LLMError as e:
        raise HTTPException(e.status, str(e))


def _parse(files) -> list:
    funcs = []
    for path, lang, text in files:
        try:
            funcs.extend(extract(path, lang, text))
        except Exception:
            continue
    return funcs


@app.post("/api/models")
async def models(body: Credentials):
    found = await _llm(llm.list_models(body.provider, body.key.get_secret_value()))
    return {"models": found}


@app.post("/api/analyze")
async def analyze(request: Request):
    form = await request.form(max_files=MAX_FILES + 1, max_fields=10)
    try:
        ranker = LLM.model_validate_json(form.get("llm") or "")
    except ValidationError:
        raise HTTPException(400, "Connect a model with your own API key before analyzing a codebase.")
    try:
        topics = _topics(json.loads(form.get("topics") or "[]"))
    except json.JSONDecodeError:
        raise HTTPException(400, "Topics must be a JSON list.")

    github_url = (form.get("github_url") or "").strip()
    uploads = [f for f in form.getlist("files") if hasattr(f, "filename")]
    try:
        if github_url:
            entries = zip_entries(await fetch_github(github_url))
        elif uploads:
            entries = ((f.filename, f.file.read) for f in uploads)
        else:
            raise HTTPException(400, "Choose a folder or enter a GitHub URL.")
        files, stats = await run_in_threadpool(collect, entries)
    except IngestError as e:
        raise HTTPException(400, str(e))

    all_funcs = await run_in_threadpool(_parse, files)
    funcs = select(all_funcs)
    stats.update(files=len(files), functions=len(all_funcs), considered=len(funcs))
    if not funcs:
        langs = ", ".join(sorted(CODE_LANGS))
        raise HTTPException(422, f"No functions of useful size found. Supported languages: {langs}.")

    result, usage = await _llm(llm.rank(ranker.who(), topics, [skeleton_line(f) for f in funcs]))
    stats["tokens_sent"] = usage["input_tokens"]
    by_id = {f.id: f for f in funcs}
    candidates = [
        {
            "id": f.id,
            "path": f.path,
            "name": f.name,
            "loc": f.loc,
            "why": c["why"],
            "topics_matched": c["topics_matched"],
            "code_scrubbed": scrub(f.code),
        }
        for c in result["candidates"][: llm.MAX_CANDIDATES]
        if (f := by_id.get(c["id"]))
    ]
    return {
        "stats": stats,
        "candidates": candidates,
        "note": result["note"],
        "ranked_by": {"provider": ranker.provider, "model": ranker.model},
    }


class Snippet(BaseModel):
    path: str = Field(max_length=400)
    name: str = Field(max_length=200)
    code: str = Field(max_length=20_000)


class GenerateBody(BaseModel):
    llm: LLM
    topics: list[str]
    snippets: list[Snippet] = Field(min_length=1, max_length=MAX_SNIPPETS)


@app.post("/api/generate")
async def generate(body: GenerateBody):
    topics = _topics(body.topics)
    snippets = [{"name": s.name, "code": scrub(s.code)} for s in body.snippets]
    question, usage = await _llm(llm.generate(body.llm.who(), topics, snippets))
    return {"question": question, "usage": usage}


class NotionPage(BaseModel):
    token: Key = Field(min_length=8, max_length=400)
    markdown: str = Field(min_length=1, max_length=60_000)


@app.get("/api/notion/login")
async def notion_login():
    if not notion.configured():
        raise HTTPException(503, "Notion is not set up on this server. See the README for the three settings it needs.")
    state = secrets.token_urlsafe(24)
    response = RedirectResponse(notion.authorize_url(state))
    response.set_cookie(
        STATE_COOKIE, state, max_age=600, httponly=True, samesite="lax", secure=notion.secure(), path="/api/notion"
    )
    return response


@app.get("/api/notion/callback")
async def notion_callback(request: Request, code: str = "", state: str = "", error: str = ""):
    expected = request.cookies.get(STATE_COOKIE, "")
    if error:
        result = {"notion_error": f"Notion did not connect ({error[:80]})."}
    elif not code or not expected or not secrets.compare_digest(state.encode(), expected.encode()):
        result = {"notion_error": "The Notion sign-in could not be verified. Try again."}
    else:
        try:
            token, workspace = await notion.exchange(code)
            result = {"notion_token": token, "notion_workspace": workspace}
        except notion.NotionError as e:
            result = {"notion_error": str(e)}
    # the token rides in the URL fragment, which browsers never send to a server
    response = RedirectResponse("/#" + urlencode(result), 303)
    response.delete_cookie(STATE_COOKIE, path="/api/notion")
    return response


@app.post("/api/notion/pages")
async def notion_page(body: NotionPage):
    try:
        url = await notion.save(body.token.get_secret_value(), body.markdown)
    except notion.NotionError as e:
        raise HTTPException(e.status, str(e))
    return {"url": url}


DIST = Path(__file__).parents[2] / "frontend" / "dist"
if DIST.is_dir():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="web")
