"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, ArrowLeft, ArrowRight } from "lucide-react";
import SearchHeader from "../components/SearchHeader";
import BackToTop from "../components/BackToTop";

interface VideoResult {
  title: string; description?: string; url: string; author?: { name: string }; date?: number; duration?: number; thumb?: { url?: string };
}

function VideosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("s") || "";
  const page = searchParams.get("p") || "1";
  const [results, setResults] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [npt, setNpt] = useState<string | null>(null);
  const [prevNpts, setPrevNpts] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isNavigating, setIsNavigating] = useState(false);
  const getCookie = (name: string) => {
    if (typeof document === "undefined") return null;
    const m = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith(`${name}=`));
    return m ? decodeURIComponent(m.split("=")[1]) : null;
  };
  const [scraper] = useState(getCookie("scraper_videos") || "yt");

  useEffect(() => {
    if (!query) return;
    const fetchVideos = async () => {
      setLoading(true);
      try {
        let url = `/api/videos?s=${encodeURIComponent(query)}&scraper=${scraper}`;
        const n = searchParams.get("npt");
        if (n) url += `&npt=${encodeURIComponent(n)}`; else url += `&p=${page}`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.video || []);
        const nptFromUrl = searchParams.get("npt");
        if (nptFromUrl && !prevNpts.includes(nptFromUrl)) {
          setPrevNpts(p => [...p, nptFromUrl]);
          setCurrentPage(p => p + 1);
        } else if (!nptFromUrl) { setPrevNpts([]); setCurrentPage(1); }
        setNpt(data.npt || null);
      } catch { setResults([]); } finally { setLoading(false); }
    };
    fetchVideos();
  }, [query, scraper, page, searchParams]);

  const handleNextPage = () => {
    if (!npt || isNavigating) return;
    setIsNavigating(true);
    const p = new URLSearchParams(searchParams.toString());
    p.delete("p"); p.set("npt", npt);
    router.push(`/videos?${p.toString()}`);
    window.scrollTo({ top: 0, behavior: "instant" });
    setTimeout(() => setIsNavigating(false), 200);
  };

  const handlePreviousPage = () => {
    if (prevNpts.length === 0 || isNavigating) return;
    setIsNavigating(true);
    const p = new URLSearchParams(searchParams.toString());
    p.delete("p");
    if (prevNpts.length === 1) { p.delete("npt"); setPrevNpts([]); setCurrentPage(1); }
    else {
      const n = [...prevNpts]; n.pop();
      p.set("npt", n[n.length - 1]);
      setPrevNpts(n);
      setCurrentPage(c => c - 1);
    }
    router.push(`/videos?${p.toString()}`);
    window.scrollTo({ top: 0, behavior: "instant" });
    setTimeout(() => setIsNavigating(false), 200);
  };

  const fmtDur = (s?: number) => {
    if (!s) return "";
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return [h > 0 ? h : null, m, sec].filter(x => x !== null).map(x => x!.toString().padStart(2, "0")).join(":").replace(/^0/, "");
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <SearchHeader />

      <div className="max-w-[var(--container)] mx-auto px-4 py-5">
        <div className="min-w-0 max-w-2xl">
        {loading ? (
          <div className="space-y-7">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-48 aspect-video skeleton rounded-[var(--radius-sm)] shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                  <div className="skeleton h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="py-20 text-center text-[var(--meta)]">
            <p className="text-lg font-medium text-[var(--fg)] mb-1">No videos for &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          <div className="space-y-6">
            {results.map((result, i) => {
              const thumbUrl = typeof result.thumb === "string" ? result.thumb : result.thumb?.url || "";
              const proxied = thumbUrl ? `/api/proxy?i=${encodeURIComponent(thumbUrl)}&s=landscape` : null;
              const authorName = result.author?.name || result.author || result.source || "Video";
              const durationNum = typeof result.duration === "number" ? result.duration : 0;
              return (
                <article key={i} className="group flex gap-4">
                  <a href={result.url} target="_blank" rel="noopener noreferrer" className="relative w-48 aspect-video shrink-0 bg-black/30 border border-[var(--border)] rounded-[var(--radius-sm)] overflow-hidden">
                    {proxied ? <img src={proxied} alt="" className="size-full object-cover" loading="lazy" /> : <div className="flex items-center justify-center h-full"><Search size={20} className="text-[var(--meta)]" /></div>}
                    {durationNum > 0 ? <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded-[2px]">{fmtDur(durationNum)}</div> : null}
                  </a>
                  <div className="flex-1 min-w-0">
                    <a href={result.url} target="_blank" rel="noopener noreferrer" className="block mb-0.5">
                      <h2 className="text-[15px] font-medium text-[var(--fg)] leading-snug line-clamp-2 group-hover:text-[var(--accent-hover)]">{result.title}</h2>
                    </a>
                    <div className="text-[11px] text-[var(--meta)] mb-1.5">
                      {authorName} {result.date ? `\u00b7 ${new Date(result.date * 1000).toLocaleDateString()}` : ""}
                    </div>
                    <p className="text-[12px] text-[var(--fg-2)] leading-relaxed line-clamp-2">{result.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}

          {!loading && results.length > 0 && (
            <div className="mt-8 flex items-center gap-4 pb-8">
              <button onClick={handlePreviousPage} disabled={prevNpts.length === 0 || isNavigating} className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-[13px] font-medium hover:bg-white/[0.03] disabled:opacity-25 disabled:pointer-events-none transition-colors" aria-label="Previous page">
                <ArrowLeft size={14} /> Prev
              </button>
              <span className="text-[12px] font-medium text-[var(--meta)]">Page {currentPage}</span>
              <button onClick={handleNextPage} disabled={!npt || isNavigating} className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-[13px] font-medium hover:bg-white/[0.03] disabled:opacity-25 disabled:pointer-events-none transition-colors" aria-label="Next page">
                Next <ArrowRight size={14} />
              </button>
            </div>
          )}
      </div>
      </div>

      <BackToTop />
    </main>
  );
}

export default function VideosPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[var(--bg)]" />}><VideosContent /></Suspense>;
}
