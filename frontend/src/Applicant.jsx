import { useEffect, useState } from "react";
import { LEVELS, partsOf } from "./lib.js";
import { Paragraphs, Rich, btn, kicker, primaryBtn } from "./ui.jsx";

const PLAN = [
  { time: "10 min", secs: 600, desc: "One focused problem using a single data structure." },
  { time: "20 min", secs: 1200, desc: "Combine structures and explain the trade-offs." },
  { time: "30 min", secs: 1800, desc: "Scale it up and handle edge cases." },
];
const fmt = (x) => `${Math.floor(x / 60)}:${String(x % 60).padStart(2, "0")}`;
const starter = (part) => `${part.signature.trim()}\n    # your code here\n    pass\n`;

function Orb() {
  return (
    <div className="relative size-10 flex-none">
      <div className="absolute inset-2.5 rounded-full bg-accent" />
    </div>
  );
}

export default function Applicant({ saved, onExit }) {
  const [entryId, setEntryId] = useState(saved[0]?.id ?? null);
  const [phase, setPhase] = useState("welcome");
  const [level, setLevel] = useState(0);
  const [secs, setSecs] = useState([0, 0, 0]);
  const [hints, setHints] = useState([0, 0, 0]);
  const [codes, setCodes] = useState(null);
  const [showTimer, setShowTimer] = useState(true);

  const entry = saved.find((s) => s.id === entryId) ?? saved[0];
  const q = entry?.question;
  const parts = q ? partsOf(q) : [];
  const part = parts[level];

  useEffect(() => {
    if (phase !== "interview") return;
    const iv = setInterval(() => setSecs((s) => s.map((x, i) => (i === level ? x + 1 : x))), 1000);
    return () => clearInterval(iv);
  }, [phase, level]);

  const set = (arr, i, v) => arr.map((x, j) => (j === i ? v : x));

  function start() {
    setCodes(parts.map(starter));
    setSecs([0, 0, 0]);
    setHints([0, 0, 0]);
    setLevel(0);
    setPhase("interview");
  }

  function next() {
    if (!q) return onExit();
    if (phase === "welcome") return start();
    if (phase === "interview") return setPhase(level === 2 ? "done" : "break");
    if (phase === "break") { setLevel(level + 1); return setPhase("interview"); }
    setPhase("welcome");
    setLevel(0);
  }

  const left = part ? Math.max(0, PLAN[level].secs - secs[level]) : 0;
  const nextLabel = !q ? "Back to start"
    : { welcome: "Start Part 1", interview: level === 2 ? "Submit and finish" : `Submit Part ${level + 1}`, break: `Continue to Part ${level + 2}`, done: "Back to start" }[phase];
  const footNote = !q ? "" : { welcome: "About 60 minutes in total", interview: "Your code stays in this browser", break: "Take as long as you need", done: "" }[phase];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {!q && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="text-xs tracking-[.08em] text-accent-700 uppercase">No interview yet</span>
          <h2 className="m-0 text-[38px]">There is no interview ready on this device.</h2>
          <p className="m-0 max-w-[480px] text-base text-neutral-700">A recruiter builds and approves an interview first. Once it is saved here, you can take it from this page.</p>
        </div>
      )}

      {q && phase === "welcome" && (
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto flex max-w-[880px] flex-col gap-9 px-6 py-14">
            <div className="flex flex-col gap-2.5">
              <span className="text-xs tracking-[.08em] text-accent-700 uppercase">What to expect</span>
              <h1 className="m-0 text-[46px] text-pretty">Technical interview · {q.title}</h1>
              <p className="m-0 max-w-[640px] text-[17px] leading-relaxed text-neutral-700">You'll write code in the browser across three parts that build on each other. Here is exactly what will happen.</p>
            </div>
            {saved.length > 1 && (
              <label className="flex max-w-[640px] flex-col gap-1.5">
                <span className="text-xs text-ink/70">Interview</span>
                <select className="min-h-9 border border-divider bg-surface px-2.5 py-1.5 text-sm" value={entry.id} onChange={(e) => setEntryId(Number(e.target.value))}>
                  {saved.map((s) => <option key={s.id} value={s.id}>{s.question.title}</option>)}
                </select>
              </label>
            )}
            <div className="grid gap-6 md:grid-cols-3">
              {PLAN.map((p, i) => (
                <div key={i} className="flex flex-col gap-2 border border-divider p-5">
                  <span className={kicker}>Part {i + 1} · {p.time}</span>
                  <span className="font-heading text-[22px] font-semibold">{LEVELS[i]}</span>
                  <span className="text-sm leading-normal text-neutral-700">{p.desc}</span>
                </div>
              ))}
            </div>
            <div className="grid max-w-[760px] gap-x-8 gap-y-3 md:grid-cols-2">
              <span className="text-[15px] leading-normal">You can pause between parts.</span>
              <span className="text-[15px] leading-normal">Thinking out loud is welcome, and so is silence.</span>
              <span className="text-[15px] leading-normal">Hints are available. Asking for one is not penalized.</span>
              <span className="text-[15px] leading-normal">The timer is a guide, not a cutoff.</span>
            </div>
          </div>
        </div>
      )}

      {q && phase === "interview" && (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="flex flex-none flex-col gap-4.5 overflow-auto border-divider p-7 md:w-[440px] md:border-r">
            <div className="flex gap-1.5">
              {parts.map((_, i) => (
                <div key={i} className={`h-[3px] flex-1 ${i < level ? "bg-accent" : i === level ? "bg-accent-300" : "bg-divider"}`} />
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={kicker}>Part {level + 1} of 3 · {LEVELS[level]}</span>
              <button type="button" className="flex-none cursor-pointer px-1 py-1 font-heading text-sm font-semibold whitespace-nowrap text-accent-700 tabular-nums hover:bg-accent/10" onClick={() => setShowTimer(!showTimer)}>
                {showTimer ? `${fmt(left)} left` : "Show timer"}
              </button>
            </div>
            <div className="text-sm leading-relaxed text-neutral-700"><Paragraphs text={q.story} className="m-0 mb-2 last:mb-0" /></div>
            <div className="text-base leading-normal"><Paragraphs text={part.prompt} className="m-0 mb-2.5 last:mb-0" /></div>
            <div className="flex flex-col gap-2">
              {part.examples.map((e, i) => (
                <span key={i} className="font-mono text-[13px] leading-normal break-words">{e.input} → {e.output}</span>
              ))}
              {part.constraints.map((c, i) => (
                <span key={`c${i}`} className="text-[13px] leading-normal text-neutral-700"><Rich text={c} /></span>
              ))}
            </div>
            <div className="flex flex-col gap-2.5 border-t border-divider pt-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className={`${btn} h-10 whitespace-nowrap`}
                  disabled={hints[level] >= part.hints.length}
                  onClick={() => setHints(set(hints, level, hints[level] + 1))}
                >
                  Ask for a hint
                </button>
                <span className="text-[13px] text-neutral-700">
                  {part.hints.length ? `${part.hints.length - hints[level]} of ${part.hints.length} left` : "No hints for this part"}
                </span>
              </div>
              {part.hints.slice(0, hints[level]).map((h, i) => (
                <div key={i} className="animate-fade-in border border-divider p-3.5 text-sm leading-normal"><Rich text={h} /></div>
              ))}
            </div>
          </div>
          <div className="flex min-h-[320px] min-w-0 flex-1 flex-col">
            <div className="border-b border-divider px-5 py-2.5 font-mono text-[13px] text-neutral-700">part{level + 1}.py</div>
            <textarea
              aria-label={`Your code for part ${level + 1}`}
              spellCheck={false}
              className="min-h-0 flex-1 resize-none border-0 bg-surface p-5 font-mono text-sm leading-[1.7] text-ink outline-none"
              value={codes[level]}
              onChange={(e) => setCodes(set(codes, level, e.target.value))}
            />
            <div className="flex flex-none items-center gap-4 border-t border-divider px-5 py-3.5">
              <Orb />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-xs text-neutral-700">Interviewer</span>
                <span className="text-[15px] leading-snug">
                  {level === 0 ? "Take a moment to read the task. Start with the simplest idea that works." : level === 1 ? "This builds on your last part. What would you reach for first?" : "This one is open-ended. There is no single right answer, so weigh the trade-offs."}
                </span>
              </div>
              <button type="button" className={`${btn} h-[46px] min-w-[130px] whitespace-nowrap`} disabled title="The voice interviewer is not connected yet">Talk</button>
            </div>
          </div>
        </div>
      )}

      {q && phase === "break" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="text-xs tracking-[.08em] text-accent-700 uppercase">Part {level + 1} submitted</span>
          <h2 className="m-0 text-[38px]">Take a breath before Part {level + 2}.</h2>
          <p className="m-0 max-w-[480px] text-base text-neutral-700">The next part builds on the same code. The timer starts only when you continue.</p>
        </div>
      )}

      {q && phase === "done" && (
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto flex max-w-[960px] flex-col gap-8 px-6 py-14">
            <div className="flex flex-col gap-2.5">
              <span className="text-xs tracking-[.08em] text-accent-700 uppercase">Interview complete</span>
              <h1 className="m-0 text-[44px]">Thank you. That's all three parts.</h1>
              <p className="m-0 max-w-[620px] text-base leading-relaxed text-neutral-700">Here is a summary of each part.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {parts.map((p, i) => (
                <div key={i} className="flex flex-col gap-3 border border-divider p-5">
                  <span className={kicker}>Part {i + 1} · {LEVELS[i]}</span>
                  <div className="flex flex-col gap-0.5"><span className="text-[13px] font-medium text-accent-700">Time spent</span><span className="text-sm">{fmt(secs[i])} of {PLAN[i].time}</span></div>
                  <div className="flex flex-col gap-0.5"><span className="text-[13px] font-medium text-accent-700">Hints used</span><span className="text-sm">{hints[i]} of {p.hints.length}</span></div>
                  <div className="flex flex-col gap-0.5"><span className="text-[13px] font-medium text-accent-700">Code written</span><span className="text-sm">{codes[i] === starter(p) ? "Left as the starter code" : `${codes[i].split("\n").filter((l) => l.trim()).length} lines`}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-none items-center gap-3 border-t border-divider px-6 py-3.5">
        <span className="mr-auto text-[13px] text-neutral-700">{footNote}</span>
        <button type="button" className={`${primaryBtn} h-[46px] min-w-[200px] text-base whitespace-nowrap`} onClick={next}>{nextLabel}</button>
      </div>
    </div>
  );
}
