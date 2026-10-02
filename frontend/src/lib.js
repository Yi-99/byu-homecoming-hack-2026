export const TOPICS = [
  "arrays", "hash map", "two pointers", "sliding window", "stack", "queue", "heap",
  "linked list", "tree", "graph", "dfs", "bfs", "dynamic programming", "binary search", "trie",
  "union-find", "greedy", "backtracking", "intervals", "sorting",
];
export const PROVIDERS = [
  { id: "anthropic", label: "Anthropic" },
  { id: "openai", label: "OpenAI" },
  { id: "xai", label: "xAI Grok" },
];
export const labelOf = (id) => PROVIDERS.find((p) => p.id === id).label;
export const MAX_FILES = 2000;
export const MAX_TOPICS = 8;
export const MAX_SNIPPETS = 3;

// keep in sync with app/ingest.py; the server re-checks everything
const SKIP_DIRS = new Set([
  ".git", "node_modules", "vendor", "dist", "build", "out", "target", ".venv", "venv",
  "__pycache__", ".next", "coverage", "test", "tests", "__tests__", "spec", "specs",
  "fixtures", "third_party",
]);
const CODE_EXT = new Set([
  "py", "js", "jsx", "mjs", "cjs", "ts", "tsx", "java", "go", "rs", "rb", "c", "h",
  "cc", "cpp", "hpp", "cs", "kt", "swift", "php", "scala",
]);
const SKIP_NAME = /^test_|_test\.|\.test\.|\.spec\.|\.min\.|\.d\.ts$|\.generated\.|_pb2\./;
const MAX_FILE = 200_000;

function wanted(path, size) {
  const parts = path.split("/");
  const name = parts.pop();
  if (parts.some((p) => SKIP_DIRS.has(p))) return false;
  if (name.startsWith(".env") || SKIP_NAME.test(name)) return false;
  return CODE_EXT.has(name.split(".").pop().toLowerCase()) && size <= MAX_FILE;
}

export function filterFolder(fileList) {
  const kept = [];
  for (const file of fileList) {
    // drop the chosen folder's own name so a repo called "build" is not skipped
    const path = file.webkitRelativePath.split("/").slice(1).join("/") || file.name;
    if (wanted(path, file.size)) kept.push({ file, path });
  }
  return kept.slice(0, MAX_FILES);
}

const readBatch = (reader) => new Promise((ok, fail) => reader.readEntries(ok, fail));
const fileOf = (entry) => new Promise((ok, fail) => entry.file(ok, fail));

async function walkDir(dir, prefix, out) {
  const reader = dir.createReader();
  for (let batch = await readBatch(reader); batch.length; batch = await readBatch(reader)) {
    for (const child of batch) {
      if (out.kept.length >= MAX_FILES) return;
      const path = prefix + child.name;
      if (child.isFile) {
        out.seen++;
        const file = await fileOf(child);
        if (wanted(path, file.size)) out.kept.push({ file, path });
      } else if (!SKIP_DIRS.has(child.name)) {
        await walkDir(child, `${path}/`, out);
      }
    }
  }
}

// entries must be grabbed before the first await: the browser empties dataTransfer after the event
export async function readDropped(dataTransfer) {
  const roots = [...dataTransfer.items].map((item) => item.webkitGetAsEntry?.()).filter((e) => e?.isDirectory);
  const out = { kept: [], seen: 0 };
  for (const root of roots) await walkDir(root, "", out);
  return out;
}

export async function post(url, options) {
  let response;
  try {
    response = await fetch(url, { method: "POST", ...options });
  } catch {
    throw new Error("Could not reach the server. Check that it is running and try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : "Something went wrong. Try again.");
  }
  return data;
}

export const asJson = (body) => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// keys live in sessionStorage: gone when the tab closes, never sent anywhere but our own server
const slot = (id) => `homegrown.llm.${id}`;

export function storedLlm(id) {
  try {
    return JSON.parse(sessionStorage.getItem(slot(id)));
  } catch {
    return null;
  }
}

export function storeLlm(id, value) {
  try {
    if (value) sessionStorage.setItem(slot(id), JSON.stringify(value));
    else sessionStorage.removeItem(slot(id));
  } catch {
    // storage blocked: the key just won't survive a reload
  }
}

const SAVED = "homegrown.saved";

export function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(SAVED)) || [];
  } catch {
    return [];
  }
}

export function storeSaved(list) {
  try {
    localStorage.setItem(SAVED, JSON.stringify(list));
  } catch {
    // storage blocked: saves last until reload
  }
}

export const partsOf =(q) => [q.part1, q.part2, q.part3];

export function toMarkdown(q, withNotes, byline) {
  const out = [`# ${q.title}`, "", q.story, ""];
  partsOf(q).forEach((p, i) => {
    out.push(`## Part ${i + 1}`, "", p.prompt, "", "```python", p.signature, "```", "");
    p.examples.forEach((e, j) => {
      out.push(`**Example ${j + 1}**`, "", `- Input: \`${e.input}\``, `- Output: \`${e.output}\``, `- Why: ${e.explanation}`, "");
    });
    out.push("**Constraints**", "", ...p.constraints.map((c) => `- ${c}`), "");
    if (withNotes) {
      out.push(
        "### Interviewer notes", "",
        `- Target complexity: ${p.target_complexity}`,
        `- Intended approach: ${p.approach}`,
        ...p.hints.map((x, j) => `- Hint ${j + 1}: ${x}`), "",
      );
    }
  });
  if (withNotes) {
    out.push("## What a strong candidate shows", "", ...q.rubric.map((r) => `- ${r}`), "");
    out.push(`Topics: ${q.tags.join(", ")}`, "", `Written by ${byline}. Example outputs were model-traced, not executed. Verify before use.`, "");
  }
  return out.join("\n");
}
