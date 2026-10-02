import { useState } from "react";
import { LEVELS, labelOf, partsOf } from "./lib.js";
import { PartBody, Rubric, useExport } from "./Question.jsx";
import { IconButton, Paragraphs, Tags, btn, kicker, primaryBtn } from "./ui.jsx";

const dashed = "w-full min-w-0 border border-dashed border-accent-300 bg-transparent px-1.5 py-0.5 -mx-[7px] text-ink outline-none resize-y";

const metaOf = (s) => [labelOf(s.provider), s.model, s.repo, s.date && new Date(s.date).toLocaleDateString()].filter(Boolean).join(" · ");

export function SidebarCard({ s, active, onOpen, onEdit, onRemove }) {
  return (
    <li className={`flex animate-row-in flex-col gap-2 border p-3 transition-colors ${active ? "border-accent bg-accent-100" : "border-transparent hover:bg-ink/4"}`}>
      <button type="button" className="flex cursor-pointer flex-col gap-1 text-left" aria-pressed={active} onClick={onOpen}>
        <span className="font-heading text-base leading-tight font-semibold">{s.question.title}</span>
        <span className="font-mono text-[11px] text-neutral-700">{labelOf(s.provider)} · {s.model}</span>
        {(s.repo || s.date) && (
          <span className="text-xs text-neutral-700">{[s.repo, s.date && new Date(s.date).toLocaleDateString()].filter(Boolean).join(" · ")}</span>
        )}
      </button>
      {s.question.tags?.length > 0 && <Tags items={s.question.tags.slice(0, 4)} />}
      <div className="icon-row flex gap-1">
        <IconButton icon="pencil" label="Edit" onClick={onEdit} />
        <IconButton icon="trash" label={`Delete`} onClick={onRemove} />
      </div>
    </li>
  );
}

export function ListPage({ saved, activeId, onOpen, onEdit, onRemove }) {
  return (
    <div className="absolute inset-0 z-[2] animate-fade-in overflow-auto bg-bg">
      <div className="flex flex-col gap-6 px-6 pt-9 pb-12 md:px-14">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-accent-700">Question list</span>
          <h2 className="m-0 text-[34px]">Saved interview questions</h2>
          <span className="text-sm text-neutral-700">{saved.length} saved. Open one to read, edit or export it.</span>
        </div>
        {saved.length === 0 ? (
          <p className="m-0 border border-dashed border-divider px-6 py-12 text-center text-sm text-neutral-700">Nothing saved yet. Use Save on any version in step 5.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
            {saved.map((s) => (
              <div
                key={s.id}
                onClick={() => onOpen(s.id)}
                className={`flex min-h-[170px] animate-pop-in cursor-pointer flex-col gap-2.5 border p-[18px] ${activeId === s.id ? "border-accent bg-accent-100" : "border-divider hover:bg-ink/4"}`}
              >
                <div className="flex items-baseline justify-between gap-2.5">
                  <span className="font-heading text-xl leading-tight font-semibold">{s.question.title}</span>
                  {s.date && <span className="text-xs whitespace-nowrap text-neutral-700">{new Date(s.date).toLocaleDateString()}</span>}
                </div>
                <span className="font-mono text-xs text-neutral-700">{[labelOf(s.provider), s.model, s.repo].filter(Boolean).join(" · ")}</span>
                {s.question.tags?.length > 0 && <Tags items={s.question.tags} />}
                <div className="icon-row mt-auto flex gap-1.5 border-t border-divider pt-2" onClick={(e) => e.stopPropagation()}>
                  <IconButton icon="pencil" label="Edit" onClick={() => onEdit(s.id)} />
                  <IconButton icon="trash" label="Delete" className="ml-auto" onClick={() => onRemove(s.id)} end />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function editable(q) {
  return { title: q.title, story: q.story, prompts: partsOf(q).map((p) => p.prompt) };
}

export function QuickView({ entry, index, total, startEditing, notion, onConnectNotion, onPrev, onNext, onClose, onUpdate }) {
  const [draft, setDraft] = useState(startEditing ? editable(entry.question) : null);
  const [tab, setTab] = useState(0);
  const [withNotes, setWithNotes] = useState(false);
  const q = entry.question;
  const byline = `${labelOf(entry.provider)} ${entry.model}`;
  const exp = useExport({ question: q, byline, withNotes, notion, onConnectNotion });
  const snippets = entry.snippets || [];
  const editing = draft !== null;

  function save() {
    const parts = ["part1", "part2", "part3"];
    const question = {
      ...q,
      title: draft.title.trim() || q.title,
      story: draft.story,
      ...Object.fromEntries(parts.map((k, i) => [k, { ...q[k], prompt: draft.prompts[i] }])),
    };
    onUpdate({ ...entry, question, edited: true });
    setDraft(null);
    exp.setNote("Changes saved.");
  }

  const setPrompt = (i, v) => setDraft((d) => ({ ...d, prompts: d.prompts.map((p, j) => (j === i ? v : p)) }));

  return (
    <div className="absolute inset-0 z-[3] flex animate-fade-in flex-col bg-bg">
      <div className="flex flex-wrap items-center gap-3 border-b border-divider px-6 pt-6 pb-4 md:px-10">
        <div className="mr-auto flex min-w-0 flex-[1_1_320px] flex-col gap-0.5">
          <span className="text-xs text-accent-700">{editing ? "Editing saved question" : `Saved question · ${index + 1} of ${total}`}</span>
          {editing ? (
            <input aria-label="Question title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={`${dashed} font-heading text-[32px] leading-tight font-semibold`} />
          ) : (
            <span className="font-heading text-[32px] leading-tight font-semibold">{q.title}</span>
          )}
          <span className="font-mono text-xs text-neutral-700">{metaOf(entry)}{entry.edited ? " · edited" : ""}</span>
        </div>
        {editing ? (
          <>
            <button type="button" className={`${btn} h-[38px] min-w-[90px]`} onClick={() => setDraft(null)}>Cancel</button>
            <button type="button" className={`${primaryBtn} h-[38px] min-w-[130px]`} onClick={save}>Save changes</button>
          </>
        ) : (
          <div className="icon-row flex items-center gap-1">
            <IconButton icon="left" label="Previous question" onClick={onPrev} disabled={total < 2} />
            <IconButton icon="right" label="Next question" onClick={onNext} disabled={total < 2} />
            <IconButton icon="pencil" label="Edit" onClick={() => setDraft(editable(q))} />
            {exp.buttons}
          </div>
        )}
        <IconButton icon="back" label="Back to list" onClick={onClose} end />
      </div>
      {!editing && (
        <div className="flex items-center gap-4 border-b border-divider px-6 py-2 md:px-10">
          <label className="flex cursor-pointer items-center gap-2 text-[13px]">
            <input type="checkbox" className="size-4 accent-accent" checked={withNotes} onChange={(e) => setWithNotes(e.target.checked)} />
            Include interviewer notes
          </label>
          <span className="truncate text-[13px] text-neutral-700" role="status">{exp.note}</span>
        </div>
      )}
      <div className={`grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] ${snippets.length ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]" : ""}`}>
        <div className={`flex flex-col gap-4 overflow-auto px-6 py-6 md:px-10 ${snippets.length ? "border-r border-divider" : "max-w-[60rem]"}`}>
          {editing ? (
            <textarea aria-label="Scenario" value={draft.story} onChange={(e) => setDraft({ ...draft, story: e.target.value })} className={`${dashed} min-h-24 text-sm leading-relaxed text-neutral-700`} />
          ) : (
            <div className="text-sm leading-relaxed text-neutral-700"><Paragraphs text={q.story} /></div>
          )}
          {partsOf(q).map((part, i) => (
            <div key={i} className="flex flex-col gap-2 border-t border-divider pt-3">
              <span className={kicker}>Part {i + 1} · {LEVELS[i]}</span>
              {editing ? (
                <textarea aria-label={`Part ${i + 1} prompt`} value={draft.prompts[i]} onChange={(e) => setPrompt(i, e.target.value)} className={`${dashed} min-h-24 text-[13px] leading-normal`} />
              ) : (
                <PartBody part={part} withNotes={withNotes} />
              )}
            </div>
          ))}
          {editing ? (
            <span className="text-xs text-neutral-700">Dashed areas are editable.</span>
          ) : (
            <Rubric question={q} open={withNotes} />
          )}
        </div>
        {snippets.length > 0 && (
          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="flex flex-none overflow-x-auto border-b border-divider" role="tablist">
              {snippets.map((sn, i) => (
                <button
                  key={sn.path + sn.name}
                  type="button"
                  role="tab"
                  aria-selected={tab === i}
                  onClick={() => setTab(i)}
                  className={`cursor-pointer border-b-2 px-4 py-2.5 font-mono text-xs whitespace-nowrap ${tab === i ? "border-accent text-ink" : "border-transparent text-neutral-700"}`}
                >
                  {sn.name}
                </button>
              ))}
            </div>
            <pre tabIndex={0} className="m-0 min-h-0 flex-1 overflow-auto bg-surface px-7 py-5 font-mono text-sm leading-[1.75] whitespace-pre-wrap">{snippets[tab]?.code}</pre>
            <span className="border-t border-divider px-5 py-2 font-mono text-xs text-neutral-700">{snippets[tab]?.path} · sent to the model with secrets redacted</span>
          </div>
        )}
      </div>
    </div>
  );
}

function LedgerRow({ label, idle, sent, children }) {
  return (
    <div>
      <dt className="font-medium">{label}</dt>
      <dd className={`m-0 mt-0.5 ${sent ? "font-medium text-ok" : "text-neutral-700"}`}>{sent || idle}</dd>
      {children && <dd className="m-0 mt-2">{children}</dd>}
    </div>
  );
}

export function Ledger({ stats, ranker, count, sentTo, connected, notion, onConnectNotion, onDisconnectNotion }) {
  return (
    <details className="flex-none border-t border-divider px-5 py-4 text-[13px]">
      <summary className="cursor-pointer font-heading text-base font-semibold">What reaches the models</summary>
      <dl className="mt-3 grid gap-3" aria-live="polite">
        <LedgerRow label="Source files" idle="Never. Parsed in memory, then discarded." />
        <LedgerRow
          label="Function outline"
          idle="Nothing yet. Names and signatures only, to one model."
          sent={stats && `${stats.considered.toLocaleString()} signatures, ${stats.tokens_sent.toLocaleString()} tokens, to ${labelOf(ranker.provider)}`}
        />
        <LedgerRow
          label="Function bodies"
          idle="Nothing yet. Only the ones you approve, with secrets redacted."
          sent={count > 0 && sentTo.length > 0 && `${count} function${count > 1 ? "s" : ""} you approved, secrets redacted, to ${sentTo.map(labelOf).join(", ")}`}
        />
        <LedgerRow
          label="Your API keys"
          idle="None connected."
          sent={connected.length > 0 && `${connected.map((c) => labelOf(c.provider)).join(", ")}. Kept in this tab, forwarded only to that provider.`}
        />
        <LedgerRow
          label="Notion"
          idle="Not connected. Optional, and outside the guard rails above."
          sent={notion && `Connected to ${notion.workspace}.`}
        >
          <button type="button" className={btn} onClick={notion ? onDisconnectNotion : onConnectNotion}>
            {notion ? "Disconnect Notion" : "Connect Notion"}
          </button>
        </LedgerRow>
      </dl>
    </details>
  );
}
