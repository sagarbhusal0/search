"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe2, Image as ImageIcon, Newspaper, Search, Video, X, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";

interface ImageSource {
  url: string;
  width?: number;
  height?: number;
}

interface ImageResult {
  title?: string;
  url: string;
  source: ImageSource[];
}

function ImagesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("s") || "";
  const page = searchParams.get("p") || "1";
  const [results, setResults] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(query);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [scraper, setScraper] = useState("ddg");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [npt, setNpt] = useState<string | null>(null);
  const [previousNpts, setPreviousNpts] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isNavigating, setIsNavigating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const SCRAPERS = [
    { value: "ddg", label: "DuckDuckGo" },
    { value: "google", label: "Google" },
    { value: "yandex", label: "Yandex" },
    { value: "brave", label: "Brave" },
  ];

  useEffect(() => {
    if (!query) return;
    const fetchImages = async () => {
      setLoading(true);
      try {
        let url = `/api/images?s=${encodeURIComponent(query)}&scraper=${scraper}`;
        const currentNpt = searchParams.get("npt");
        if (currentNpt) url += `&npt=${encodeURIComponent(currentNpt)}`;
        else url += `&p=${page}`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.image || []);
        const nptFromUrl = searchParams.get("npt");
        if (nptFromUrl && !previousNpts.includes(nptFromUrl)) {
          setPreviousNpts(prev => [...prev, nptFromUrl]);
          setCurrentPage(prev => prev + 1);
        } else if (!nptFromUrl) {
          setPreviousNpts([]);
          setCurrentPage(1);
        }
        setNpt(data.npt || null);
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    fetchImages();
  }, [query, scraper, page]);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete?s=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (Array.isArray(data) && data[1]) {
          setSuggestions(data[1].slice(0, 8));
        }
      } catch { setSuggestions([]); }
    }, 100);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = (q?: string) => {
    const searchQ = q || searchQuery;
    if (searchQ.trim()) {
      router.push(`/images?s=${encodeURIComponent(searchQ.trim())}&scraper=${scraper}`);
      setShowSuggestions(false);
    }
  };

  const handleNextPage = () => {
    if (!npt || isNavigating) return;
    setIsNavigating(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("p");
    params.set("npt", npt);
    router.push(`/images?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => setIsNavigating(false), 200);
  };

  const handlePreviousPage = () => {
    if (previousNpts.length === 0 || isNavigating) return;
    setIsNavigating(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("p");
    if (previousNpts.length === 1) {
      params.delete("npt");
      setPreviousNpts([]);
      setCurrentPage(1);
    } else {
      const newPreviousNpts = [...previousNpts];
      newPreviousNpts.pop();
      const prevNpt = newPreviousNpts[newPreviousNpts.length - 1];
      params.set("npt", prevNpt);
      setPreviousNpts(newPreviousNpts);
      setCurrentPage(prev => prev - 1);
    }
    router.push(`/images?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => setIsNavigating(false), 200);
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-40 bg-[var(--background)] border-b border-[var(--border)] py-3">
        <div className="max-w-[1300px] mx-auto px-4 flex items-center gap-6">
          <a href="/" className="flex-shrink-0">
            <img src="/logo.svg" alt="Sorvx" className="h-9 w-auto" />
          </a>
          <div className="flex-1 max-w-2xl relative">
            <div className={`flex items-center bg-[var(--card)] border border-[var(--border)] rounded-full px-4 py-1.5 transition-fast focus-within:ring-1 focus-within:ring-[var(--accent)] focus-within:border-[var(--accent)] ${showSuggestions && suggestions.length > 0 ? 'rounded-b-none' : ''}`}>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); setActiveSuggestionIndex(-1); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="flex-1 h-9 bg-transparent text-[var(--foreground)] focus:outline-none text-base"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); inputRef.current?.focus(); }} className="p-1.5 hover:bg-white/10 rounded-full text-[var(--muted)]">
                  <X size={16} />
                </button>
              )}
              <div className="w-px h-5 bg-[var(--border)] mx-2" />
              <select
                value={scraper}
                onChange={(e) => setScraper(e.target.value)}
                className="bg-transparent text-[13px] text-[var(--foreground)] border-none outline-none cursor-pointer hover:bg-white/5 rounded px-1"
              >
                {SCRAPERS.map(s => <option key={s.value} value={s.value} className="bg-[var(--card)]">{s.label}</option>)}
              </select>
              <button onClick={() => handleSearch()} className="ml-2 text-[var(--accent)] hover:text-[var(--accent-2)] transition-colors">
                <Search size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-[1300px] mx-auto px-4 mt-3 flex items-center gap-6 text-[13px] text-[var(--muted)] font-medium">
          <a href={`/search?s=${encodeURIComponent(query)}`} className="flex items-center gap-1.5 pb-1.5 border-b-2 border-transparent hover:text-[var(--foreground)] transition-colors">
            <Search size={14} /> All
          </a>
          <span className="flex items-center gap-1.5 pb-1.5 border-b-2 border-[var(--accent)] text-[var(--foreground)]">
            <ImageIcon size={14} /> Images
          </span>
          <a href={`/videos?s=${encodeURIComponent(query)}`} className="flex items-center gap-1.5 pb-1.5 border-b-2 border-transparent hover:text-[var(--foreground)] transition-colors">
            <Video size={14} /> Videos
          </a>
          <a href={`/news?s=${encodeURIComponent(query)}`} className="flex items-center gap-1.5 pb-1.5 border-b-2 border-transparent hover:text-[var(--foreground)] transition-colors">
            <Newspaper size={14} /> News
          </a>
        </div>
      </header>

      <div className="max-w-[1300px] mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="aspect-square bg-[var(--border)] animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {results.map((result, i) => {
                const thumbUrl = result.source && result.source.length > 0 
                  ? result.source[result.source.length - 1].url 
                  : "";
                const proxiedThumb = thumbUrl ? `/api/proxy?i=${encodeURIComponent(thumbUrl)}&s=thumb` : "";
                
                return (
                  <div key={i} className="group relative aspect-square bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden transition-fast hover:border-[var(--accent)]">
                    <img
                      src={proxiedThumb}
                      alt={result.title || ""}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                      <p className="text-white text-[11px] font-medium line-clamp-2">{result.title}</p>
                      <p className="text-white/60 text-[9px] truncate">{getDomain(result.url)}</p>
                    </div>
                    <a href={result.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0" />
                  </div>
                );
              })}
            </div>

            {results.length > 0 && (
              <div className="mt-12 flex items-center justify-center gap-4 pb-12">
                <button
                  onClick={handlePreviousPage}
                  disabled={previousNpts.length === 0 || isNavigating}
                  className="flex items-center gap-2 px-5 py-2 rounded border border-[var(--border)] text-[14px] font-medium hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-fast"
                >
                  <ArrowLeft size={16} /> Previous
                </button>
                <span className="text-sm font-medium text-[var(--muted)]">Page {currentPage}</span>
                <button
                  onClick={handleNextPage}
                  disabled={!npt || isNavigating}
                  className="flex items-center gap-2 px-5 py-2 rounded border border-[var(--border)] text-[14px] font-medium hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-fast"
                >
                  Next <ArrowRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
        className={`fixed bottom-6 right-6 p-3 rounded-full bg-[var(--accent)] text-white shadow-lg transition-fast z-50 hover:opacity-90 active:scale-95 ${showBackToTop ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <ArrowUp size={20} />
      </button>
    </main>
  );
}

export default function ImagesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ImagesContent />
    </Suspense>
  );
}
