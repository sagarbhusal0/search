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
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#1a1a1a]">
      {/* Navigation */}
      <div className="absolute top-4 right-4 flex gap-4">
        <a href="/" className="text-[#888] hover:text-white text-sm">Home</a>
        <a href="/settings" className="text-[#888] hover:text-white text-sm">Settings</a>
      </div>

      <div className="w-full max-w-2xl px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#e8e6e3] tracking-tight">Sorvx</h1>
        </div>

        {/* Search Box */}
        <div className="relative">
          <div className="flex items-center bg-[#2a2a2a] border border-[#444] rounded-md overflow-hidden">
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
              placeholder="Search..."
              className="flex-1 h-10 px-4 bg-transparent text-[#e8e6e3] placeholder-[#888] focus:outline-none"
              autoFocus
            />
            <button
              onClick={() => handleSearch()}
              className="px-4 h-10 bg-[#3a3a3a] text-[#e8e6e3] hover:bg-[#444] border-l border-[#444]"
            >
              Search
            </button>
          </div>

          {/* Autocomplete Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 bg-[#2a2a2a] border border-[#444] border-t-0 rounded-b-md z-50"
            >
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`px-4 py-2 cursor-pointer text-[#e8e6e3] ${index === selectedIndex ? "bg-[#3a3a3a]" : "hover:bg-[#3a3a3a]"
                    }`}
                  onMouseDown={() => handleSearch(suggestion)}
                >
                  <Search size={14} className="inline mr-2 text-[#888]" />
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-6 text-sm">
          <span className="text-[#e8e6e3] border-b-2 border-[#e8e6e3] pb-1">Web</span>
          <a href="/images" className="text-[#888] hover:text-[#e8e6e3]">Images</a>
          <a href="/videos" className="text-[#888] hover:text-[#e8e6e3]">Videos</a>
          <a href="/news" className="text-[#888] hover:text-[#e8e6e3]">News</a>
          <a href="/music" className="text-[#888] hover:text-[#e8e6e3]">Music</a>
        </div>
      </div>
    </main>
  );
}
