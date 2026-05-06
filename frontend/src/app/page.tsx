"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Settings, X } from "lucide-react";

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
    }, 100);

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
    <main className="home-bg min-h-screen flex flex-col items-center pt-[15vh] px-4 pb-12">
      {/* Top bar */}
      <div className="absolute top-6 right-6 flex items-center gap-6 text-[13px] font-medium text-[var(--muted)]">
        <a href="/" className="hover:text-[var(--foreground)] transition-colors">Home</a>
        <a href="/settings" className="hover:text-[var(--foreground)] transition-colors flex items-center gap-1.5">
          <Settings size={14} />
          Settings
        </a>
      </div>

      <div className="w-full max-w-2xl relative">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <img src="/logo.svg" alt="Sorvx Logo" className="h-28 sm:h-36 w-auto" />
        </div>

        {/* Search Box */}
        <div className="relative z-50">
          <div
            className={`flex items-center gap-3 bg-[var(--card)] border border-[var(--border)] px-4 py-1.5 shadow-lg transition-fast ${showSuggestions && suggestions.length > 0
              ? "rounded-t-[28px] rounded-b-none border-b-transparent ring-1 ring-[var(--accent)]"
              : "rounded-[28px] focus-within:ring-1 focus-within:ring-[var(--accent)] focus-within:border-[var(--accent)]"
              }`}
          >
            <div className="text-[var(--muted)] pl-1">
              <Search size={20} />
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
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={handleKeyDown}
              placeholder="Search with privacy"
              className="flex-1 h-11 bg-transparent text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none text-[17px]"
              autoFocus
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="p-1.5 hover:bg-white/10 rounded-full text-[var(--muted)] transition-colors mr-1"
              >
                <X size={18} />
              </button>
            )}
            <button
              onClick={() => handleSearch()}
              className="h-10 w-10 rounded-full bg-[var(--accent)] hover:opacity-90 text-white flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
              aria-label="Search"
            >
              <Search size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* Autocomplete Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 bg-[var(--card)] border border-[var(--border)] border-t-0 rounded-b-[28px] shadow-2xl overflow-hidden"
            >
              <div className="max-h-[350px] overflow-y-auto no-scrollbar py-2">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={`px-12 py-3 cursor-pointer text-[var(--foreground)] text-[16px] flex items-center gap-4 ${index === selectedIndex
                      ? "bg-[var(--accent)]/10 text-[var(--accent-2)]"
                      : "hover:bg-white/5"
                      }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSearch(suggestion);
                    }}
                  >
                    <Search size={14} className="opacity-40" />
                    {suggestion}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Branding Subtitle */}
        <div className="mt-8 text-center text-[var(--muted)] text-sm font-medium opacity-60">
            Privacy simplified. Search for anything.
        </div>
      </div>
    </main>
  );
}
