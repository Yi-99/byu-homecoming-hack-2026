import { useState } from "react";
import { MAX_TOPICS, TOPICS, filterFolder, labelOf, post } from "./lib.js";
import { ErrorNote, Step, peerFocus, primaryButton, quietButton } from "./ui.jsx";

const SOURCES = [
  ["folder", "Folder on this computer"],
  ["github", "Public GitHub repo"],
];
const textInput = "w-full rounded-lg border border-line bg-surface px-3 placeholder:text-muted";

export default function SourceForm({ ranker, onAnalyzed }) {
  const [source, setSource] = useState("folder");
  const [files, setFiles] = useState([]);
  const [folderStatus, setFolderStatus] = useState("Dependencies, tests, build output, and .env files are skipped before upload.");
  const [githubUrl, setGithubUrl] = useState("");
  const [topics, setTopics] = useState(TOPICS);
  const [picked, setPicked] = useState([]);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function pickFolder(event) {
    const all = [...event.target.files];
    const kept = filterFolder(all);
    setFiles(kept);
    setFolderStatus(all.length
      ? `${kept.length.toLocaleString()} source files ready, ${(all.length - kept.length).toLocaleString()} skipped.`
      : "No files found in that folder.");
  }

  function toggle(topic) {
    setPicked((p) => (p.includes(topic) ? p.filter((t) => t !== topic) : [...p, topic]));
  }

  function addCustom() {
    const topic = custom.trim().toLowerCase();
    if (!topic) return;
    if (!topics.includes(topic)) setTopics((t) => [...t, topic]);
    if (!picked.includes(topic)) setPicked((p) => [...p, topic]);
    setCustom("");
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!ranker) return setError("Connect at least one model with your API key in step 1.");
    if (!picked.length) return setError("Pick at least one data structure or algorithm.");
    if (picked.length > MAX_TOPICS) return setError(`Pick up to ${MAX_TOPICS} topics.`);

    const body = new FormData();
    body.append("topics", JSON.stringify(picked));
    body.append("llm", JSON.stringify(ranker));
    if (source === "github") {
      if (!githubUrl.trim()) return setError("Enter a GitHub repository URL.");
      body.append("github_url", githubUrl.trim());
    } else {
      if (!files.length) return setError("Choose a folder that contains source files.");
      for (const { file, path } of files) body.append("files", file, path);
    }

    setBusy(true);
    try {
      onAnalyzed(picked, await post("/api/analyze", { body }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Step n={2} title="Choose a codebase and what to test">
      <form onSubmit={submit}>
        <fieldset className="inline-flex rounded-[10px] border border-line bg-board p-[3px]">
          <legend className="sr-only">Where the code is</legend>
          {SOURCES.map(([value, label]) => (
            <label key={value} className="relative cursor-pointer">
              <input className="peer absolute opacity-0" type="radio" name="source" value={value} checked={source === value} onChange={() => setSource(value)} />
              <span className={`block rounded-[7px] px-3.5 py-1.5 text-sm font-semibold text-muted peer-checked:bg-surface peer-checked:text-ink peer-checked:ring-1 peer-checked:ring-line ${peerFocus}`}>{label}</span>
            </label>
          ))}
        </fieldset>

        {source === "folder" ? (
          <div className="mt-5">
            <input id="folder-input" className="peer sr-only" type="file" webkitdirectory="" multiple onChange={pickFolder} />
            <label htmlFor="folder-input" className={`inline-block cursor-pointer rounded-lg border border-dashed border-muted px-4 py-2.5 font-semibold transition-colors hover:border-marker hover:text-marker ${peerFocus}`}>Choose folder</label>
            <p className="mt-2.5 text-sm text-muted" role="status">{folderStatus}</p>
          </div>
        ) : (
          <div className="mt-5">
            <label htmlFor="github-input" className="mb-1.5 block text-sm font-semibold">Repository URL</label>
            <input id="github-input" className={`${textInput} py-2.5`} type="url" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://github.com/owner/repo" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
          </div>
        )}

        <fieldset className="mt-7">
          <legend className="mb-3 text-sm font-semibold">Data structures and algorithms to test</legend>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <label key={topic} className="relative cursor-pointer">
                <input className="peer absolute opacity-0" type="checkbox" checked={picked.includes(topic)} onChange={() => toggle(topic)} />
                <span className={`block rounded-full border border-line px-3 py-1 text-sm transition-colors peer-checked:border-marker peer-checked:bg-marker peer-checked:font-semibold peer-checked:text-on-marker ${peerFocus}`}>{topic}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex max-w-md gap-2">
            <label htmlFor="custom-topic" className="sr-only">Add another topic</label>
            <input
              id="custom-topic"
              className={`${textInput} py-2 text-sm`}
              type="text"
              maxLength={40}
              placeholder="Add another, e.g. monotonic stack"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
            <button type="button" className={quietButton} onClick={addCustom}>Add</button>
          </div>
        </fieldset>

        <ErrorNote>{error}</ErrorNote>
        <button type="submit" className={primaryButton} disabled={busy} aria-busy={busy}>
          {busy ? "Reading the codebase…" : "Find matching functions"}
        </button>
        <p className="mt-2.5 text-sm text-muted">
          {ranker
            ? `${labelOf(ranker.provider)} (${ranker.model}) will pick the functions from an outline of names and signatures.`
            : "Connect a model in step 1 first."}
        </p>
      </form>
    </Step>
  );
}
