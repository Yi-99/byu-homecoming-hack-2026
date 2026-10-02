import os
from urllib.parse import urlencode

import httpx

API = "https://api.notion.com/v1"
VERSION = "2022-06-28"
MAX_CHILDREN = 100
MAX_TEXT = 2000
_ENV = ("NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET", "NOTION_REDIRECT_URI")
_PREFIXES = (
    ("### ", "heading_3"),
    ("## ", "heading_2"),
    ("# ", "heading_1"),
    ("- ", "bulleted_list_item"),
)


class NotionError(Exception):
    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


def configured() -> bool:
    return all(os.environ.get(name) for name in _ENV)


def secure() -> bool:
    return os.environ.get("NOTION_REDIRECT_URI", "").startswith("https://")


def authorize_url(state: str) -> str:
    return f"{API}/oauth/authorize?" + urlencode({
        "client_id": os.environ["NOTION_CLIENT_ID"],
        "redirect_uri": os.environ["NOTION_REDIRECT_URI"],
        "response_type": "code",
        "owner": "user",
        "state": state,
    })


async def _call(method: str, path: str, token: str | None = None, **kwargs) -> dict:
    headers = {"Notion-Version": VERSION}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.request(method, API + path, headers=headers, **kwargs)
    except httpx.HTTPError:
        raise NotionError("Could not reach Notion. Check the connection and try again.")
    try:
        data = r.json()
    except ValueError:
        data = {}
    if r.status_code == 401:
        raise NotionError("Notion no longer accepts this connection. Disconnect and connect again.", 401)
    if r.status_code != 200 or not isinstance(data, dict):
        detail = str(data.get("message", ""))[:300] if isinstance(data, dict) else ""
        raise NotionError(f"Notion returned an error ({r.status_code}). {detail}".strip())
    return data


async def exchange(code: str) -> tuple[str, str]:
    try:
        data = await _call(
            "POST",
            "/oauth/token",
            auth=(os.environ["NOTION_CLIENT_ID"], os.environ["NOTION_CLIENT_SECRET"]),
            json={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": os.environ["NOTION_REDIRECT_URI"],
            },
        )
    except NotionError as e:
        if e.status == 401:
            raise NotionError("Notion rejected this server's client ID or secret. Check the server settings.")
        raise
    token = data.get("access_token")
    if not isinstance(token, str):
        raise NotionError("Notion did not return an access token. Try again.")
    return token, str(data.get("workspace_name") or "Notion")


def _rich(text: str, **marks) -> list[dict]:
    out = []
    # odd pieces sat between backticks, so they render as inline code
    for i, piece in enumerate(text.split("`")):
        annotations = {**marks, "code": True} if i % 2 else marks
        for start in range(0, len(piece), MAX_TEXT):
            item = {"type": "text", "text": {"content": piece[start:start + MAX_TEXT]}}
            if annotations:
                item["annotations"] = annotations
            out.append(item)
    return out


def _block(kind: str, rich_text: list[dict], **extra) -> dict:
    return {"object": "block", "type": kind, kind: {"rich_text": rich_text, **extra}}


def blocks(markdown: str) -> tuple[str, list[dict]]:
    title, out, code = "", [], None
    for line in markdown.splitlines():
        if line.startswith("```"):
            if code is None:
                code = []
            else:
                text = "\n".join(code)[:MAX_TEXT]
                out.append(_block("code", [{"type": "text", "text": {"content": text}}], language="python"))
                code = None
        elif code is not None:
            code.append(line)
        elif line.startswith("# ") and not title:
            title = line[2:].strip()[:200]
        elif line.strip():
            kind, text = next(((k, line[len(p):]) for p, k in _PREFIXES if line.startswith(p)), ("paragraph", line))
            if len(text) > 4 and text.startswith("**") and text.endswith("**"):
                out.append(_block(kind, _rich(text[2:-2], bold=True)))
            else:
                out.append(_block(kind, _rich(text)))
    return title or "Interview question", out


async def save(token: str, markdown: str) -> str:
    title, children = blocks(markdown)
    # ponytail: saves under the first page shared at sign-in; add a page picker if users share several
    found = await _call(
        "POST", "/search", token, json={"filter": {"property": "object", "value": "page"}, "page_size": 1}
    )
    results = found.get("results") or []
    if not results:
        raise NotionError("No Notion page is shared with this app. Disconnect, connect again, and pick a page.", 422)
    page = await _call("POST", "/pages", token, json={
        "parent": {"page_id": results[0]["id"]},
        "properties": {"title": {"title": [{"type": "text", "text": {"content": title}}]}},
        "children": children[:MAX_CHILDREN],
    })
    for start in range(MAX_CHILDREN, len(children), MAX_CHILDREN):
        await _call(
            "PATCH", f"/blocks/{page['id']}/children", token, json={"children": children[start:start + MAX_CHILDREN]}
        )
    return str(page.get("url", ""))
