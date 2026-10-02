import { useState } from "react";
import { MAX_FILES, MAX_SNIPPETS, labelOf } from "./lib.js";
import { Code, ErrorNote, Note, Step, Tags, primaryButton } from "./ui.jsx";

const n = (x) => x.toLocaleString();

export default function Candidates({ analysis, busy, models, onGenerate, ...rest }) {
  const { stats, candidates, note, ranked_by: ranker } = analysis;
  const [checked, setChecked] = useState(candidates.slice(0, 1).map((c) => c.id));
  const [localError, setLocalError] = useState("");

  function toggle(id) {
    setChecked((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function submit(event) {
    event.preventDefault();
    setLocalError("");
    if (!models) return setLocalError("Connect at least one model with your API key in step 1.");
    if (!checked.length) return setLocalError("Select at least one function.");
    if (checked.length > MAX_SNIPPETS) return setLocalError(`Select up to ${MAX_SNIPPETS} functions.`);
    onGenerate(
      candidates
        .filter((c) => checked.includes(c.id))
        .map((c) => ({ path: c.path, name: c.name, code: c.code_scrubbed })),
    );
  }

  return (
    <Step n={3} title="Approve what the models can read" {...rest}>
      <p className="text-sm text-muted">
        Parsed {n(stats.files)} files and found {n(stats.functions)} functions. {labelOf(ranker.provider)} ({ranker.model}) saw an outline of {n(stats.considered)} of them and picked these.
        {stats.truncated && ` Only the first ${n(MAX_FILES)} source files were read.`}
      </p>
      {(note || !candidates.length) && (
        <Note className="mt-4">{candidates.length ? note : `No functions matched these topics. ${note}`}</Note>
      )}

      <form onSubmit={submit}>
        <ul className="mt-5 grid gap-3">
          {candidates.map((c) => (
            <li key={c.id} className="rounded-[10px] border border-line px-4 py-4 has-[:checked]:border-marker has-[:checked]:shadow-[inset_3px_0_0_var(--color-marker)]">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" className="mt-1 size-4.5 flex-none accent-marker" checked={checked.includes(c.id)} onChange={() => toggle(c.id)} />
                <span className="min-w-0">
                  <span className="block font-mono text-[0.95rem] font-semibold wrap-break-word">{c.name}</span>
                  <span className="block text-[0.8rem] wrap-break-word text-muted">{c.path}, {c.loc} lines</span>
                </span>
              </label>
              <p className="mt-2 text-[0.925rem]">{c.why}</p>
              <Tags items={c.topics_matched} className="mt-2" />
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-marker">See exactly what will be sent</summary>
                <Code className="mt-2.5">{c.code_scrubbed}</Code>
              </details>
            </li>
          ))}
        </ul>

        <ErrorNote>{localError}</ErrorNote>
        {candidates.length > 0 && (
          <button type="submit" className={primaryButton} disabled={busy} aria-busy={busy}>
            {busy ? "Writing…" : models > 1 ? `Write the question with ${models} models` : "Write the question"}
          </button>
        )}
      </form>
    </Step>
  );
}
