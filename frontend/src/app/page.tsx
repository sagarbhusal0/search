"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Settings } from "lucide-react";

export default function Home() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete?s=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (Array.isArray(data) && data[1]) {
          setSuggestions(data[1].slice(0, 8));
        }
      } catch {
        setSuggestions([]);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = (searchQuery?: string) => {
    const q = searchQuery || query;
    if (q.trim()) {
      router.push(`/search?s=${encodeURIComponent(q.trim())}`);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSearch(suggestions[selectedIndex]);
      } else {
        handleSearch();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center pt-[12vh] px-4 pb-12 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_70%)]" />

      {/* Top bar */}
      <div className="absolute top-6 right-6 flex items-center gap-4 text-sm text-[#c7d2e4]">
        <a href="/" className="hover:text-white transition-colors">Home</a>
        <a href="/settings" className="hover:text-white transition-colors flex items-center gap-1">
          <Settings size={16} />
          Settings
        </a>
      </div>

      <div className="w-full max-w-4xl relative z-10">
        {/* Logo */}
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <img src="/logo.svg" alt="Sorvx Logo" className="h-24 w-auto sm:h-40" />
          </div>
        </div>

        {/* Search Box */}
        <div className="max-w-2xl mx-auto relative group z-50">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-[28px] opacity-30 group-hover:opacity-50 blur transition duration-500"></div>

          <div
            className={`relative flex items-center gap-3 bg-[var(--card)] border border-[var(--border)] px-3 py-3 sm:px-4 shadow-2xl transition-all duration-300 ${showSuggestions && suggestions.length > 0
              ? "rounded-t-[28px] rounded-b-none border-b-transparent"
              : "rounded-[28px] hover:border-[var(--accent)]/50 focus-within:ring-2 focus-within:ring-[var(--accent)]/50"
              }`}
          >
            <div className={`hidden sm:block text-[var(--muted)] transition-colors ${showSuggestions ? "text-[var(--accent)]" : ""}`}>
              <Search size={22} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
                setSelectedIndex(-1);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
              onKeyDown={handleKeyDown}
              placeholder="Search with privacy"
              className="flex-1 h-12 bg-transparent text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none text-[17px] w-full"
              autoFocus
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-[var(--muted)] transition-all mr-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            )}
            <button
              onClick={() => handleSearch()}
              className="h-11 w-11 rounded-full bg-[var(--accent)] hover:opacity-90 text-white flex items-center justify-center shadow-lg transition-all duration-300 transform active:scale-95 flex-shrink-0"
              aria-label="Search"
            >
              <Search size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* Autocomplete Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 bg-[var(--card)] border border-[var(--border)] border-t-0 rounded-b-[28px] shadow-2xl overflow-hidden z-50"
            >
              <div className="max-h-[350px] overflow-y-auto no-scrollbar py-2">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={`px-6 py-3.5 cursor-pointer text-[var(--foreground)] text-[16px] flex items-center gap-4 transition-all ${index === selectedIndex
                      ? "bg-[var(--accent)]/10 text-[var(--accent-2)] pl-8 font-medium"
                      : "hover:bg-white/5 hover:pl-8"
                      }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSearch(suggestion);
                    }}
                  >
                    <Search size={16} className={`opacity-50 ${index === selectedIndex ? "text-[var(--accent)] opacity-100" : ""}`} />
                    {suggestion}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
