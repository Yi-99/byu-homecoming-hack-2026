import { useState } from "react";
import { MAX_TOPICS, TOPIC_GROUPS, labelOf } from "./lib.js";
import { ErrorNote, StepHead, btn, input, needClass } from "./ui.jsx";

function Chip({ label, on, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`cursor-pointer border px-3.5 py-2 text-sm transition-colors ${on ? "border-accent bg-accent text-bg" : "border-divider bg-transparent text-ink hover:bg-ink/7"}`}
    >
      {label}
    </button>
  );
}

export default function Topics({ picked, setPicked, custom, setCustom, ranker, error, nudge }) {
  const [draft, setDraft] = useState("");
  const toggle = (t) => setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  const groups = custom.length ? [...TOPIC_GROUPS, ["Your own", custom]] : TOPIC_GROUPS;

  function addCustom(event) {
    event.preventDefault();
    const topic = draft.trim().toLowerCase();
    if (!topic) return;
    if (!TOPIC_GROUPS.some(([, l]) => l.includes(topic)) && !custom.includes(topic)) setCustom((c) => [...c, topic]);
    if (!picked.includes(topic)) setPicked((p) => [...p, topic]);
    setDraft("");
  }

  const need = needClass(nudge);
  const over = picked.length > MAX_TOPICS;

  return (
    <>
      <StepHead n={3} total={5} title="What to test">
        Pick the data structures and algorithms. The AI finds functions in your codebase that fit them.
      </StepHead>
      {groups.map(([name, list]) => (
        <div key={name} className="flex flex-col gap-2.5">
          <span className="text-[13px] text-neutral-700">{name}</span>
          <div className={`flex max-w-[960px] flex-wrap gap-2 ${picked.length ? "" : need}`}>
            {list.map((t) => <Chip key={t} label={t} on={picked.includes(t)} onClick={() => toggle(t)} />)}
          </div>
        </div>
      ))}
      <form onSubmit={addCustom} className="flex max-w-md gap-2">
        <label htmlFor="custom-topic" className="sr-only">Add another topic</label>
        <input
          id="custom-topic"
          className={input}
          type="text"
          maxLength={40}
          placeholder="Add another, e.g. monotonic stack"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className={`${btn} h-9`}>Add</button>
      </form>
      <span className={`text-[13px] ${over ? "font-medium text-bad" : "text-neutral-700"}`}>
        {picked.length} topic{picked.length === 1 ? "" : "s"} selected{over ? `. Pick up to ${MAX_TOPICS}.` : ""}
      </span>
      <ErrorNote>{error}</ErrorNote>
      <p className="m-0 max-w-[640px] text-[13px] leading-relaxed text-neutral-700">
        {ranker
          ? `${labelOf(ranker.provider)} (${ranker.model}) will pick the functions from an outline of names and signatures.`
          : "Connect a model in step 1 first."}
      </p>
    </>
  );
}
