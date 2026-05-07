"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe2, Image as ImageIcon, Newspaper, Search, Video, X, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";

interface NewsResult {
  title: string;
  description: string;
  url: string;
  author?: string;
  date?: number;
  thumb?: { url?: string } | string;
}

function NewsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("s") || "";
  const page = searchParams.get("p") || "1";
  const [results, setResults] = useState<NewsResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(query);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [scraper, setScraper] = useState("google");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [npt, setNpt] = useState<string | null>(null);
  const [previousNpts, setPreviousNpts] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isNavigating, setIsNavigating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const SCRAPERS = [
    { value: "google", label: "Google" },
    { value: "brave", label: "Brave" },
    { value: "ddg", label: "DuckDuckGo" },
  ];

  useEffect(() => {
    if (!query) return;
    const fetchNews = async () => {
      setLoading(true);
      try {
        let url = `/api/news?s=${encodeURIComponent(query)}&scraper=${scraper}`;
        const currentNpt = searchParams.get("npt");
        if (currentNpt) url += `&npt=${encodeURIComponent(currentNpt)}`;
        else url += `&p=${page}`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.news || []);
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
    fetchNews();
  }, [query, scraper, page]);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (q?: string) => {
    const searchQ = q || searchQuery;
    if (searchQ.trim()) {
      router.push(`/news?s=${encodeURIComponent(searchQ.trim())}&scraper=${scraper}`);
      setShowSuggestions(false);
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
                onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="flex-1 h-9 bg-transparent text-[var(--foreground)] focus:outline-none text-base"
              />
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
          <a href={`/images?s=${encodeURIComponent(query)}`} className="flex items-center gap-1.5 pb-1.5 border-b-2 border-transparent hover:text-[var(--foreground)] transition-colors">
            <ImageIcon size={14} /> Images
          </a>
          <a href={`/videos?s=${encodeURIComponent(query)}`} className="flex items-center gap-1.5 pb-1.5 border-b-2 border-transparent hover:text-[var(--foreground)] transition-colors">
            <Video size={14} /> Videos
          </a>
          <span className="flex items-center gap-1.5 pb-1.5 border-b-2 border-[var(--accent)] text-[var(--foreground)]">
            <Newspaper size={14} /> News
          </span>
        </div>
      </header>

      <div className="max-w-[1300px] mx-auto px-4 py-6 max-w-2xl">
        {loading ? (
          <div className="space-y-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="h-3 bg-[var(--border)] rounded w-48" />
                <div className="h-5 bg-[var(--border)] rounded w-3/4" />
                <div className="h-4 bg-[var(--border)] rounded w-full" />
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="py-20 text-center text-[var(--muted)]">
            <p className="text-xl font-medium text-[var(--foreground)] mb-2">No news found for "{query}"</p>
          </div>
        ) : (
          <div className="space-y-10">
            {results.map((result, i) => {
              const thumbUrl = typeof result.thumb === "string" ? result.thumb : result.thumb?.url || "";
              const proxiedThumb = thumbUrl ? `/api/proxy?i=${encodeURIComponent(thumbUrl)}&s=thumb` : "";

              return (
                <article key={i} className="group result-link flex gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[12px] text-[var(--muted)] mb-1">
                      <span className="font-bold uppercase tracking-tight">{result.author || "News"}</span>
                      {result.date && <span>• {new Date(result.date * 1000).toLocaleDateString()}</span>}
                    </div>
                    <a href={result.url} target="_blank" rel="noopener noreferrer" className="block">
                      <h2 className="text-[19px] font-medium text-[var(--accent-2)] result-title leading-tight mb-2">
                        {result.title}
                      </h2>
                    </a>
                    <p className="text-[14px] text-[var(--foreground)] opacity-80 leading-relaxed line-clamp-3">
                      {result.description}
                    </p>
                  </div>
                  {proxiedThumb && (
                    <div className="hidden sm:block w-32 h-20 flex-shrink-0 bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
                      <img src={proxiedThumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
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

export default function NewsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewsContent />
    </Suspense>
  );
}
