import { useEffect, useRef, useState } from "react";
import Candidates from "./Candidates.jsx";
import Compare from "./Compare.jsx";
import Providers from "./Providers.jsx";
import SourceForm from "./SourceForm.jsx";
import { PROVIDERS, asJson, labelOf, loadSaved, post, storeSaved } from "./lib.js";
import { quietButton } from "./ui.jsx";

function LedgerRow({ label, idle, sent }) {
  return (
    <div>
      <dt className="font-semibold">{label}</dt>
      <dd className={`mt-0.5 ${sent ? "font-semibold text-ok" : "text-muted"}`}>{sent || idle}</dd>
    </div>
  );
}

function useScrollTo(dependency) {
  const ref = useRef(null);
  useEffect(() => {
    if (!dependency) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }, [dependency]);
  return ref;
}

export default function App() {
  const [llms, setLlms] = useState({});
  const [run, setRun] = useState(0);
  const [topics, setTopics] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [snippets, setSnippets] = useState([]);
  const [results, setResults] = useState({});
  const candidatesRef = useScrollTo(analysis);
  const compareRef = useScrollTo(snippets);
  const epoch = useRef(0);
  const [saved, setSaved] = useState(loadSaved);
  const [viewing, setViewing] = useState(null);

  function updateSaved(list) {
    setSaved(list);
    storeSaved(list);
  }

  function save(provider, r) {
    const entry = { id: Date.now(), provider, model: r.model, question: r.question, usage: r.usage, seconds: r.seconds, status: "done" };
    updateSaved([entry, ...saved]);
  }

  function remove(id) {
    if (viewing?.id === id) setViewing(null);
    updateSaved(saved.filter((s) => s.id !== id));
  }

  const connected = PROVIDERS
    .filter((p) => llms[p.id]?.status === "connected")
    .map((p) => ({ provider: p.id, model: llms[p.id].model, key: llms[p.id].key }));
  const sentTo = Object.keys(results);
  const busy = Object.values(results).some((r) => r.status === "loading");

  function analyzed(pickedTopics, data) {
    epoch.current += 1;
    setTopics(pickedTopics);
    setAnalysis(data);
    setResults({});
    setSnippets([]);
    setRun((r) => r + 1);
  }

  async function generateFor(llm, approved) {
    const id = llm.provider;
    const started = performance.now();
    const mine = epoch.current;
    const settle = (result) => {
      if (mine === epoch.current) setResults((all) => ({ ...all, [id]: { model: llm.model, ...result } }));
    };
    settle({ status: "loading" });
    try {
      const data = await post("/api/generate", asJson({ llm, topics, snippets: approved }));
      settle({ status: "done", ...data, seconds: Math.round((performance.now() - started) / 1000) });
    } catch (e) {
      settle({ status: "error", error: e.message });
    }
  }

  function generate(approved) {
    epoch.current += 1;
    setSnippets(approved);
    setResults({});
    connected.forEach((llm) => generateFor(llm, approved));
  }

  function retry(id) {
    const llm = connected.find((c) => c.provider === id);
    if (llm) generateFor(llm, snippets);
  }

  const stats = analysis?.stats;
  const ranker = analysis?.ranked_by;
  const count = snippets.length;

  return (
    <>
      <div className="mx-auto grid max-w-[68rem] grid-cols-[minmax(0,1fr)] gap-x-14 gap-y-8 px-4 pt-8 pb-10 md:px-6 md:pt-12 lg:grid-cols-[minmax(0,44rem)_17rem] lg:gap-y-10">
        <header className="max-w-[44rem] lg:col-span-2">
          <p className="mb-6 font-bold tracking-tight lg:mb-10">Homegrown</p>
          <h1 className="text-[clamp(2.1rem,5.2vw,3.4rem)] leading-[1.03] font-extrabold tracking-[-0.035em] text-balance">
            Ask about the problems your team already solved.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Point this at a codebase, pick what you want to test, and get a three-part interview question built on a real function from it, written by the models you choose.
          </p>
        </header>

        <aside className="border-l-[3px] border-ok pl-5 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-2 lg:self-start" aria-labelledby="ledger-title">
          <h2 id="ledger-title" className="mb-4 text-[0.95rem] font-bold">What reaches the models</h2>
          <dl className="grid gap-4 text-[0.85rem]" aria-live="polite">
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
          </dl>
          <h2 className="mt-8 mb-3 text-[0.95rem] font-bold">Saved problems</h2>
          {saved.length === 0 ? (
            <p className="text-[0.85rem] text-muted">None yet. Save a generated question to keep it here.</p>
          ) : (
            <ul className="grid gap-3 text-[0.85rem]">
              {saved.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className={`cursor-pointer text-left hover:text-marker ${viewing?.id === s.id ? "font-bold" : "font-semibold"}`}
                    aria-pressed={viewing?.id === s.id}
                    onClick={() => setViewing(s)}
                  >
                    {s.question.title}
                    <span className="block font-normal text-muted">{labelOf(s.provider)} {s.model}</span>
                  </button>
                  <button type="button" className={`${quietButton} px-2 py-0.5`} aria-label={`Delete ${s.question.title}`} onClick={() => remove(s.id)}>×</button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className="grid grid-cols-[minmax(0,1fr)] content-start gap-6 lg:col-start-1 lg:row-start-2">
          <Providers llms={llms} setLlms={setLlms} />
          <SourceForm ranker={connected[0]} onAnalyzed={analyzed} />
          {analysis && (
            <Candidates key={run} ref={candidatesRef} analysis={analysis} busy={busy} models={connected.length} onGenerate={generate} />
          )}
        </main>
      </div>

      {viewing ? (
        <Compare results={{ [viewing.provider]: viewing }} onClose={() => setViewing(null)} />
      ) : (
        sentTo.length > 0 && (
          <Compare ref={compareRef} results={results} busy={busy} onRegenerate={() => generate(snippets)} onRetry={retry} onSave={save} />
        )
      )}
    </>
  );
}
