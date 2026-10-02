// shared pieces of the "Industry" design system: square, hairline, Barlow
export const btn =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 border border-divider bg-transparent px-3 py-[7px] font-heading text-sm leading-tight font-semibold text-ink transition-colors hover:bg-ink/7 active:bg-ink/14 disabled:cursor-not-allowed disabled:opacity-45";
export const primaryBtn =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 border border-accent bg-accent px-3 py-[7px] font-heading text-sm leading-tight font-semibold text-bg transition-colors hover:bg-accent-600 active:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-45";
export const ghostBtn =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 border border-transparent bg-transparent px-1 py-[7px] font-heading text-sm leading-tight font-semibold text-accent-700 transition-colors hover:bg-accent/10 active:bg-accent/18 disabled:cursor-not-allowed disabled:opacity-45";
export const input =
  "min-h-9 w-full border border-divider bg-surface px-2.5 py-1.5 text-sm text-ink caret-accent placeholder:text-neutral-600 hover:border-ink/45 focus-visible:border-accent focus-visible:outline-offset-0 disabled:opacity-60";
export const kicker = "text-[11px] tracking-[.1em] uppercase text-accent-700";
export const muted = "text-neutral-700";

export const needClass = (nudge) => (nudge ? (nudge % 2 ? "nudge-a" : "nudge-b") : "");

const ICONS = {
  refresh: <><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></>,
  file: <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M16 13H8" /><path d="M16 17H8" /></>,
  bookmark: <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />,
  pencil: <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />,
  trash: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
  code: <><path d="m16 18 6-6-6-6" /><path d="m8 6-6 6 6 6" /></>,
  panel: <><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /></>,
  grid: <><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></>,
  left: <path d="m15 18-6-6 6-6" />,
  right: <path d="m9 18 6-6-6-6" />,
  back: <><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>,
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  copy: <><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></>,
  printer: <><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 9V3h12v6" /><rect width="12" height="8" x="6" y="14" rx="1" /></>,
  send: <><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" /><path d="m21.854 2.147-10.94 10.939" /></>,
};

export function Icon({ name, size = 16, filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

// label replaces the icon on hover; end=true anchors the label to the right edge
export function IconButton({ icon, label, onClick, end = false, filled = false, size, className = "", ...rest }) {
  return (
    <button type="button" className={`icon-btn ${end ? "lbl-end" : ""} ${className}`} aria-label={label} onClick={onClick} {...rest}>
      <Icon name={icon} size={size} filled={filled} />
      <span className="icon-lbl">{label}</span>
    </button>
  );
}

export function Check({ on, onClick, label, className = "" }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`flex size-5 flex-none cursor-pointer items-center justify-center border-[1.5px] p-0 text-xs leading-none text-bg transition-colors ${on ? "border-accent bg-accent" : "border-neutral-500 bg-transparent"} ${className}`}
    >
      {on ? "✓" : ""}
    </button>
  );
}

export function StepHead({ n, total, title, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-accent-700">Step {n} of {total}</span>
      <h2 className="m-0 text-4xl">{title}</h2>
      {children && <p className={`m-0 max-w-[680px] text-[15px] ${muted}`}>{children}</p>}
    </div>
  );
}

export function Modal({ onClose, width = 520, children, label }) {
  return (
    <div
      className="absolute inset-0 z-30 flex animate-fade-in items-center justify-center bg-neutral-900/45 p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="flex max-h-full max-w-full animate-pop-in flex-col border border-divider bg-bg shadow-modal"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ErrorNote({ children, className = "" }) {
  return (
    <p role="alert" hidden={!children} className={`border-l-[3px] border-bad px-4 py-2.5 text-sm font-medium text-bad ${className}`}>
      {children}
    </p>
  );
}

export function Note({ children, className = "" }) {
  return <p className={`border-l-2 border-accent bg-accent-100 px-4 py-3 text-sm ${className}`}>{children}</p>;
}

export function Tags({ items, custom = false, className = "" }) {
  return (
    <ul className={`flex flex-wrap gap-1 ${className}`}>
      {custom && (
        <li className="inline-flex items-center border border-dashed border-neutral-500 px-2 py-[3px] font-heading text-sm font-semibold tracking-[.01em] whitespace-nowrap text-neutral-800">Custom prompt</li>
      )}
      {items.map((t) => (
        <li key={t} className="inline-flex items-center gap-1.5 border border-accent-400 px-2 py-[3px] font-heading text-sm font-semibold tracking-[.01em] whitespace-nowrap text-accent-800">
          <span className="size-[5px] flex-none bg-accent" />
          {t}
        </li>
      ))}
    </ul>
  );
}

export function Tag({ children, tone = "accent", className = "" }) {
  const tones = {
    accent: "bg-accent-100 text-accent-800",
    neutral: "bg-neutral-100 text-neutral-800",
    outline: "border border-accent text-accent",
  };
  return <span className={`inline-flex items-center px-2.5 py-[3px] text-[11px] tracking-[.02em] whitespace-nowrap ${tones[tone]} ${className}`}>{children}</span>;
}

export function Code({ children, className = "" }) {
  return (
    <pre tabIndex={0} className={`m-0 overflow-auto bg-surface px-3 py-2.5 font-mono text-xs leading-relaxed [tab-size:2] print:max-h-none print:whitespace-pre-wrap ${className}`}>
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

export function Paragraphs({ text, className = "mb-3 last:mb-0" }) {
  return String(text).split(/\n{2,}/).map((p, i) => (
    <p key={i} className={className}><Rich text={p} /></p>
  ));
}
