import { useEffect, useState } from "react";
import { PROVIDERS, asJson, post, storeLlm, storedLlm } from "./lib.js";
import { ErrorNote, StepHead, btn, input, needClass } from "./ui.jsx";

function ProviderRow({ id, label, llm = {}, nudge, onConnect, onModel, onRemove }) {
  const [draft, setDraft] = useState("");
  const connected = llm.status === "connected";
  const connecting = llm.status === "connecting";
  const status = connected ? "Connected" : connecting ? "Connecting…" : "Not connected";

  function submit(event) {
    event.preventDefault();
    if (draft.trim()) onConnect(id, draft.trim());
  }

  return (
    <li className="border-t border-divider py-4">
      <form onSubmit={submit} className="grid items-center gap-3.5 md:grid-cols-[100px_minmax(0,1fr)_minmax(0,180px)_auto]">
        <div className="flex flex-col gap-0.5">
          <label htmlFor={`llm-${id}`} className="font-heading text-[19px] font-semibold">{label}</label>
          <span className={`text-xs ${connected ? "text-ok" : "text-neutral-700"}`}>{status}</span>
        </div>
        <input
          id={`llm-${id}`}
          className={`${input} font-mono ${connected ? "" : needClass(nudge)}`}
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={`Paste your ${label} API key`}
          value={connected ? llm.key : draft}
          readOnly={connected}
          onChange={(e) => setDraft(e.target.value)}
        />
        {connected ? (
          <select aria-label={`${label} model`} className={`${input} animate-fade-in cursor-pointer`} value={llm.model} onChange={(e) => onModel(id, e.target.value)}>
            {llm.models.map((m) => <option key={m}>{m}</option>)}
          </select>
        ) : (
          <span className="text-[13px] text-neutral-600">Connect a key to pick a model</span>
        )}
        {connected ? (
          <button type="button" className={`${btn} h-9 min-w-[110px]`} onClick={() => { setDraft(""); onRemove(id); }}>Remove key</button>
        ) : (
          <button type="submit" className={`${btn} h-9 min-w-[110px]`} disabled={connecting} aria-busy={connecting}>
            {connecting ? "Connecting…" : "Connect"}
          </button>
        )}
      </form>
      {llm.error && <ErrorNote className="mt-3 md:ml-[114px]">{llm.error}</ErrorNote>}
    </li>
  );
}

export default function Providers({ llms, setLlms, nudge }) {
  const patch = (id, change) => setLlms((all) => ({ ...all, [id]: { ...all[id], ...change } }));

  async function connect(id, key, preferred) {
    patch(id, { key, status: "connecting", error: "" });
    try {
      const { models } = await post("/api/models", asJson({ provider: id, key }));
      if (!models.length) throw new Error("This key has no chat models available.");
      const model = models.includes(preferred) ? preferred : models[0];
      storeLlm(id, { key, model });
      patch(id, { status: "connected", models, model });
    } catch (e) {
      patch(id, { status: "idle", error: e.message });
    }
  }

  function pickModel(id, model) {
    storeLlm(id, { key: llms[id].key, model });
    patch(id, { model });
  }

  function remove(id) {
    storeLlm(id, null);
    setLlms((all) => ({ ...all, [id]: undefined }));
  }

  useEffect(() => {
    for (const { id } of PROVIDERS) {
      const saved = storedLlm(id);
      if (saved?.key) connect(id, saved.key, saved.model);
    }
  }, []);

  return (
    <>
      <StepHead n={1} total={5} title="Connect models">
        This app has no model access of its own. Paste a key for one or more providers, then pick a model for each. Every connected model writes its own version of the question.
      </StepHead>
      <ul className="flex max-w-[960px] flex-col">
        {PROVIDERS.map((p) => (
          <ProviderRow key={p.id} {...p} llm={llms[p.id]} nudge={nudge} onConnect={connect} onModel={pickModel} onRemove={remove} />
        ))}
      </ul>
      <p className="m-0 max-w-[640px] text-[13px] leading-relaxed text-neutral-700">
        Keys stay in this browser tab and are removed when you close it. The server forwards each key to its provider only and never stores or logs it.
      </p>
    </>
  );
}
