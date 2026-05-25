"use client";

import { Search } from "lucide-react";

export default function MusicPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="text-center max-w-md px-6">
        <div className="size-14 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mx-auto mb-5">
          <Search size={22} className="text-[var(--meta)]" />
        </div>
        <h1 className="text-xl font-medium text-[var(--fg)] mb-2">Music search removed</h1>
        <p className="text-sm text-[var(--meta)] mb-6">This page is no longer available.</p>
        <a href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors">
          Go Home
        </a>
      </div>
    </main>
  );
}
