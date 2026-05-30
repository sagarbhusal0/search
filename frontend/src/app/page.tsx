"use client";

import { Settings } from "lucide-react";
import SearchBar from "./components/SearchBar";

export default function Home() {

  return (
    <main className="min-h-screen flex flex-col items-center" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(139,92,246,0.1), transparent 70%), var(--bg)" }}>
      <nav className="absolute top-5 right-6 flex items-center gap-5 text-[13px] font-medium text-[var(--meta)]">
        <a href="/" className="hover:text-[var(--fg)] transition-colors duration-200">Home</a>
        <a href="/settings" className="flex items-center gap-1.5 hover:text-[var(--fg)] transition-colors duration-200">
          <Settings size={13} />
          Settings
        </a>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-4 w-full max-w-xl">
        <div className="flex justify-center mb-10">
          <img src="/logo.svg" alt="Sorvx" className="h-28 sm:h-36 w-auto drop-shadow-[0_0_30px_rgba(139,92,246,0.15)]" />
        </div>
        <SearchBar autoFocus scoped={false} />
        <div className="mt-5 text-center text-[13px] text-[var(--meta)] font-normal tracking-wide">
          Privacy simplified. Search for anything.
        </div>
      </div>
    </main>
  );
}
