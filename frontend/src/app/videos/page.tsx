"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe2, Image as ImageIcon, Newspaper, Search, Video, X, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";

interface VideoResult {
  title: string;
  description?: string;
  url: string;
  author?: { name: string };
  date?: number;
  duration?: number;
  thumb?: { url?: string };
}

function VideosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("s") || "";
  const page = searchParams.get("p") || "1";
  const [results, setResults] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(query);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [scraper, setScraper] = useState("yt");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [npt, setNpt] = useState<string | null>(null);
  const [previousNpts, setPreviousNpts] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isNavigating, setIsNavigating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const SCRAPERS = [
    { value: "yt", label: "YouTube" },
    { value: "google", label: "Google" },
    { value: "brave", label: "Brave" },
  ];

  useEffect(() => {
    if (!query) return;
    const fetchVideos = async () => {
      setLoading(true);
      try {
        let url = `/api/videos?s=${encodeURIComponent(query)}&scraper=${scraper}`;
        const currentNpt = searchParams.get("npt");
        if (currentNpt) url += `&npt=${encodeURIComponent(currentNpt)}`;
        else url += `&p=${page}`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.video || []);
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
    fetchVideos();
  }, [query, scraper, page]);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (q?: string) => {
    const searchQ = q || searchQuery;
    if (searchQ.trim()) {
      router.push(`/videos?s=${encodeURIComponent(searchQ.trim())}&scraper=${scraper}`);
      setShowSuggestions(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h > 0 ? h : null, m, s].filter(x => x !== null).map(x => x!.toString().padStart(2, '0')).join(':').replace(/^0/, '');
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
          <span className="flex items-center gap-1.5 pb-1.5 border-b-2 border-[var(--accent)] text-[var(--foreground)]">
            <Video size={14} /> Videos
          </span>
          <a href={`/news?s=${encodeURIComponent(query)}`} className="flex items-center gap-1.5 pb-1.5 border-b-2 border-transparent hover:text-[var(--foreground)] transition-colors">
            <Newspaper size={14} /> News
          </a>
        </div>
      </header>

      <div className="max-w-[1300px] mx-auto px-4 py-6 max-w-3xl">
        {loading ? (
          <div className="space-y-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse flex gap-4">
                <div className="w-48 aspect-video bg-[var(--border)] rounded-lg shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-[var(--border)] rounded w-3/4" />
                  <div className="h-3 bg-[var(--border)] rounded w-1/2" />
                  <div className="h-3 bg-[var(--border)] rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="py-20 text-center text-[var(--muted)]">
            <p className="text-xl font-medium text-[var(--foreground)] mb-2">No videos found for "{query}"</p>
          </div>
        ) : (
          <div className="space-y-8">
            {results.map((result, i) => (
              <article key={i} className="group flex gap-5 result-link">
                <div className="relative w-48 aspect-video bg-black/20 rounded-lg overflow-hidden border border-[var(--border)] shrink-0">
                  {result.thumb?.url ? (
                    <img src={result.thumb.url} alt="" className="w-full h-full object-cover" />
                  ) : <div className="flex items-center justify-center h-full"><Video size={24} /></div>}
                  {result.duration && (
                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded">
                      {formatDuration(result.duration)}
                    </div>
                  )}
                  <a href={result.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0" />
                </div>
                <div className="flex-1 min-w-0">
                  <a href={result.url} target="_blank" rel="noopener noreferrer" className="block mb-1">
                    <h2 className="text-[17px] font-medium text-[var(--accent-2)] result-title leading-tight line-clamp-2">
                      {result.title}
                    </h2>
                  </a>
                  <div className="text-[12px] text-[var(--muted)] mb-2">
                    {result.author?.name || "Video"} {result.date && `• ${new Date(result.date * 1000).toLocaleDateString()}`}
                  </div>
                  <p className="text-[13px] text-[var(--foreground)] opacity-70 line-clamp-2 leading-relaxed">
                    {result.description}
                  </p>
                </div>
              </article>
            ))}
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

export default function VideosPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VideosContent />
    </Suspense>
  );
}
