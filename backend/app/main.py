import json
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, SecretStr, ValidationError

from . import llm
from .ingest import MAX_FILES, IngestError, collect, fetch_github, zip_entries
from .skeleton import CODE_LANGS, extract, scrub, select, skeleton_line

app = FastAPI(title="Interview question generator", docs_url=None, redoc_url=None)

MAX_TOPICS = 8
MAX_TOPIC_LEN = 40
MAX_SNIPPETS = 3

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


DIST = Path(__file__).parents[2] / "frontend" / "dist"
if DIST.is_dir():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="web")
