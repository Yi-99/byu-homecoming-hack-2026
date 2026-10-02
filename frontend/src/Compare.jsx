import { useState } from "react";
import { labelOf, partsOf, toMarkdown } from "./lib.js";
import { Code, ErrorNote, Note, Paragraphs, Rich, Tags, quietButton } from "./ui.jsx";

const subhead = "mt-5 mb-1.5 font-sans text-[0.85rem] font-bold";
const notes = "rounded-md bg-highlight px-4 py-3.5 font-sans text-[0.925rem] leading-normal";
const COLUMNS = { 1: "max-w-[44rem]", 2: "lg:grid-cols-2", 3: "lg:grid-cols-2 xl:grid-cols-3" };
// every column spans the same 6 rows so Part 1 lines up with Part 1 across models
const column =
  "row-span-6 mb-6 grid min-w-0 grid-rows-subgrid rounded-[3px] border border-line bg-paper px-5 py-6 font-serif text-[1.05rem] leading-[1.65] shadow-[5px_6px_0_var(--color-line)]";

function Part({ part, index }) {
  return (
    <section className="mt-7 min-w-0 border-t-2 border-ink pt-6">
      <h4 className="mb-3 font-sans text-lg font-bold">Part {index + 1}</h4>
      <Paragraphs text={part.prompt} />
      <Code>{part.signature}</Code>

      <h5 className={`${subhead} text-muted`}>Examples</h5>
      {part.examples.map((e, i) => (
        <div key={i} className="mb-3 border-l-[3px] border-line px-4 py-3 text-[0.95rem] wrap-break-word">
          <div><b className="font-sans text-[0.85rem]">Input: </b><code className="font-mono text-[0.9em]">{e.input}</code></div>
          <div><b className="font-sans text-[0.85rem]">Output: </b><code className="font-mono text-[0.9em]">{e.output}</code></div>
          <div><b className="font-sans text-[0.85rem]">Why: </b><Rich text={e.explanation} /></div>
        </div>
      ))}

      <h5 className={`${subhead} text-muted`}>Constraints</h5>
      <ul className="list-disc pl-5">
        {part.constraints.map((c, i) => <li key={i}><Rich text={c} /></li>)}
      </ul>

      <details className={`mt-5 ${notes}`}>
        <summary className="cursor-pointer font-semibold">Interviewer notes</summary>
        <h5 className={subhead}>Target complexity</h5>
        <p><Rich text={part.target_complexity} /></p>
        <h5 className={subhead}>Intended approach</h5>
        <Paragraphs text={part.approach} />
        <h5 className={subhead}>Hints, gentle to direct</h5>
        <ol className="list-decimal pl-5">
          {part.hints.map((x, i) => <li key={i}><Rich text={x} /></li>)}
        </ol>
      </details>
    </section>
  );
}

function Column({ id, result, onRetry }) {
  const [copied, setCopied] = useState("");
  const { status, model, question, usage, seconds, error } = result;
  const byline = `${labelOf(id)} ${model}`;

  async function copy(withNotes) {
    try {
      await navigator.clipboard.writeText(toMarkdown(question, withNotes, byline));
      setCopied(withNotes ? "Copied with interviewer notes." : "Copied candidate version.");
    } catch {
      setCopied("Copy was blocked by the browser. Select the text and copy it manually.");
    }
  }

  return (
    <article className={column} aria-busy={status === "loading"} aria-label={`Question from ${byline}`}>
      <header className="font-sans">
        <p className="text-lg leading-tight font-bold">{labelOf(id)}</p>
        <p className="font-mono text-[0.8rem] wrap-break-word text-muted">{model}</p>
        {status === "done" && (
          <>
            <p className="mt-1 text-[0.8rem] text-muted">
              {seconds} seconds, {usage.input_tokens.toLocaleString()} tokens in, {usage.output_tokens.toLocaleString()} tokens out
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" className={quietButton} onClick={() => copy(false)}>Copy candidate version</button>
              <button type="button" className={quietButton} onClick={() => copy(true)}>Copy with interviewer notes</button>
            </div>
            <p className="mt-1.5 min-h-5 text-sm text-muted" role="status">{copied}</p>
          </>
        )}
      </header>

      {status === "loading" && (
        <p className="row-span-5 mt-6 font-sans text-[0.95rem] text-muted">Writing the question. This takes about a minute…</p>
      )}

      {status === "error" && (
        <div className="row-span-5 font-sans">
          <ErrorNote>{error}</ErrorNote>
          <button type="button" className={`${quietButton} mt-4`} onClick={() => onRetry(id)}>Try {labelOf(id)} again</button>
        </div>
      )}

      {status === "done" && (
        <>
          <div className="mt-5 min-w-0">
            <h3 className="mb-3 font-sans text-[1.5rem] leading-[1.15] font-extrabold tracking-tight text-balance">{question.title}</h3>
            <Tags items={question.tags} className="mb-4" />
            <Paragraphs text={question.story} />
          </div>
          {partsOf(question).map((part, i) => <Part key={i} part={part} index={i} />)}
          <details className={`mt-7 self-start ${notes}`}>
            <summary className="cursor-pointer font-semibold">What a strong candidate shows</summary>
            <ol className="mt-2 list-decimal pl-5">
              {question.rubric.map((x, i) => <li key={i}><Rich text={x} /></li>)}
            </ol>
          </details>
        </>
      )}
    </article>
  );
}

export default function Compare({ results, busy, onRegenerate, onRetry, ...rest }) {
  const ids = Object.keys(results);
  const many = ids.length > 1;

  return (
    <section className="mx-auto max-w-[100rem] scroll-mt-4 px-4 pb-16 md:px-6 md:pb-24" aria-labelledby="step4-title" {...rest}>
      <h2 id="step4-title" className="mb-5 flex items-baseline gap-3 text-xl font-bold tracking-tight">
        <span className="size-7 flex-none rounded-full bg-ink text-center text-sm leading-7 text-surface">4</span>
        {many ? "Compare the questions" : "Review the question"}
      </h2>
      <div className="mb-6 flex max-w-[44rem] flex-col items-start gap-4">
        <Note>Example outputs were worked out by each model, not run as code. Check them before you use a question in an interview.</Note>
        <button type="button" className={quietButton} onClick={onRegenerate} disabled={busy} aria-busy={busy}>
          {many ? "Write new versions with every model" : "Write another version"}
        </button>
      </div>
      <div className={`grid grid-cols-[minmax(0,1fr)] gap-x-5 ${COLUMNS[ids.length]}`}>
        {ids.map((id) => <Column key={id} id={id} result={results[id]} onRetry={onRetry} />)}
      </div>
    </section>
  );
}
