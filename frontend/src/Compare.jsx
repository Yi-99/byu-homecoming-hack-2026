import { LEVELS, labelOf, partsOf } from "./lib.js";
import { PartBody, Rubric, Scenario, useExport } from "./Question.jsx";
import { ErrorNote, IconButton, StepHead, Tag, Tags, btn, kicker, needClass } from "./ui.jsx";

// columns share one grid so Part 1 lines up with Part 1 across models
const ROWS = 6;
const cell = (i, row, on) =>
  `flex min-w-0 flex-col gap-2 p-[18px] transition-colors ${i ? "border-l border-divider" : ""} ${row ? "border-t border-divider" : ""} ${on ? "bg-accent-100" : ""}`;

function Header({ id, i, result, on, saveState, notion, withNotes, nudge, onChoose, onRetry, onSave, onConnectNotion }) {
  const { status, model, question, usage, seconds } = result;
  const byline = `${labelOf(id)} ${model}`;
  const exp = useExport({ question, byline, withNotes, notion, onConnectNotion });
  const done = status === "done";
  const saveLabel = saveState === "same" ? "Saved" : saveState === "changed" ? "Overwrite saved" : "Save";

  return (
    <div
      className={`${cell(i, 0, on)} ${done ? "cursor-pointer" : ""} ${done && nudge ? needClass(nudge) : ""}`}
      onClick={() => done && onChoose(id)}
      aria-label={`Question from ${byline}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-heading text-[19px] font-semibold">{labelOf(id)}</span>
          <span className="font-mono text-xs break-words text-neutral-700">
            {model}
            {done && ` · ${seconds}s · ${(usage.input_tokens + usage.output_tokens).toLocaleString()} tokens`}
          </span>
        </div>
        {on && <Tag className="mt-1">Selected</Tag>}
      </div>
      <div className="icon-row flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <IconButton icon="refresh" label={status === "error" ? `Try ${labelOf(id)} again` : "Regenerate"} onClick={() => onRetry(id)} disabled={status === "loading"} />
        {done && exp.buttons}
        {done && (
          <IconButton icon="bookmark" label={saveLabel} filled={saveState === "same"} disabled={saveState === "same"} onClick={() => onSave(id)} end />
        )}
      </div>
      <p className="m-0 text-[13px] text-neutral-700" role="status">{done && exp.note}</p>
    </div>
  );
}

export default function Compare({ results, chosen, onChoose, withNotes, setWithNotes, notion, busy, nudge, saveState, onRegenerate, onRetry, onSave, onConnectNotion }) {
  const ids = Object.keys(results);

  const rows = (id, i) => {
    const r = results[id];
    const on = chosen === id;
    if (r.status === "loading") {
      return [
        <div key="l" className={`${cell(i, 1, on)} row-span-5`}>
          <p className="m-0 text-sm text-neutral-700">Writing the question. This takes about a minute…</p>
        </div>,
      ];
    }
    if (r.status === "error") {
      return [
        <div key="e" className={`${cell(i, 1, on)} row-span-5`}>
          <ErrorNote>{r.error}</ErrorNote>
          <button type="button" className={`${btn} self-start`} onClick={() => onRetry(id)}>Try {labelOf(id)} again</button>
        </div>,
      ];
    }
    const q = r.question;
    return [
      <div key="t" className={cell(i, 1, on)}>
        <h3 className="m-0 text-[22px] leading-tight text-balance">{q.title}</h3>
        <Tags items={q.tags} />
        <Scenario text={q.story} />
      </div>,
      ...partsOf(q).map((part, n) => (
        <div key={n} className={cell(i, 2 + n, on)}>
          <span className={kicker}>Part {n + 1} · {LEVELS[n]}</span>
          <PartBody part={part} withNotes={withNotes} />
        </div>
      )),
      <div key="r" className={cell(i, 5, on)}>
        <Rubric question={q} open={withNotes} />
      </div>,
    ];
  };

  return (
    <>
      <div className="flex flex-wrap items-end gap-5">
        <div className="flex-[1_1_420px]">
          <StepHead n={5} total={5} title="Choose the question">
            Each connected model wrote a three-part question from the functions you kept. Click a version to select it, regenerate any you don't like, then approve.
          </StepHead>
        </div>
        <div className="icon-row flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-accent" checked={withNotes} onChange={(e) => setWithNotes(e.target.checked)} />
            Include interviewer notes
          </label>
          <IconButton icon="refresh" size={18} label="Regenerate all" onClick={onRegenerate} disabled={busy} end />
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="overflow-x-auto">
          <div
            className="grid border border-divider"
            style={{
              gridTemplateColumns: `repeat(${ids.length}, minmax(0,1fr))`,
              gridTemplateRows: `repeat(${ROWS}, auto)`,
              gridAutoFlow: "column",
              minWidth: ids.length > 1 ? ids.length * 320 : undefined,
            }}
          >
            {ids.map((id, i) => [
              <Header
                key={`h-${id}`}
                id={id}
                i={i}
                result={results[id]}
                on={chosen === id}
                saveState={saveState(id)}
                notion={notion}
                withNotes={withNotes}
                nudge={chosen ? 0 : nudge}
                onChoose={onChoose}
                onRetry={onRetry}
                onSave={onSave}
                onConnectNotion={onConnectNotion}
              />,
              ...rows(id, i),
            ])}
          </div>
        </div>
        <span className="text-[13px] text-neutral-700">Example outputs are worked out by each model, not executed. Check them before you use a question in an interview.</span>
      </div>
    </>
  );
}
