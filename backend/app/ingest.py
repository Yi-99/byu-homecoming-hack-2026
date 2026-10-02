import io
import re
import zipfile
from collections.abc import Callable, Iterable
from pathlib import PurePosixPath

import httpx
import tree_sitter_language_pack as tsp

from .skeleton import CODE_LANGS

MAX_ZIP = 50 * 1024 * 1024
MAX_FILE = 200_000
MAX_FILES = 2000

SKIP_DIRS = {
    ".git", "node_modules", "vendor", "dist", "build", "out", "target", ".venv", "venv",
    "__pycache__", ".next", "coverage", "test", "tests", "__tests__", "spec", "specs",
    "fixtures", "third_party",
}
_SKIP_NAME = re.compile(r"^test_|_test\.|\.test\.|\.spec\.|\.min\.|\.d\.ts$|\.generated\.|_pb2\.")
_GITHUB = re.compile(r"^https://github\.com/([A-Za-z0-9][A-Za-z0-9-]*)/([\w.-]+?)(?:\.git)?/?$")

Entry = tuple[str, Callable[[int], bytes]]


class IngestError(Exception):
    pass


def language(path: str) -> str | None:
    p = PurePosixPath(path.replace("\\", "/"))
    if any(part in SKIP_DIRS for part in p.parts[:-1]):
        return None
    if p.name.startswith(".env") or _SKIP_NAME.search(p.name):
        return None
    lang = tsp.detect_language_from_path(p.name)
    return lang if lang in CODE_LANGS else None


def collect(entries: Iterable[Entry]) -> tuple[list[tuple[str, str, str]], dict]:
    files: list[tuple[str, str, str]] = []
    stats = {"seen": 0, "skipped": 0, "truncated": False}
    for path, read in entries:
        stats["seen"] += 1
        lang = language(path)
        if not lang:
            stats["skipped"] += 1
            continue
        if len(files) >= MAX_FILES:
            stats["truncated"] = True
            break
        data = read(MAX_FILE + 1)
        if len(data) > MAX_FILE or b"\0" in data:
            stats["skipped"] += 1
            continue
        try:
            files.append((path, lang, data.decode("utf-8")))
        except UnicodeDecodeError:
            stats["skipped"] += 1
    return files, stats


def zip_entries(blob: bytes) -> Iterable[Entry]:
    try:
        zf = zipfile.ZipFile(io.BytesIO(blob))
    except zipfile.BadZipFile:
        raise IngestError("GitHub returned an archive that could not be read.")
    for info in zf.infolist():
        if not info.is_dir():
            # GitHub wraps everything in one owner-repo-sha/ folder
            path = info.filename.split("/", 1)[-1]
            yield path, lambda n, info=info: zf.open(info).read(n)


def parse_github_url(url: str) -> tuple[str, str] | None:
    m = _GITHUB.match(url.strip())
    if not m or set(m[2]) == {"."}:
        return None
    return m[1], m[2]


async def fetch_github(url: str) -> bytes:
    parsed = parse_github_url(url)
    if not parsed:
        raise IngestError("Enter a public repo URL like https://github.com/owner/repo")
    owner, repo = parsed
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            async with client.stream("GET", f"https://api.github.com/repos/{owner}/{repo}/zipball") as r:
                if r.status_code == 404:
                    raise IngestError("Repository not found. Private repos are not supported; upload the folder instead.")
                if r.status_code in (403, 429):
                    raise IngestError("GitHub rate limit reached. Wait a few minutes or upload the folder instead.")
                if r.status_code != 200:
                    raise IngestError(f"GitHub returned status {r.status_code}.")
                buf = bytearray()
                async for chunk in r.aiter_bytes():
                    buf += chunk
                    if len(buf) > MAX_ZIP:
                        raise IngestError("Repository archive is over 50 MB. Upload a subfolder instead.")
    except httpx.HTTPError:
        raise IngestError("Could not reach GitHub. Check the connection and try again.")
    return bytes(buf)
