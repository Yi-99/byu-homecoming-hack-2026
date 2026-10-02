import re
from dataclasses import dataclass, field

import tree_sitter_language_pack as tsp

CODE_LANGS = {
    "python", "javascript", "typescript", "tsx", "java", "go", "rust", "ruby",
    "c", "cpp", "csharp", "kotlin", "swift", "php", "scala",
}
MIN_LOC = 6
MAX_FUNCS = 300
MAX_SNIPPET_CHARS = 8000

_FUNC_KINDS = ("Function", "Method")
# ponytail: node-type name heuristics, misses functional loops like forEach/map;
# upgrade to per-language tree-sitter queries if ranking quality suffers
_LOOP = re.compile(
    r"(^|_)(for|foreach|while|do|loop|until)(_\w+)?_(statement|expression|loop)$|^(for|while|until)$"
)
_CALL = re.compile(r"call|invocation")
_TRAILING_IDENT = re.compile(r"[A-Za-z_]\w*$")


@dataclass
class Func:
    path: str
    name: str
    signature: str
    loc: int
    code: str
    calls: list[str] = field(default_factory=list)
    loop_depth: int = 0
    recursive: bool = False
    id: str = ""


def _callee(node) -> str | None:
    target = (
        node.child_by_field_name("function")
        or node.child_by_field_name("name")
        or node.child_by_field_name("method")
    )
    if target is None:
        return None
    match = _TRAILING_IDENT.search(target.text.decode("utf-8", "replace"))
    return match.group() if match else None


def _walk(node, depth: int, calls: list[str]) -> int:
    if _LOOP.search(node.type):
        depth += 1
    elif _CALL.search(node.type):
        name = _callee(node)
        if name and name not in calls:
            calls.append(name)
    return max([depth] + [_walk(child, depth, calls) for child in node.named_children])


def extract(path: str, lang: str, text: str) -> list[Func]:
    data = text.encode()
    structure = tsp.process(text, tsp.ProcessConfig(language=lang, imports=False, exports=False)).structure
    root = tsp.get_parser(lang).parse(data).root_node
    funcs: list[Func] = []

    def visit(items, prefix: str):
        for item in items:
            qualified = f"{prefix}{item.name}" if item.name else ""
            if str(item.kind) in _FUNC_KINDS and item.name:
                span = item.span
                node = root.descendant_for_byte_range(span.start_byte, max(span.start_byte, span.end_byte - 1))
                calls: list[str] = []
                depth = _walk(node, 0, calls) if node else 0
                bare = item.name.rsplit(".", 1)[-1]
                funcs.append(Func(
                    path=path,
                    name=qualified,
                    signature=" ".join((item.signature or item.name).split())[:160],
                    loc=span.end_line - span.start_line + 1,
                    code=data[span.start_byte:span.end_byte].decode("utf-8", "replace"),
                    calls=calls,
                    loop_depth=depth,
                    recursive=bare in calls,
                ))
            visit(item.children, f"{qualified}." if qualified else prefix)

    visit(structure, "")
    return funcs


def select(funcs: list[Func]) -> list[Func]:
    # ponytail: loop depth then size as a proxy for "interesting"; swap for a
    # real complexity metric if good candidates get cut on large repos
    kept = sorted(
        (f for f in funcs if f.loc >= MIN_LOC),
        key=lambda f: (-f.loop_depth, -f.recursive, -f.loc),
    )[:MAX_FUNCS]
    for i, f in enumerate(kept):
        f.id = f"f{i}"
    return kept


def skeleton_line(f: Func) -> str:
    calls = ",".join(f.calls[:8])
    return f"{f.id}|{f.path}|{f.name}|{f.signature}|loc={f.loc}|loop={f.loop_depth}|rec={int(f.recursive)}|calls={calls}"


_R = "<REDACTED>"
# ponytail: regex scrubbing is best-effort; upgrade to detect-secrets for entropy checks
_SCRUB = [
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----", re.S), _R),
    (re.compile(r"\b(?:sk|pk|rk)[-_][A-Za-z0-9_\-]{16,}"), _R),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), _R),
    (re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b"), _R),
    (re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}"), _R),
    (re.compile(r"\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{5,}"), _R),
    (re.compile(r"\b[a-z][a-z0-9+.-]*://[^\s'\"`<>)]+", re.I), _R),
    (re.compile(r"\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b"), _R),
    (re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"), _R),
    (
        re.compile(r"(?i)\b(\w*(?:password|passwd|secret|token|api_?key|credential)\w*\s*[:=]\s*)(['\"`])[^'\"`\n]{4,}\2"),
        rf"\1\2{_R}\2",
    ),
    (re.compile(r"(?<=['\"`])[A-Za-z0-9+/=_\-]{32,}(?=['\"`])"), _R),
]


def scrub(code: str) -> str:
    for pattern, replacement in _SCRUB:
        code = pattern.sub(replacement, code)
    if len(code) > MAX_SNIPPET_CHARS:
        code = code[:MAX_SNIPPET_CHARS] + "\n... [truncated]"
    return code
