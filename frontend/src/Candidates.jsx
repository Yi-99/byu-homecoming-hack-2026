import { MAX_FILES, MAX_SNIPPETS, labelOf } from "./lib.js";
import { Check, IconButton, Note, StepHead, Tag, Tags, kicker, needClass } from "./ui.jsx";

const n = (x) => x.toLocaleString();

function Stat({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 px-5 py-4">
      <span className="text-xs text-neutral-700">{label}</span>
      <span className="font-heading text-[26px] font-semibold">{value}</span>
    </div>
  );
}

export default function Candidates({ analysis, checked, setChecked, nudge, onViewCode }) {
  const { stats, candidates, note, ranked_by: ranker } = analysis;
  const toggle = (id) => setChecked((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const count = checked.length;
  const need = needClass(nudge);

  return (
    <>
      <StepHead n={4} total={5} title="Review the functions">
        {labelOf(ranker.provider)} ({ranker.model}) saw an outline of {n(stats.considered)} functions and picked these. Only the function bodies you keep are sent to the models, with secrets redacted.
      </StepHead>

      <div className="grid max-w-[760px] grid-cols-3 border border-divider">
        <Stat label="Files parsed" value={n(stats.files)} />
        <Stat label="Functions found" value={n(stats.functions)} />
        <Stat label="Outline tokens sent" value={n(stats.tokens_sent)} />
      </div>
      {stats.truncated && <p className="m-0 text-[13px] text-neutral-700">Only the first {n(MAX_FILES)} source files were read.</p>}
      {(note || !candidates.length) && (
        <Note className="m-0 max-w-[760px]">{candidates.length ? note : `No functions matched these topics. ${note}`}</Note>
      )}

      {candidates.length > 0 && (
        <div className="flex max-w-[960px] min-w-0 flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className={kicker}>Functions used</span>
            <span className={`text-xs ${count > MAX_SNIPPETS ? "font-medium text-bad" : "text-neutral-700"}`}>
              {count} of {candidates.length} selected · keep 1 to {MAX_SNIPPETS}
            </span>
          </div>
          <div className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            {candidates.map((c) => {
              const on = checked.includes(c.id);
              return (
                <div
                  key={c.id}
                  className={`flex min-w-0 flex-col gap-1.5 border p-4 transition-opacity ${on ? "border-solid border-divider" : "border-dashed border-divider opacity-55"} ${count ? "" : need}`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Check on={on} onClick={() => toggle(c.id)} label={`Use ${c.name}`} />
                    <span className={`truncate font-mono text-sm font-semibold ${on ? "" : "line-through"}`}>{c.name}</span>
                  </div>
                  <span className="truncate font-mono text-xs text-neutral-700">{c.path} · {c.loc} lines</span>
                  <span className="text-[13px] leading-snug">{c.why}</span>
                  <Tags items={c.topics_matched} className="pt-1" />
                  <div className="icon-row flex items-center gap-2 pt-1">
                    <IconButton icon="code" label="See exactly what will be sent" onClick={() => onViewCode(c)} />
                    {!on && <Tag tone="neutral">Not used</Tag>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
