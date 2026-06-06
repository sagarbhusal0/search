"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  initialQuery?: string;
  placeholder?: string;
  autoFocus?: boolean;
  scoped?: boolean;
}

export default function SearchBar({ initialQuery = "", placeholder = "Search with privacy", autoFocus = false, scoped }: SearchBarProps) {
  const router = useRouter();
  let searchParams: URLSearchParams | null = null;
  try { searchParams = useSearchParams(); } catch {} // safe fallback when outside Suspense
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [show, setShow] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete?s=${encodeURIComponent(query)}`);
        const data = await res.json();
        const items = data.suggestions || (Array.isArray(data) && data[1]) || [];
        setSuggestions(items.slice(0, 8));
      } catch { setSuggestions([]); }
    }, 100);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = (q?: string) => {
    const searchQ = q || query;
    if (!searchQ.trim()) return;
    const scraper = searchParams?.get("scraper");
    const params = new URLSearchParams();
    params.set("s", searchQ.trim());
    if (scraper) params.set("scraper", scraper);
    const base = scoped ? "" : "/search";
    router.push(`${base}?${params.toString()}`);
    setShow(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(p => p < suggestions.length - 1 ? p + 1 : 0); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(p => p > 0 ? p - 1 : suggestions.length - 1); }
    else if (e.key === "Enter") { e.preventDefault(); active >= 0 && suggestions[active] ? handleSearch(suggestions[active]) : handleSearch(); }
    else if (e.key === "Escape") { setShow(false); inputRef.current?.blur(); }
  };

  return (
    <div className="relative w-full">
      <div className={`flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] px-3 py-1 transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${show && suggestions.length > 0 ? "rounded-t-[var(--radius-md)] rounded-b-none border-b-transparent" : "rounded-[var(--radius-md)]"} glow-accent`}>
        <button onClick={() => handleSearch()} className="p-0.5 text-[var(--meta)] shrink-0 cursor-pointer transition-colors hover:text-[var(--accent)]" aria-label="Search">
          <Search size={16} />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setShow(true); setActive(-1); }}
          onFocus={() => setShow(true)}
          onBlur={() => setTimeout(() => setShow(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 h-9 bg-transparent text-[var(--fg)] placeholder-[var(--meta)] focus:outline-none text-[15px] font-[var(--font-body)]"
          autoFocus={autoFocus}
          aria-label="Search query"
          autoComplete="off"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); inputRef.current?.focus(); setSuggestions([]); }}
            className="p-1 rounded-full text-[var(--meta)] hover:text-[var(--fg)] hover:bg-white/5 transition-colors"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
        <button
          onClick={() => handleSearch()}
          className="size-7 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center transition-all duration-150 active:scale-90 shrink-0"
          aria-label="Search"
        >
          <Search size={14} strokeWidth={2.5} />
        </button>
      </div>

      {show && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-[var(--surface)] border border-[var(--border)] border-t-0 rounded-b-[var(--radius-md)] shadow-xl overflow-hidden z-50">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onMouseDown={e => { e.preventDefault(); handleSearch(s); }}
              className={`w-full text-left px-4 py-2.5 cursor-pointer text-[14px] flex items-center gap-3 transition-colors ${
                i === active
                  ? "bg-[var(--accent-subtle)] text-[var(--accent-hover)]"
                  : "text-[var(--fg-2)] hover:bg-white/[0.03]"
              }`}
            >
              <Search size={13} className="text-[var(--meta)] shrink-0" />
              <span>{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
