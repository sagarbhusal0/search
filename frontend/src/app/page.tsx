"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Settings } from "lucide-react";
import Image from "next/image";

export default function Home() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

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
    <main className="min-h-screen animated-bg flex flex-col">
      {/* Navigation */}
      <nav className="w-full px-4 sm:px-6 py-4 flex justify-end gap-4">
        <a href="/settings" className="flex items-center gap-2 text-[--text-secondary] hover:text-[--text-primary] transition">
          <Settings size={18} />
          <span className="hidden sm:inline text-sm">Settings</span>
        </a>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
        {/* Logo */}
        <div className="mb-8 fade-in">
          <Image
            src="/logo.png"
            alt="Sorvx"
            width={120}
            height={120}
            className="drop-shadow-2xl"
            priority
          />
        </div>

        {/* Brand */}
        <h1 className="text-4xl sm:text-5xl font-bold gradient-text text-glow mb-8 fade-in">
          Sorvx
        </h1>

        {/* Search Box */}
        <div className="w-full max-w-2xl relative fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="relative">
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
              placeholder="Search the web..."
              className="w-full h-14 sm:h-16 px-6 pr-14 input-glass text-base sm:text-lg"
              autoFocus
            />
            <button
              onClick={() => handleSearch()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-gradient-to-r from-[--primary-purple] to-[--primary-cyan] hover:opacity-90 transition"
            >
              <Search size={20} className="text-white" />
            </button>
          </div>

          {/* Autocomplete */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 glass rounded-2xl overflow-hidden z-50 fade-in">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`px-5 py-3 cursor-pointer flex items-center gap-3 transition ${index === selectedIndex
                      ? "bg-[--primary-purple]/20 text-[--primary-cyan]"
                      : "hover:bg-[--primary-purple]/10"
                    }`}
                  onMouseDown={() => handleSearch(suggestion)}
                >
                  <Search size={16} className="text-[--text-muted]" />
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap justify-center gap-3 mt-8 fade-in" style={{ animationDelay: "0.2s" }}>
          {["Images", "Videos", "News", "Music"].map((type) => (
            <a
              key={type}
              href={`/${type.toLowerCase()}`}
              className="px-4 py-2 btn-glass text-sm hover:text-[--primary-cyan] transition"
            >
              {type}
            </a>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-[--text-muted] text-sm">
        <p>Private search, powered by the wave.</p>
      </footer>
    </main>
  );
}
