import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { LEVELS, asJson, download, partsOf, post, toMarkdown } from "./lib.js";
import { Code, IconButton, Paragraphs, Rich, Tags, kicker } from "./ui.jsx";

const subhead = "mt-3 mb-1 text-[11px] tracking-[.1em] uppercase text-neutral-700";

export function Notes({ part, open }) {
  return (
    <details open={open} className={`border-l-2 border-accent bg-accent-100 px-3.5 py-2.5 text-[13px] leading-normal ${open ? "" : "print:hidden"}`}>
      <summary className="cursor-pointer font-medium">Interviewer notes</summary>
      <h5 className={subhead}>Target complexity</h5>
      <p className="m-0"><Rich text={part.target_complexity} /></p>
      <h5 className={subhead}>Intended approach</h5>
      <Paragraphs text={part.approach} className="m-0 mb-2 last:mb-0" />
      <h5 className={subhead}>Hints, gentle to direct</h5>
      <ol className="m-0 list-decimal pl-5">
        {part.hints.map((x, i) => <li key={i}><Rich text={x} /></li>)}
      </ol>
    </details>
  );
}

export function PartBody({ part, withNotes }) {
  return (
    <>
      <div className="text-sm leading-normal"><Paragraphs text={part.prompt} className="m-0 mb-2 last:mb-0" /></div>
      <div className="mt-1 flex flex-col border border-divider">
        <div className="border-b border-divider px-2.5 py-1.5"><span className={kicker}>Signature</span></div>
        <Code className="max-h-[180px]">{part.signature}</Code>
      </div>
      <div className="flex flex-col gap-2">
        {part.examples.map((e, i) => (
          <div key={i} className="font-mono text-xs leading-normal break-words text-neutral-700">
            <div><span className="text-ink">Input:</span> {e.input}</div>
            <div><span className="text-ink">Output:</span> {e.output}</div>
            <div className="font-sans text-[13px]"><Rich text={e.explanation} /></div>
          </div>
        ))}
      </div>
      <ul className="m-0 list-disc pl-5 text-[13px] leading-normal">
        {part.constraints.map((c, i) => <li key={i}><Rich text={c} /></li>)}
      </ul>
      <Notes part={part} open={withNotes} />
    </>
  );
}

export function Rubric({ question, open }) {
  return (
    <details open={open} className={`border-l-2 border-accent bg-accent-100 px-3.5 py-2.5 text-[13px] leading-normal ${open ? "" : "print:hidden"}`}>
      <summary className="cursor-pointer font-medium">What a strong candidate shows</summary>
      <ol className="m-0 mt-2 list-decimal pl-5">
        {question.rubric.map((x, i) => <li key={i}><Rich text={x} /></li>)}
      </ol>
    </details>
  );
}

export function Scenario({ text }) {
  return (
    <div className="border-l-2 border-accent bg-surface px-3.5 py-3 text-sm leading-relaxed">
      <span className={`${kicker} mb-1 block`}>Scenario</span>
      <Paragraphs text={text} className="m-0 mb-2 last:mb-0" />
    </div>
  );
}

// the full question as one document: used for printing
function QuestionDoc({ question, byline, withNotes }) {
  return (
    <article className="mx-auto max-w-[44rem] p-0 text-[15px] leading-relaxed">
      <h1 className="mb-2 text-4xl">{question.title}</h1>
      <p className="mb-3 font-mono text-xs text-neutral-700">{byline}</p>
      {withNotes && <Tags items={question.tags} className="mb-4" />}
      <Paragraphs text={question.story} />
      {partsOf(question).map((part, i) => (
        <section key={i} className="mt-6 flex flex-col gap-3 border-t border-ink pt-4">
          <span className={kicker}>Part {i + 1} · {LEVELS[i]}</span>
          <PartBody part={part} withNotes={withNotes} />
        </section>
      ))}
      {withNotes && <div className="mt-6"><Rubric question={question} open /></div>}
      <p className="mt-6 text-xs text-neutral-700">Written by {byline}. Example outputs were model-traced, not executed. Verify before use.</p>
    </article>
  );
}

let startPrint = null;

// mounted once outside the app; it is the only thing visible while printing
export function PrintSlot() {
  const [job, setJob] = useState(null);
  useEffect(() => {
    startPrint = setJob;
    const done = () => setJob(null);
    addEventListener("afterprint", done);
    return () => { startPrint = null; removeEventListener("afterprint", done); };
  }, []);
  return job && <div className="hidden print:block"><QuestionDoc {...job} /></div>;
}

// the print dialog snapshots the page, so the slot must render first
export function printQuestion(job) {
  flushSync(() => startPrint?.(job));
  window.print();
}

// Copy / Markdown / PDF / Notion for one question; reports into a status line
export function useExport({ question, byline, withNotes, notion, onConnectNotion }) {
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const version = withNotes ? "with interviewer notes" : "candidate version";
  const markdown = () => toMarkdown(question, withNotes, byline);

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown());
      setNote(`Copied, ${version}.`);
    } catch {
      setNote("Copy was blocked by the browser. Select the text and copy it manually.");
    }
  }

  async function sendToNotion() {
    if (!notion) return onConnectNotion();
    setSending(true);
    try {
      const { url } = await post("/api/notion/pages", asJson({ token: notion.token, markdown: markdown() }));
      setNote(<>Sent to Notion, {version}. <a className="font-medium text-accent-700 underline" href={url} target="_blank" rel="noreferrer">Open the page</a></>);
    } catch (e) {
      setNote(e.message);
    } finally {
      setSending(false);
    }
  }

  const buttons = (
    <>
      <IconButton icon="copy" label="Copy" onClick={copy} />
      <IconButton icon="download" label="Download Markdown" onClick={() => download(question.title, markdown())} />
      <IconButton icon="printer" label="Save as PDF" onClick={() => printQuestion({ question, byline, withNotes })} />
      <IconButton
        icon="send"
        label={!notion ? "Connect Notion" : sending ? "Sending…" : "Send to Notion"}
        onClick={sendToNotion}
        disabled={sending}
        aria-busy={sending}
      />
    </>
  );
  return { buttons, note, setNote };
}
