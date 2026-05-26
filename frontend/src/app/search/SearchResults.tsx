"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search, ArrowLeft, ArrowRight } from "lucide-react";
import SearchHeader from "../components/SearchHeader";
import BackToTop from "../components/BackToTop";

interface WebResult { title: string; description: string; url: string; favicon?: string; }
interface VideoResult { title: string; description?: string; url: string; thumb?: { url: string }; date?: string; views?: string; author?: { name: string; url: string }; }
interface ApiResponse { web?: WebResult[]; video?: VideoResult[]; related?: string[]; npt?: string; status?: string; }

const SCRAPERS = [
  { value: "brave", label: "Brave" }, { value: "ddg", label: "DuckDuckGo" },
  { value: "google", label: "Google" }, { value: "yandex", label: "Yandex" },
  { value: "qwant", label: "Qwant" }, { value: "startpage", label: "Startpage" },
];

function SkeletonBlock() {
  return (
    <div className="space-y-3">
      <div className="skeleton h-3 w-48" />
      <div className="skeleton h-5 w-3/4" />
      <div className="space-y-2">
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-5/6" />
      </div>
    </div>
  );
}

function getFavicon(url: string) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16`; } catch { return null; }
}

export default function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("s") || "";
  const queryScraper = searchParams.get("scraper");
  const page = searchParams.get("p") || "1";

  const [scraper, setScraper] = useState(queryScraper || "ddg");
  const [results, setResults] = useState<WebResult[]>([]);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [related, setRelated] = useState<string[]>([]);
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
        if (data.status && !data.web) { setError(data.status); setResults([]); }
        else {
          setResults(data.web || []);
          setVideos(data.video || []);
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

      <div className="max-w-[var(--container)] mx-auto px-4 py-5 flex gap-10">
        <div className="flex-1 min-w-0 max-w-2xl" ref={resultsRef}>
          {/* Scraper selector + stats */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <select
                value={scraper}
                onChange={e => { setScraper(e.target.value); const p = new URLSearchParams(searchParams.toString()); p.set("scraper", e.target.value); p.delete("npt"); router.push(`/search?${p.toString()}`); }}
                className="appearance-none bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[12px] text-[var(--fg-2)] focus:outline-none focus:border-[var(--accent)] cursor-pointer" aria-label="Search source"
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
            <div className="space-y-7">
              {[...Array(6)].map((_, i) => <SkeletonBlock key={i} />)}
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="py-12 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">{error}</div>
            </div>
          )}

          {/* No results */}
          {!loading && !error && results.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-lg font-medium text-[var(--fg)] mb-1">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-sm text-[var(--meta)]">Try different keywords or check your spelling.</p>
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <div className="space-y-7">
              {results.map((result, i) => (
                <article key={i} className="group">
                  <div className="flex items-center gap-2 mb-0.5">
                    {getFavicon(result.url) && <img src={getFavicon(result.url)!} alt="" className="size-4 rounded-sm" loading="lazy" />}
                    <span className="text-[12px] text-[var(--success)] truncate max-w-sm">{result.url}</span>
                  </div>
                  <a href={result.url} target="_blank" rel="noopener noreferrer" className="block mb-0.5 group/link">
                    <h2 className="text-[17px] font-medium text-[var(--accent-hover)] leading-snug group-hover/link:underline decoration-1 underline-offset-2">
                      {result.title}
                    </h2>
                  </a>
                  <p className="text-[14px] text-[var(--fg-2)] leading-relaxed">{result.description}</p>
                </article>
              ))}
            </div>
          )}

          {/* Related */}
          {related.length > 0 && !loading && (
            <div className="mt-10 pt-6 border-t border-[var(--border)]">
              <h3 className="text-[12px] font-semibold text-[var(--meta)] uppercase tracking-wider mb-3">Related</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {related.map((term, i) => (
                  <a key={i} href={`/search?s=${encodeURIComponent(term)}`} className="flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] hover:bg-white/[0.03] transition-colors">
                    <Search size={12} className="text-[var(--meta)]" />
                    <span className="text-[13px] font-medium text-[var(--fg-2)]">{term}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {!loading && results.length > 0 && (
            <div className="mt-10 flex items-center gap-4 pb-8">
              <button onClick={handlePreviousPage} disabled={previousNpts.length === 0 || isNavigating} className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-[13px] font-medium hover:bg-white/[0.03] disabled:opacity-25 disabled:pointer-events-none transition-colors" aria-label="Previous page">
                <ArrowLeft size={14} /> Prev
              </button>
              <span className="text-[12px] font-medium text-[var(--meta)]">Page {currentPage}</span>
              <button onClick={handleNextPage} disabled={!npt || isNavigating} className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-[13px] font-medium hover:bg-white/[0.03] disabled:opacity-25 disabled:pointer-events-none transition-colors" aria-label="Next page">
                Next <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

          {/* Videos inline (left column like normal search) */}
          {videos.length > 0 && !loading && (
            <div className="mt-10 pt-6 border-t border-[var(--border)]">
              <h3 className="text-[12px] font-semibold text-[var(--meta)] uppercase tracking-wider mb-4">Videos</h3>
              <div className="space-y-5">
                {videos.slice(0, 4).map((video, i) => {
                  const thumbUrl = video.thumb?.url;
                  const proxied = thumbUrl ? `/api/proxy?i=${encodeURIComponent(thumbUrl)}&s=landscape` : null;
                  return (
                    <article key={i} className="group flex gap-4">
                      <a href={video.url} target="_blank" rel="noopener noreferrer" className="relative w-48 aspect-video shrink-0 bg-black/30 border border-[var(--border)] rounded-[var(--radius-sm)] overflow-hidden">
                        {proxied ? <img src={proxied} alt="" className="size-full object-cover" loading="lazy" /> : <div className="flex items-center justify-center h-full"><Search size={20} className="text-[var(--meta)]" /></div>}
                        {video.views && <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded-[2px]">{video.views}</div>}
                      </a>
                      <div className="flex-1 min-w-0">
                        <a href={video.url} target="_blank" rel="noopener noreferrer" className="block mb-0.5">
                          <h2 className="text-[15px] font-medium text-[var(--fg)] leading-snug line-clamp-2 group-hover:text-[var(--accent-hover)]">{video.title}</h2>
                        </a>
                        <div className="text-[11px] text-[var(--meta)] mb-1.5">
                          {video.author?.name || "Video"} {video.date ? `\u00b7 ${new Date(Number(video.date) * 1000).toLocaleDateString()}` : ""}
                        </div>
                        <p className="text-[12px] text-[var(--fg-2)] leading-relaxed line-clamp-2">{video.description}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
      </div>

      <BackToTop />
    </main>
  );
}
