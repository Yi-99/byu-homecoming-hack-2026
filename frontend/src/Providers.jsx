import { useEffect, useState } from "react";
import { PROVIDERS, asJson, post, storeLlm, storedLlm } from "./lib.js";
import { ErrorNote, Step, quietButton } from "./ui.jsx";

const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-muted";

function ProviderRow({ id, label, llm = {}, onConnect, onModel, onRemove }) {
  const [draft, setDraft] = useState("");
  const connected = llm.status === "connected";
  const connecting = llm.status === "connecting";

  function submit(event) {
    event.preventDefault();
    if (draft.trim()) onConnect(id, draft.trim());
  }

  return (
    <li className="border-t border-line py-4 first:border-t-0 first:pt-0 last:pb-0">
      <form onSubmit={submit} className="grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center">
        <label htmlFor={`llm-${id}`} className="text-sm font-semibold">{label}</label>
        {connected ? (
          <select id={`llm-${id}`} className={field} value={llm.model} onChange={(e) => onModel(id, e.target.value)}>
            {llm.models.map((m) => <option key={m}>{m}</option>)}
          </select>
        ) : (
          <input
            id={`llm-${id}`}
            className={`${field} font-mono`}
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={`Paste your ${label} API key`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        )}
        {connected ? (
          <button type="button" className={quietButton} onClick={() => { setDraft(""); onRemove(id); }}>Remove key</button>
        ) : (
          <button type="submit" className={quietButton} disabled={connecting} aria-busy={connecting}>
            {connecting ? "Connecting…" : "Connect"}
          </button>
        )}
      </form>
      {connected && <p className="mt-1.5 text-sm font-semibold text-ok sm:pl-[7.5rem]">Connected. Pick the model to use.</p>}
      {llm.error && <div className="sm:pl-[7.5rem]"><ErrorNote>{llm.error}</ErrorNote></div>}
    </li>
  );
}

export default function Providers({ llms, setLlms }) {
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
    <Step n={1} title="Connect the models you want to use">
      <p className="mb-5 text-sm text-muted">
        This app has no model access of its own. Connect at least one provider with your own API key, or two or three to compare their questions side by side.
      </p>
      <ul>
        {PROVIDERS.map((p) => (
          <ProviderRow key={p.id} {...p} llm={llms[p.id]} onConnect={connect} onModel={pickModel} onRemove={remove} />
        ))}
      </ul>
      <p className="mt-5 text-sm text-muted">
        Keys stay in this browser tab until you close it. Each request forwards your key to that provider and nowhere else; the server does not store or log it.
      </p>
    </Step>
  );
}
