"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import SearchHeader from "../components/SearchHeader";
import BackToTop from "../components/BackToTop";

interface WebResult { title: string; description: string; url: string; favicon?: string; }
interface ApiResponse { web?: WebResult[]; related?: string[]; npt?: string; status?: string; }

const SCRAPERS = [
  { value: "brave", label: "Brave" }, { value: "ddg", label: "DuckDuckGo" },
];

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;
  const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(pattern);
  return parts.map((part, i) => {
    const isMatch = terms.some(t => part.toLowerCase() === t.toLowerCase());
    return isMatch ? <mark key={i}>{part}</mark> : part;
  });
}

function SkeletonBlock() {
  return (
    <div className="space-y-2 py-1">
      <div className="skeleton h-3 w-48" />
      <div className="skeleton h-5 w-[90%]" />
      <div className="space-y-1.5">
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-4/5" />
      </div>
    </div>
  );
}

function getFavicon(url: string) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16`; } catch { return null; }
}

function formatUrl(url: string) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") + (u.pathname.length > 1 ? u.pathname.substring(0, 60) + (u.pathname.length > 60 ? "..." : "") : "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").substring(0, 60);
  }
}

export default function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("s") || "";
  const queryScraper = searchParams.get("scraper");
  const page = searchParams.get("p") || "1";

  const [scraper, setScraper] = useState(queryScraper || "brave");
  const [results, setResults] = useState<WebResult[]>([]);
  const [related, setRelated] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeTaken, setTimeTaken] = useState(0);
  const [npt, setNpt] = useState<string | null>(null);
  const [previousNpts, setPreviousNpts] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isNavigating, setIsNavigating] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query) { router.push("/"); return; }

    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      const start = Date.now();
      try {
        let url = `/api/search?q=${encodeURIComponent(query)}&scraper=${encodeURIComponent(scraper)}`;
        const nptParam = searchParams.get("npt");
        if (nptParam) url += `&npt=${encodeURIComponent(nptParam)}`;
        else url += `&p=${page}`;
        const res = await fetch(url);
        const data: ApiResponse = await res.json();
        setTimeTaken((Date.now() - start) / 1000);
        if (data.status && data.status !== "ok") { setError(data.status); setResults([]); }
        else {
          setResults(data.web || []);
          setRelated(data.related || []);
          const nptFromUrl = searchParams.get("npt");
          if (nptFromUrl && !previousNpts.includes(nptFromUrl)) {
            setPreviousNpts(p => [...p, nptFromUrl]);
            setCurrentPage(p => p + 1);
          } else if (!nptFromUrl) { setPreviousNpts([]); setCurrentPage(1); }
          setNpt(data.npt || null);
        }
      } catch { setError("Failed to fetch results."); }
      finally { setLoading(false); }
    };
    fetchResults();

    // Fetch search suggestions for fallback when no related results
    if (query) {
      fetch(`/api/autocomplete?s=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(data => {
          const items = data.suggestions || (Array.isArray(data) && data[1]) || [];
          setSuggestions(items.filter((s: string) => s.toLowerCase() !== query.toLowerCase()).slice(0, 6));
        })
        .catch(() => setSuggestions([]));
    }
  }, [query, scraper, page, searchParams]);

  const handleNextPage = () => {
    if (!npt || isNavigating) return;
    setIsNavigating(true);
    const p = new URLSearchParams(searchParams.toString());
    p.delete("p"); p.set("npt", npt);
    router.push(`/search?${p.toString()}`);
    window.scrollTo({ top: 0, behavior: "instant" });
    setTimeout(() => setIsNavigating(false), 200);
  };

  const handlePreviousPage = () => {
    if (previousNpts.length === 0 || isNavigating) return;
    setIsNavigating(true);
    const p = new URLSearchParams(searchParams.toString());
    p.delete("p");
    if (previousNpts.length === 1) { p.delete("npt"); setPreviousNpts([]); setCurrentPage(1); }
    else {
      const n = [...previousNpts]; n.pop();
      const prev = n[n.length - 1];
      p.set("npt", prev);
      setPreviousNpts(n);
      setCurrentPage(c => c - 1);
    }
    router.push(`/search?${p.toString()}`);
    window.scrollTo({ top: 0, behavior: "instant" });
    setTimeout(() => setIsNavigating(false), 200);
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <SearchHeader />

      <div className="max-w-[var(--container)] mx-auto px-4 py-5">
        <div className="min-w-0 max-w-[var(--results-max)]" ref={resultsRef}>
          {/* Scraper selector + stats */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <select
                value={scraper}
                onChange={e => { setScraper(e.target.value); const p = new URLSearchParams(searchParams.toString()); p.set("scraper", e.target.value); p.delete("npt"); router.push(`/search?${p.toString()}`); }}
                className="appearance-none bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[12px] text-[var(--fg-2)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                aria-label="Search source"
              >
                {SCRAPERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              {!loading && results.length > 0 && (
                <span className="text-[12px] text-[var(--meta)]">{results.length} results ({timeTaken.toFixed(2)}s)</span>
              )}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="space-y-6">
              {[...Array(6)].map((_, i) => <SkeletonBlock key={i} />)}
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="py-16 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                {error}
              </div>
            </div>
          )}

          {/* No results */}
          {!loading && !error && results.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-lg font-medium text-[var(--fg)] mb-1.5">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-sm text-[var(--meta)]">Try different keywords or check your spelling.</p>
            </div>
          )}

          {/* Results — DDG-style list */}
          {!loading && results.length > 0 && (
            <div className="space-y-6">
              {results.map((result, i) => (
                <article key={i} className="group result-enter" style={{ animationDelay: `${i * 40}ms` }}>
                  {/* URL line — DDG signature green */}
                  <div className="flex items-center gap-2 mb-0.5">
                    {getFavicon(result.url) && (
                      <img src={getFavicon(result.url)!} alt="" className="size-4 rounded-sm" loading="lazy" />
                    )}
                    <span className="text-[12px] text-[var(--url-green)] truncate max-w-md">
                      {formatUrl(result.url)}
                    </span>
                  </div>
                  {/* Title — purple accent like DDG uses blue */}
                  <a href={result.url} target="_blank" rel="noopener noreferrer" className="block mb-0.5 group/link">
                    <h2 className="text-[16px] font-medium text-[var(--accent)] leading-snug group-hover/link:underline decoration-1 underline-offset-2">
                      {highlightText(result.title, query)}
                    </h2>
                  </a>
                  {/* Description */}
                  {result.description && (
                    <p className="text-[13.5px] text-[var(--fg-2)] leading-relaxed">
                      {highlightText(result.description, query)}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}

          {/* Related searches */}
          {related.length > 0 && !loading && (
            <div className="mt-12 pt-6 border-t border-[var(--border)]">
              <h3 className="text-[11px] font-semibold text-[var(--meta)] uppercase tracking-widest mb-3">Related searches</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {related.map((term, i) => (
                  <a
                    key={i}
                    href={`/search?s=${encodeURIComponent(term)}`}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] hover:bg-white/[0.03] hover:border-[var(--border-accent)] transition-all duration-150"
                  >
                    <Search size={12} className="text-[var(--meta)] shrink-0" />
                    <span className="text-[13px] font-medium text-[var(--fg-2)]">{term}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Search suggestions fallback */}
          {related.length === 0 && suggestions.length > 0 && !loading && (
            <div className="mt-12 pt-6 border-t border-[var(--border)]">
              <h3 className="text-[11px] font-semibold text-[var(--meta)] uppercase tracking-widest mb-3">Suggestions</h3>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((term, i) => (
                  <a
                    key={i}
                    href={`/search?s=${encodeURIComponent(term)}&scraper=${scraper}`}
                    className="px-3 py-1.5 rounded-full border border-[var(--border)] text-[13px] text-[var(--fg-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all duration-150"
                  >
                    {term}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Pagination — DDG-style with orange accent */}
          {!loading && results.length > 0 && (
            <div className="mt-12 flex items-center justify-center gap-4 pb-10">
              <button
                onClick={handlePreviousPage}
                disabled={previousNpts.length === 0 || isNavigating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-[13px] font-medium text-[var(--fg-2)] hover:bg-white/[0.03] hover:border-[var(--border-accent)] disabled:opacity-25 disabled:pointer-events-none transition-all duration-150"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} /> Prev
              </button>

              <div className="flex items-center gap-2">
                {/* Page indicator — DDG-style orange */}
                <span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-[var(--radius-sm)] bg-[var(--pagination-orange)]/15 text-[var(--pagination-orange)] text-[13px] font-bold px-2">
                  {currentPage}
                </span>
                {npt && (
                  <span className="text-[12px] text-[var(--meta)]">&middot; more pages</span>
                )}
              </div>

              <button
                onClick={handleNextPage}
                disabled={!npt || isNavigating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-[13px] font-medium text-[var(--fg-2)] hover:bg-white/[0.03] hover:border-[var(--border-accent)] disabled:opacity-25 disabled:pointer-events-none transition-all duration-150"
                aria-label="Next page"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <BackToTop />
    </main>
  );
}
