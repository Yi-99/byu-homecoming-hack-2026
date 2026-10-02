export const primaryButton =
  "mt-7 cursor-pointer rounded-lg bg-marker px-5 py-3 font-bold text-on-marker hover:brightness-110 disabled:cursor-progress disabled:opacity-70";
export const quietButton =
  "cursor-pointer rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-semibold transition-colors hover:border-marker hover:text-marker disabled:cursor-progress disabled:opacity-60";
export const peerFocus =
  "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-marker";

export function Step({ n, title, children, ...rest }) {
  return (
    <section className="scroll-mt-4 rounded-[14px] border border-line bg-surface p-5 md:p-7" aria-labelledby={`step${n}-title`} {...rest}>
      <h2 id={`step${n}-title`} className="mb-6 flex items-baseline gap-3 text-xl font-bold tracking-tight">
        <span className="size-7 flex-none rounded-full bg-ink text-center text-sm leading-7 text-surface">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ErrorNote({ children }) {
  return (
    <p role="alert" hidden={!children} className="mt-5 border-l-[3px] border-bad px-4 py-3 text-[0.925rem] font-semibold text-bad">
      {children}
    </p>
  );
}

export function Note({ children, className = "" }) {
  return <p className={`rounded-md bg-highlight px-4 py-3 text-sm ${className}`}>{children}</p>;
}

export function Tags({ items, className = "" }) {
  return (
    <ul className={`flex flex-wrap gap-1.5 font-sans ${className}`}>
      {items.map((t) => (
        <li key={t} className="rounded bg-board px-2 py-0.5 text-[0.78rem] font-semibold">{t}</li>
      ))}
    </ul>
  );
}

export function Code({ children, className = "" }) {
  return (
    <pre tabIndex={0} className={`max-h-88 overflow-x-auto rounded-md border border-line bg-board px-4 py-3.5 font-mono text-[0.8rem] leading-normal [tab-size:2] ${className}`}>
      {children}
    </pre>
  );
}

// renders `inline code` as <code>; everything else stays plain text
export function Rich({ text }) {
  return String(text).split("`").map((piece, i) =>
    i % 2 ? <code key={i} className="font-mono text-[0.9em]">{piece}</code> : piece,
  );
}

export function Paragraphs({ text }) {
  return String(text).split(/\n{2,}/).map((p, i) => (
    <p key={i} className="mb-3.5 max-w-[38rem]"><Rich text={p} /></p>
  ));
}
