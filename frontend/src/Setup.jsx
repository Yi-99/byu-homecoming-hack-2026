import { useEffect, useRef, useState } from "react";
import Candidates from "./Candidates.jsx";
import Codebase from "./Codebase.jsx";
import Compare from "./Compare.jsx";
import { Ledger, ListPage, QuickView, SidebarCard } from "./Library.jsx";
import Providers from "./Providers.jsx";
import Topics from "./Topics.jsx";
import {
  MAX_SNIPPETS, MAX_TOPICS, NOTION_WARNING, PROVIDERS, asJson, labelOf, listenForNotion, post, storeNotion, storedNotion,
} from "./lib.js";
import { Code, ErrorNote, Icon, IconButton, Modal, btn, ghostBtn, primaryBtn } from "./ui.jsx";

const STEPS = ["Connect", "Codebase", "Topics", "Review", "Choose"];
const pane = "flex h-full min-w-0 flex-[0_0_100%] flex-col justify-start gap-6 overflow-auto px-6 py-10 md:px-16";

function Empty({ title, text }) {
  return (
    <div className="max-w-[760px] border border-dashed border-divider px-6 py-12 text-center">
      <p className="m-0 font-heading text-2xl font-semibold">{title}</p>
      <p className="m-0 mt-2 text-sm text-neutral-700">{text}</p>
    </div>
  );
}

function BuildModal({ phase, ranker, onCancel }) {
  const phases = ["Reading the codebase", `Picking functions with ${labelOf(ranker.provider)} · ${ranker.model}`];
  return (
    <Modal label="Building your interview" onClose={() => {}}>
      <div className="flex flex-col gap-1.5 px-6 pt-6 pb-3">
        <h3 className="m-0 text-[26px]">Building your interview</h3>
        <span className="text-sm text-neutral-700">The AI is reading an outline of your codebase. This can take a minute.</span>
      </div>
      {phases.map((label, i) => {
        const done = i < phase, cur = i === phase;
        return (
          <div key={label} className="flex items-center gap-3.5 border-t border-divider px-6 py-3.5">
            <span className={`flex size-5 flex-none items-center justify-center border text-[11px] text-bg transition-all duration-300 ${done ? "border-accent bg-accent" : cur ? "border-accent" : "border-divider"}`}>
              {done ? "✓" : cur ? <span className="size-2 animate-pulse bg-accent" /> : ""}
            </span>
            <span className={`text-[15px] ${done || cur ? "text-ink" : "text-neutral-600"} ${cur ? "font-medium" : ""}`}>{label}</span>
          </div>
        );
      })}
      <div className="flex justify-end border-t border-divider px-6 py-3.5">
        <button type="button" className={ghostBtn} onClick={onCancel}>Cancel</button>
      </div>
    </Modal>
  );
}

export default function Setup({ saved, updateSaved, onExit }) {
  const [llms, setLlms] = useState({});
  const [codebases, setCodebases] = useState([]);
  const [cbSelected, setCbSelected] = useState(null);
  const [picked, setPicked] = useState([]);
  const [custom, setCustom] = useState([]);
  const [building, setBuilding] = useState(null);
  const [buildError, setBuildError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [run, setRun] = useState({ topics: [], repo: "" });
  const [checked, setChecked] = useState([]);
  const [snippets, setSnippets] = useState([]);
  const [results, setResults] = useState({});
  const [chosen, setChosen] = useState(null);
  const [withNotes, setWithNotes] = useState(false);
  const [savedFor, setSavedFor] = useState({});
  const [notion, setNotion] = useState(storedNotion);
  const [step, setStep] = useState(0);
  const [sidebar, setSidebar] = useState(() => matchMedia("(min-width: 900px)").matches);
  const [listView, setListView] = useState(false);
  const [quick, setQuick] = useState(null);
  const [codeFn, setCodeFn] = useState(null);
  const [approved, setApproved] = useState(null);
  const [nudge, setNudge] = useState(0);
  const [notionAsk, setNotionAsk] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const epoch = useRef(0);
  const abort = useRef(null);

  useEffect(() => listenForNotion((connection) => {
    storeNotion(connection);
    setNotion(connection);
  }), []);

  // an in-page dialog, not confirm(): the pop-up must open from a click inside the page
  function connectNotion() {
    setPopupBlocked(false);
    setNotionAsk(true);
  }

  function openNotion() {
    const popup = window.open("/api/notion/login", "homegrown-notion", "popup,width=600,height=760");
    setPopupBlocked(!popup);
    if (popup) {
      popup.focus();
      setNotionAsk(false);
    }
  }

  function disconnectNotion() {
    storeNotion(null);
    setNotion(null);
  }

  const connected = PROVIDERS
    .filter((p) => llms[p.id]?.status === "connected")
    .map((p) => ({ provider: p.id, model: llms[p.id].model, key: llms[p.id].key }));
  const ranker = connected[0];
  const codebase = codebases.find((c) => c.id === cbSelected);
  const ids = Object.keys(results);
  const busy = Object.values(results).some((r) => r.status === "loading");
  const doneIds = ids.filter((id) => results[id].status === "done");
  const pick = chosen && results[chosen]?.status === "done" ? chosen : ids.length === 1 && doneIds.length === 1 ? doneIds[0] : null;

  // ---- step 3: outline + rank ----
  async function build() {
    setBuildError("");
    const body = new FormData();
    body.append("topics", JSON.stringify(picked));
    body.append("llm", JSON.stringify(ranker));
    if (codebase.kind === "github") body.append("github_url", codebase.url);
    else for (const { file, path } of codebase.files) body.append("files", file, path);

    const ctrl = new AbortController();
    abort.current = ctrl;
    setBuilding(0);
    const timer = setTimeout(() => setBuilding((b) => (b === null ? null : 1)), 2500);
    try {
      const data = await post("/api/analyze", { body, signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      epoch.current += 1;
      setAnalysis(data);
      setRun({ topics: picked, repo: codebase.name });
      setChecked(data.candidates.slice(0, 1).map((c) => c.id));
      setResults({});
      setSnippets([]);
      setChosen(null);
      setSavedFor({});
      go(3);
    } catch (e) {
      if (!ctrl.signal.aborted) setBuildError(e.message);
    } finally {
      clearTimeout(timer);
      if (abort.current === ctrl) setBuilding(null);
    }
  }

  function cancelBuild() {
    abort.current?.abort();
    abort.current = null;
    setBuilding(null);
  }

  // ---- step 4: generate with every connected model ----
  async function generateFor(llm, approvedSnippets) {
    const id = llm.provider;
    const started = performance.now();
    const mine = epoch.current;
    const settle = (result) => {
      if (mine === epoch.current) setResults((all) => ({ ...all, [id]: { model: llm.model, ...result } }));
    };
    settle({ status: "loading" });
    try {
      const data = await post("/api/generate", asJson({ llm, topics: run.topics, snippets: approvedSnippets }));
      settle({ status: "done", ...data, seconds: Math.round((performance.now() - started) / 1000) });
    } catch (e) {
      settle({ status: "error", error: e.message });
    }
  }

  function generate(approvedSnippets) {
    epoch.current += 1;
    setSnippets(approvedSnippets);
    setResults({});
    setChosen(null);
    setSavedFor({});
    connected.forEach((llm) => generateFor(llm, approvedSnippets));
    go(4);
  }

  function retry(id) {
    const llm = connected.find((c) => c.provider === id);
    if (llm) generateFor(llm, snippets);
  }

  // ---- library ----
  const saveState = (id) => (!savedFor[id] ? "none" : savedFor[id].question === results[id]?.question ? "same" : "changed");

  function save(id) {
    const r = results[id];
    const entryId = savedFor[id]?.entryId ?? Date.now();
    const entry = {
      id: entryId, provider: id, model: r.model, question: r.question, usage: r.usage, seconds: r.seconds, status: "done",
      snippets, topics: run.topics, repo: run.repo, date: new Date().toISOString(),
    };
    updateSaved(saved.some((s) => s.id === entryId) ? saved.map((s) => (s.id === entryId ? entry : s)) : [entry, ...saved]);
    setSavedFor((all) => ({ ...all, [id]: { entryId, question: r.question } }));
    return entryId;
  }

  function remove(id) {
    if (quick?.id === id) setQuick(null);
    updateSaved(saved.filter((s) => s.id !== id));
  }

  function approve() {
    const entryId = saveState(pick) === "same" ? savedFor[pick].entryId : save(pick);
    setSidebar(true);
    setApproved({ provider: pick, entryId });
  }

  function restart() {
    epoch.current += 1;
    setApproved(null);
    setAnalysis(null);
    setResults({});
    setSnippets([]);
    setChecked([]);
    setChosen(null);
    setSavedFor({});
    go(1);
  }

  // ---- navigation ----
  const candidates = analysis?.candidates ?? [];
  const blocked = [
    !connected.length && "Connect at least one model to continue.",
    !codebase && (codebases.length ? "Select a codebase to continue." : "Add a codebase to continue."),
    (!ranker && "Connect a model in step 1 first.")
      || (!codebase && "Add a codebase in step 2 first.")
      || (!picked.length && "Pick at least one topic to continue.")
      || (picked.length > MAX_TOPICS && `Pick up to ${MAX_TOPICS} topics.`),
    (!candidates.length && "No functions matched. Go back and pick other topics.")
      || (!checked.length && "Keep at least one function.")
      || (checked.length > MAX_SNIPPETS && `Keep up to ${MAX_SNIPPETS} functions.`),
    !pick && (busy && !doneIds.length ? "Wait for the questions to finish." : "Click a version to select it."),
  ][step];
  const reachable = [true, connected.length > 0, connected.length > 0 && !!codebase, !!analysis, ids.length > 0];
  const nextLabel = ["Continue", "Continue", "Build interview", connected.length > 1 ? `Write with ${connected.length} models` : "Write the question", "Approve interview"][step];
  const stepNudge = blocked ? nudge : 0;

  function go(i) {
    setNudge(0);
    setStep(i);
  }

  function next() {
    if (blocked) return setNudge((n) => n + 1);
    setNudge(0);
    if (step === 2) return build();
    if (step === 3) {
      return generate(candidates.filter((c) => checked.includes(c.id)).map((c) => ({ path: c.path, name: c.name, code: c.code_scrubbed })));
    }
    if (step === 4) return approve();
    go(step + 1);
  }

  function back() {
    if (quick) return setQuick(null);
    if (listView) return setListView(false);
    if (step === 0) return onExit();
    go(step - 1);
  }

  const quickIndex = quick ? saved.findIndex((s) => s.id === quick.id) : -1;
  const cycle = (d) => setQuick({ id: saved[(quickIndex + d + saved.length) % saved.length].id, edit: false });
  const overlay = listView || quickIndex >= 0;

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="flex flex-none items-center gap-5 border-b border-divider px-6 py-3.5 md:px-8">
        <span className="text-[11px] tracking-[.1em] text-neutral-700 uppercase">Interview setup</span>
        <IconButton icon="panel" label={sidebar ? "Hide questions" : `Show questions (${saved.length})`} onClick={() => setSidebar((v) => !v)} aria-expanded={sidebar} />
      </div>

      <div className="flex min-h-0 flex-1">
        <aside
          aria-label="Saved questions"
          className={`flex-none overflow-hidden border-r transition-[width,border-color] duration-400 ease-slide ${sidebar ? "w-[300px] border-divider" : "w-0 border-transparent"}`}
          inert={!sidebar}
        >
          <div className="flex h-full w-[300px] flex-col">
            <div className="flex flex-col gap-0.5 px-5 pt-5 pb-3">
              <span className="font-heading text-xl font-semibold">Questions</span>
              <div className="icon-row flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-700">{saved.length} saved</span>
                <IconButton icon="grid" label="View all questions" onClick={() => { setQuick(null); setListView(true); }} end />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-3 pb-4">
              {saved.length === 0 ? (
                <p className="m-0 px-2 py-3 text-[13px] leading-normal text-neutral-700">Nothing saved yet. Use Save on any version in step 5.</p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                  {saved.map((s) => (
                    <SidebarCard
                      key={s.id}
                      s={s}
                      active={quick?.id === s.id || approved?.entryId === s.id}
                      onOpen={() => setQuick({ id: s.id, edit: false })}
                      onEdit={() => setQuick({ id: s.id, edit: true })}
                      onRemove={() => remove(s.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
            <Ledger
              stats={analysis?.stats}
              ranker={analysis?.ranked_by}
              count={snippets.length}
              sentTo={ids}
              connected={connected}
              notion={notion}
              onConnectNotion={connectNotion}
              onDisconnectNotion={disconnectNotion}
            />
          </div>
        </aside>

        <main className="relative min-w-0 flex-1 overflow-hidden">
          <div className="flex h-full transition-transform duration-500 ease-slide" style={{ transform: `translateX(-${step * 100}%)` }}>
            <section className={pane} inert={step !== 0 || overlay}>
              <Providers llms={llms} setLlms={setLlms} nudge={step === 0 ? stepNudge : 0} />
            </section>
            <section className={pane} inert={step !== 1 || overlay}>
              <Codebase codebases={codebases} setCodebases={setCodebases} selected={cbSelected} setSelected={setCbSelected} nudge={step === 1 ? stepNudge : 0} />
            </section>
            <section className={pane} inert={step !== 2 || overlay}>
              <Topics picked={picked} setPicked={setPicked} custom={custom} setCustom={setCustom} ranker={ranker} error={buildError} nudge={step === 2 ? stepNudge : 0} />
            </section>
            <section className={pane} inert={step !== 3 || overlay}>
              {analysis ? (
                <Candidates analysis={analysis} checked={checked} setChecked={setChecked} nudge={step === 3 ? stepNudge : 0} onViewCode={setCodeFn} />
              ) : (
                <Empty title="No functions yet" text="Pick topics, then press Build interview." />
              )}
            </section>
            <section className={pane} inert={step !== 4 || overlay}>
              {ids.length > 0 ? (
                <Compare
                  results={results}
                  chosen={pick}
                  onChoose={setChosen}
                  withNotes={withNotes}
                  setWithNotes={setWithNotes}
                  notion={notion}
                  busy={busy}
                  nudge={step === 4 ? stepNudge : 0}
                  saveState={saveState}
                  onRegenerate={() => generate(snippets)}
                  onRetry={retry}
                  onSave={save}
                  onConnectNotion={connectNotion}
                />
              ) : (
                <Empty title="No questions yet" text="Keep the functions you want in step 4, then write the question." />
              )}
            </section>
          </div>

          {listView && (
            <ListPage
              saved={saved}
              activeId={quick?.id}
              onOpen={(id) => setQuick({ id, edit: false })}
              onEdit={(id) => setQuick({ id, edit: true })}
              onRemove={remove}
            />
          )}
          {quickIndex >= 0 && (
            <QuickView
              key={`${quick.id}-${quick.edit}`}
              entry={saved[quickIndex]}
              index={quickIndex}
              total={saved.length}
              startEditing={quick.edit}
              notion={notion}
              onConnectNotion={connectNotion}
              onPrev={() => cycle(-1)}
              onNext={() => cycle(1)}
              onClose={() => { setQuick(null); setListView(true); }}
              onUpdate={(entry) => updateSaved(saved.map((s) => (s.id === entry.id ? entry : s)))}
            />
          )}
        </main>
      </div>

      <footer className="grid flex-none grid-cols-[minmax(0,1fr)_auto] items-center gap-6 border-t border-divider px-6 py-3.5 md:grid-cols-[minmax(0,1fr)_auto_minmax(max-content,1fr)] md:px-8">
        <div className="flex min-w-0 items-center gap-3.5">
          <button type="button" className={`${ghostBtn} h-[46px] flex-none gap-2 pr-3.5 pl-2.5 text-[15px] text-neutral-800`} onClick={back}>
            <Icon name="left" size={18} />Back
          </button>
          {listView && !quick && (
            <button type="button" className={`${btn} h-[46px] flex-none whitespace-nowrap`} onClick={() => setListView(false)}>Back to setup</button>
          )}
          {!overlay && (
            <span className={`truncate text-[13px] ${stepNudge ? "font-medium text-accent-700" : "text-neutral-700"}`} role="status">{blocked || ""}</span>
          )}
        </div>
        <ol className={`m-0 hidden list-none gap-2.5 p-0 transition-opacity md:flex ${overlay ? "pointer-events-none opacity-0" : ""}`}>
          {STEPS.map((label, i) => {
            const done = i < step, cur = i === step, ok = reachable[i] || i <= step;
            return (
              <li key={label}>
                <button
                  type="button"
                  className={`flex w-24 flex-col gap-2 py-1 text-left ${ok ? "cursor-pointer" : "cursor-default opacity-50"}`}
                  onClick={() => ok && go(i)}
                  aria-current={cur ? "step" : undefined}
                >
                  <span className="relative block h-1 overflow-hidden bg-divider">
                    <span className="absolute inset-0 origin-left bg-accent transition-transform duration-500 ease-slide" style={{ transform: `scaleX(${done ? 1 : cur ? 0.5 : 0})` }} />
                  </span>
                  <span className={`text-[13px] transition-colors ${cur ? "font-semibold text-ink" : "text-neutral-700"}`}>{label}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="flex justify-end">
          {!overlay && (
            <button type="button" className={`${primaryBtn} h-[46px] min-w-[180px] text-base whitespace-nowrap ${blocked ? "opacity-60" : ""}`} onClick={next}>
              {nextLabel}
            </button>
          )}
        </div>
      </footer>

      {building !== null && ranker && <BuildModal phase={building} ranker={ranker} onCancel={cancelBuild} />}

      {codeFn && (
        <Modal label={codeFn.name} width={640} onClose={() => setCodeFn(null)}>
          <div className="flex items-center gap-3 border-b border-divider px-5 py-4">
            <div className="mr-auto flex min-w-0 flex-col gap-0.5">
              <span className="font-mono text-[15px] font-semibold">{codeFn.name}</span>
              <span className="truncate font-mono text-xs text-neutral-700">{codeFn.path} · exactly what will be sent, secrets redacted</span>
            </div>
            <IconButton icon="x" label="Close" onClick={() => setCodeFn(null)} end />
          </div>
          <Code className="max-h-[440px] px-5 py-4 text-[13px]">{codeFn.code_scrubbed}</Code>
        </Modal>
      )}

      {notionAsk && (
        <Modal label="Connect Notion" width={480} onClose={() => setNotionAsk(false)}>
          <div className="flex flex-col gap-3.5 p-7">
            <h3 className="m-0 text-[28px]">Connect Notion?</h3>
            <p className="m-0 text-[15px] leading-relaxed whitespace-pre-line text-neutral-700">{NOTION_WARNING.replace(/\n*Connect Notion\?$/, "")}</p>
            <ErrorNote>{popupBlocked && "Allow pop-ups for this page, then connect Notion again."}</ErrorNote>
            <div className="flex justify-end gap-2.5 pt-1.5">
              <button type="button" className={`${btn} h-[42px] min-w-[100px]`} onClick={() => setNotionAsk(false)}>Cancel</button>
              <button type="button" className={`${primaryBtn} h-[42px] min-w-[150px]`} onClick={openNotion}>Connect Notion</button>
            </div>
          </div>
        </Modal>
      )}

      {approved && (
        <Modal label="Interview approved" width={560} onClose={() => setApproved(null)}>
          <div className="flex flex-col gap-3.5 p-7">
            <h3 className="m-0 text-[28px]">Interview approved</h3>
            <p className="m-0 text-[15px] leading-relaxed text-neutral-700">
              Engineers will take the {labelOf(approved.provider)} version: three parts built from {snippets.length} function{snippets.length === 1 ? "" : "s"} in your codebase. It is now in your question list on the left.
            </p>
            <div className="flex flex-wrap justify-end gap-2.5 pt-1.5">
              <button type="button" className={`${btn} h-[42px] min-w-[120px]`} onClick={() => setApproved(null)}>Keep editing</button>
              <button type="button" className={`${btn} h-[42px] min-w-[150px] whitespace-nowrap`} onClick={() => { setApproved(null); setListView(true); }}>View question list</button>
              <button type="button" className={`${primaryBtn} h-[42px] min-w-[150px]`} onClick={restart}>New interview</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
