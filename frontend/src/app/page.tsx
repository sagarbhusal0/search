"use client";

import { Settings } from "lucide-react";
import SearchBar from "./components/SearchBar";

export default function Home() {

  return (
    <main className="min-h-screen flex flex-col items-center" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(94,106,210,0.08), transparent 70%), var(--bg)" }}>
      <div className="absolute top-5 right-6 flex items-center gap-5 text-[13px] font-medium text-[var(--meta)]">
        <a href="/" className="hover:text-[var(--fg)] transition-colors">Home</a>
        <a href="/settings" className="flex items-center gap-1.5 hover:text-[var(--fg)] transition-colors">
          <Settings size={13} />
          Settings
        </a>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 w-full max-w-xl">
        <div className="flex justify-center mb-8">
          <img src="/logo.svg" alt="Sorvx" className="h-28 sm:h-36 w-auto" />
        </div>
        <SearchBar autoFocus scoped={false} />
        <div className="mt-6 text-center text-[13px] text-[var(--meta)] font-medium tracking-wide">
          Privacy simplified. Search for anything.
        </div>
      </div>
    </main>
  );
}
