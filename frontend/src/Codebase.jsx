import { useRef, useState } from "react";
import { filterFolder, readDropped } from "./lib.js";
import { ErrorNote, StepHead, btn, input, needClass } from "./ui.jsx";

const SOURCES = [
  ["github", "Public GitHub URL"],
  ["upload", "Upload folder"],
];
const REPO = /^https?:\/\/(www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(\.git)?\/?$/i;

// a codebase is either { kind: "folder", name, files, skipped } or { kind: "github", name, url }
export default function Codebase({ codebases, setCodebases, selected, setSelected, nudge }) {
  const [mode, setMode] = useState("github");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [dropNote, setDropNote] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  function add(cb) {
    const id = Date.now();
    setCodebases((list) => [...list.filter((c) => c.kind !== cb.kind || c.name !== cb.name), { ...cb, id }]);
    setSelected(id);
  }

  function addRepo(event) {
    event.preventDefault();
    const match = url.trim().match(REPO);
    if (!match) return setUrlError("Enter a public repository URL like https://github.com/owner/repo.");
    setUrlError("");
    add({ kind: "github", name: `${match[2]}/${match[3]}`, url: url.trim() });
    setUrl("");
  }

  function addFolder(name, kept, seen) {
    if (!seen) return setDropNote("No files found in that folder.");
    if (!kept.length) return setDropNote("No source files in that folder after skipping dependencies, tests and build output.");
    setDropNote("");
    add({ kind: "folder", name, files: kept, skipped: seen - kept.length });
  }

  function pickFolder(event) {
    const all = [...event.target.files];
    const name = all[0]?.webkitRelativePath.split("/")[0] || "folder";
    addFolder(name, filterFolder(all), all.length);
    event.target.value = "";
  }

  async function dropFolder(event) {
    event.preventDefault();
    setDragging(false);
    const name = [...event.dataTransfer.items].map((i) => i.webkitGetAsEntry?.()).find((e) => e?.isDirectory)?.name;
    setDropNote("Reading dropped folder…");
    try {
      const { kept, seen } = await readDropped(event.dataTransfer);
      if (seen) addFolder(name || "folder", kept, seen);
      else setDropNote("Drop a folder, not individual files.");
    } catch {
      setDropNote("Could not read that folder. Click to choose it instead.");
    }
  }

  const need = needClass(nudge);

  return (
    <>
      <StepHead n={2} total={5} title="Add a codebase">
        Upload a folder or give a public GitHub URL. The AI reads an outline of it and builds the question from real functions.
      </StepHead>

      <div className="flex flex-none self-start border border-divider" role="tablist" aria-label="Where the code is">
        {SOURCES.map(([key, label], i) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            className={`cursor-pointer px-4 py-2 text-[13px] whitespace-nowrap ${i ? "border-l border-divider" : ""} ${mode === key ? "bg-accent text-bg" : "bg-transparent text-ink hover:bg-ink/7"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "github" ? (
        <form onSubmit={addRepo} className="max-w-[760px]">
          <label htmlFor="github-input" className="mb-1.5 block text-xs text-ink/70">Public repository</label>
          <div className="flex gap-2">
            <input
              id="github-input"
              className={`${input} flex-1 ${codebases.length ? "" : need}`}
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button type="submit" className={`${btn} h-9 whitespace-nowrap`}>Add repo</button>
          </div>
          <ErrorNote className="mt-3">{urlError}</ErrorNote>
        </form>
      ) : (
        <>
          <input ref={fileRef} type="file" webkitdirectory="" multiple onChange={pickFolder} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
            onDrop={dropFolder}
            className={`flex max-w-[760px] cursor-pointer flex-col items-center gap-1.5 border border-dashed p-9 text-ink transition-colors ${dragging ? "border-accent bg-accent-100" : "border-divider bg-transparent"} ${codebases.length ? "" : need}`}
          >
            <span className="text-[15px] font-medium">{dragging ? "Drop the folder" : "Drag a folder here, or click to choose one"}</span>
            <span className="text-[13px] text-neutral-700" role="status">{dropNote || "Only source files are uploaded."}</span>
          </button>
        </>
      )}

      {codebases.length > 0 && (
        <div className="flex max-w-[760px] animate-fade-in flex-col gap-2.5">
          <span className="text-[13px] text-neutral-700">
            {codebases.length > 1 ? "Click the codebase to use." : selected ? "This codebase will be used." : "Click the codebase to use it."}
          </span>
          <div className={`grid gap-3 sm:grid-cols-2 ${selected ? "" : need}`}>
            {codebases.map((cb) => {
              const on = cb.id === selected;
              return (
                <div key={cb.id} className={`group relative flex min-w-0 animate-pop-in border transition-colors ${on ? "border-accent bg-accent-100" : "border-divider bg-transparent"}`}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSelected(cb.id)}
                    className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-1.5 px-4 py-3.5 text-left"
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="truncate font-mono text-sm font-semibold">{cb.name}</span>
                      <span className={`flex size-5 flex-none items-center justify-center border text-[11px] text-bg transition-colors ${on ? "border-accent bg-accent" : "border-divider"}`}>{on ? "✓" : ""}</span>
                    </span>
                    <span className="text-xs text-neutral-700">
                      {cb.kind === "github"
                        ? "Public GitHub · downloaded when you build"
                        : `Folder · ${cb.files.length.toLocaleString()} source files, ${cb.skipped.toLocaleString()} skipped`}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${cb.name}`}
                    className="absolute top-0 right-0 hidden size-6 cursor-pointer items-center justify-center text-neutral-600 group-hover:flex hover:text-ink"
                    onClick={() => {
                      setCodebases((list) => list.filter((c) => c.id !== cb.id));
                      if (on) setSelected(null);
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="m-0 max-w-[640px] text-[13px] leading-relaxed text-neutral-700">
        Source files are parsed in memory and discarded; only an outline of names and signatures reaches a model. Dependencies, tests, build output, lockfiles and .env files are skipped. Limits: 50 MB archive, 200 KB per file, 2,000 files.
      </p>
    </>
  );
}
