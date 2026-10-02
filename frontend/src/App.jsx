import { useState } from "react";
import Applicant from "./Applicant.jsx";
import { PrintSlot } from "./Question.jsx";
import Setup from "./Setup.jsx";
import { loadSaved, storeSaved } from "./lib.js";
import { Tag, ghostBtn } from "./ui.jsx";

function Landing({ onPick }) {
  return (
    <>
      <div className="flex flex-none items-center border-b border-divider px-6 py-3.5">
        <span className="font-heading text-xl font-semibold">Homegrown</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-[safe_center] gap-10 overflow-auto px-6 py-8">
        <div className="flex max-w-[680px] flex-col items-center gap-2.5 text-center">
          <h1 className="m-0 text-[48px] text-balance">Technical interviews built from real code</h1>
          <p className="m-0 text-[17px] leading-relaxed text-neutral-700">Recruiters turn their codebase into a three-part question. Engineers solve it with an interviewer that keeps the pressure low.</p>
        </div>
        <div className="flex w-[760px] max-w-full flex-col gap-5">
          <button
            type="button"
            onClick={() => onPick("recruiter")}
            className="flex min-h-[260px] cursor-pointer flex-col items-start justify-start gap-2.5 border border-divider bg-transparent px-6 pt-16 pb-9 text-left text-ink transition-colors duration-250 hover:border-accent hover:bg-accent-100 md:px-9"
          >
            <span className="text-xs tracking-[.1em] text-accent-700 uppercase">For recruiters</span>
            <span className="font-heading text-[44px] leading-[1.05] font-semibold">Build an interview from your codebase</span>
            <span className="max-w-[560px] text-base leading-normal text-neutral-700">Connect a model, add your repo, pick topics. The AI builds a three-part question you can review, compare and save.</span>
            <span className="pt-1.5 text-[15px] font-medium text-accent-700">Start setup →</span>
          </button>
          <button
            type="button"
            onClick={() => onPick("engineer")}
            className="flex cursor-pointer items-center gap-4 border border-divider bg-transparent px-[22px] py-4 text-left text-ink transition-colors duration-250 hover:border-accent hover:bg-accent-100"
          >
            <span className="font-heading text-xl font-semibold whitespace-nowrap">For engineers</span>
            <span className="mr-auto text-sm text-neutral-700">Taking an interview? Start here.</span>
            <span className="text-sm text-accent-700">→</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [role, setRole] = useState(null);
  const [saved, setSaved] = useState(loadSaved);

  function updateSaved(list) {
    setSaved(list);
    storeSaved(list);
  }

  return (
    <>
      <div className="flex h-screen flex-col overflow-hidden bg-bg text-ink print:hidden">
        {!role ? (
          <Landing onPick={setRole} />
        ) : (
          <>
            <div className="flex flex-none items-center gap-3.5 border-b border-divider px-6 py-2.5">
              <Tag>{role === "engineer" ? "Engineer" : "Recruiter"}</Tag>
              <button type="button" className={`${ghostBtn} ml-auto whitespace-nowrap`} onClick={() => setRole(null)}>Switch role</button>
            </div>
            <div className="relative min-h-0 flex-1">
              {role === "recruiter"
                ? <Setup saved={saved} updateSaved={updateSaved} onExit={() => setRole(null)} />
                : <Applicant saved={saved} onExit={() => setRole(null)} />}
            </div>
          </>
        )}
      </div>
      <PrintSlot />
    </>
  );
}
