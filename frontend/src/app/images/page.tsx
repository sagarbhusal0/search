"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ArrowLeft, ArrowRight, X, ExternalLink, Maximize2, Download, ChevronLeft, ChevronRight } from "lucide-react";
import SearchHeader from "../components/SearchHeader";
import BackToTop from "../components/BackToTop";

interface ImageSource { url: string; width?: number; height?: number; }
interface ImageResult { title?: string; url: string; source: ImageSource[]; }

function ImageGrid() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("s") || "";
  const page = searchParams.get("p") || "1";
  const [results, setResults] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [npt, setNpt] = useState<string | null>(null);
  const [prevNpts, setPrevNpts] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isNavigating, setIsNavigating] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const getCookie = (name: string) => {
    if (typeof document === "undefined") return null;
    const m = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith(`${name}=`));
    return m ? decodeURIComponent(m.split("=")[1]) : null;
  };
  const [scraper] = useState(getCookie("scraper_images") || "ddg");

  useEffect(() => {
    if (!query) return;
    const fetchImages = async () => {
      setLoading(true);
      try {
        let url = `/api/images?s=${encodeURIComponent(query)}&scraper=${scraper}`;
        const n = searchParams.get("npt");
        if (n) url += `&npt=${encodeURIComponent(n)}`;
        else url += `&p=${page}`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.image || []);
        const nptFromUrl = searchParams.get("npt");
        if (nptFromUrl && !prevNpts.includes(nptFromUrl)) { setPrevNpts(p => [...p, nptFromUrl]); setCurrentPage(p => p + 1); }
        else if (!nptFromUrl) { setPrevNpts([]); setCurrentPage(1); }
        setNpt(data.npt || null);
      } catch { setResults([]); } finally { setLoading(false); }
    };
    fetchImages();
  }, [query, scraper, page, searchParams]);

  const nextImage = useCallback(() => { if (selectedIdx !== null && selectedIdx < results.length - 1) setSelectedIdx(selectedIdx + 1); }, [selectedIdx, results.length]);
  const prevImage = useCallback(() => { if (selectedIdx !== null && selectedIdx > 0) setSelectedIdx(selectedIdx - 1); }, [selectedIdx]);
  const closePreview = useCallback(() => { setSelectedIdx(null); document.body.style.overflow = "auto"; }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (selectedIdx === null) return;
      if (e.key === "ArrowRight") nextImage();
      else if (e.key === "ArrowLeft") prevImage();
      else if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIdx, nextImage, prevImage, closePreview]);

  const getDomain = (u: string) => { try { return new URL(u).hostname; } catch { return u; } };
  const selected = selectedIdx !== null ? results[selectedIdx] : null;

  const handleNext = () => {
    if (!npt || isNavigating) return;
    setIsNavigating(true);
    const p = new URLSearchParams(searchParams.toString());
    p.delete("p"); p.set("npt", npt);
    router.push(`/images?${p.toString()}`);
    window.scrollTo({ top: 0, behavior: "instant" });
    setTimeout(() => setIsNavigating(false), 200);
  };

  const handlePrev = () => {
    if (prevNpts.length === 0 || isNavigating) return;
    setIsNavigating(true);
    const p = new URLSearchParams(searchParams.toString());
    p.delete("p");
    if (prevNpts.length === 1) { p.delete("npt"); setPrevNpts([]); setCurrentPage(1); }
    else { const n = [...prevNpts]; n.pop(); p.set("npt", n[n.length - 1]); setPrevNpts(n); setCurrentPage(c => c - 1); }
    router.push(`/images?${p.toString()}`);
    window.scrollTo({ top: 0, behavior: "instant" });
    setTimeout(() => setIsNavigating(false), 200);
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <SearchHeader />

      <div className="max-w-[var(--container)] mx-auto px-3 py-5">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[...Array(20)].map((_, i) => <div key={i} className="aspect-square skeleton rounded-[var(--radius-sm)]" />)}
          </div>
        ) : results.length === 0 ? (
          <div className="py-20 text-center text-[var(--meta)]">
            <p className="text-lg font-medium text-[var(--fg)] mb-1">No images for &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {results.map((result, i) => {
                const thumbUrl = result.source?.length > 0 ? result.source[result.source.length - 1].url : "";
                const proxied = thumbUrl ? `/api/proxy?i=${encodeURIComponent(thumbUrl)}&s=thumb` : "";
                return (
                  <div key={i} onClick={() => { setSelectedIdx(i); document.body.style.overflow = "hidden"; }}
                    className="group relative aspect-square bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] overflow-hidden cursor-pointer transition-all hover:border-[var(--accent)] hover:shadow-[0_0_0_1px_var(--accent)]"
                  >
                    {proxied && <img src={proxied} alt={result.title || ""} className="size-full object-cover" loading="lazy" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end pointer-events-none">
                      {result.title && <p className="text-white text-[11px] font-medium line-clamp-2">{result.title}</p>}
                      <p className="text-white/50 text-[9px] truncate">{getDomain(result.url)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {results.length > 0 && (
              <div className="mt-8 flex items-center justify-center gap-4 pb-8">
                <button onClick={handlePrev} disabled={prevNpts.length === 0 || isNavigating} className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-[13px] font-medium hover:bg-white/[0.03] disabled:opacity-25 disabled:pointer-events-none"><ArrowLeft size={14} /> Prev</button>
                <span className="text-[12px] font-medium text-[var(--meta)]">{currentPage}</span>
                <button onClick={handleNext} disabled={!npt || isNavigating} className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-[13px] font-medium hover:bg-white/[0.03] disabled:opacity-25 disabled:pointer-events-none">Next <ArrowRight size={14} /></button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {selected && (
        <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-black/95" role="dialog" aria-modal="true" aria-label="Image preview" onClick={closePreview}>
          <button onClick={e => { e.stopPropagation(); closePreview(); }} className="absolute top-3 right-3 z-[60] p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"><X size={22} /></button>

          <button onClick={e => { e.stopPropagation(); prevImage(); }} disabled={selectedIdx === 0} className="absolute left-3 top-1/2 -translate-y-1/2 z-[60] p-2.5 bg-black/30 hover:bg-black/60 text-white rounded-full transition-all disabled:opacity-0 disabled:pointer-events-none hidden md:block"><ChevronLeft size={28} /></button>
          <button onClick={e => { e.stopPropagation(); nextImage(); }} disabled={selectedIdx === results.length - 1} className="absolute right-3 top-1/2 -translate-y-1/2 z-[60] p-2.5 bg-black/30 hover:bg-black/60 text-white rounded-full transition-all disabled:opacity-0 disabled:pointer-events-none hidden md:block"><ChevronRight size={28} /></button>

          <div className="absolute inset-y-0 left-0 w-16 z-50 md:hidden" onClick={e => { e.stopPropagation(); prevImage(); }} />
          <div className="absolute inset-y-0 right-0 w-16 z-50 md:hidden" onClick={e => { e.stopPropagation(); nextImage(); }} />

          <div className="flex-1 flex items-center justify-center p-4 md:p-8 min-h-0" onClick={e => e.stopPropagation()}>
            <img key={selected.source[0]?.url} src={`/api/proxy?i=${encodeURIComponent(selected.source[0]?.url)}`} alt={selected.title} className="max-w-full max-h-full object-contain" />
          </div>

          <div className="w-full md:w-80 bg-[var(--surface)] border-l border-[var(--border)] flex flex-col overflow-y-auto max-h-[35vh] md:max-h-full" onClick={e => e.stopPropagation()}>
            <div className="p-4 space-y-4">
              {selected.title && <h2 className="text-base font-medium text-[var(--fg)] leading-snug">{selected.title}</h2>}
              <a href={selected.url} target="_blank" rel="noopener noreferrer" className="text-[13px] text-[var(--accent-hover)] hover:underline flex items-center gap-1.5 break-all"><ExternalLink size={13} />{getDomain(selected.url)}</a>
              <div className="grid grid-cols-2 gap-3">
                <a href={selected.source[0]?.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 p-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] hover:bg-white/[0.03] transition-colors">
                  <Maximize2 size={16} className="text-[var(--meta)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--meta)]">View</span>
                  {selected.source[0]?.width && <span className="text-[9px] text-[var(--meta)]">{selected.source[0].width}&times;{selected.source[0].height}</span>}
                </a>
                <a href={selected.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 p-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] hover:bg-white/[0.03] transition-colors">
                  <ExternalLink size={16} className="text-[var(--meta)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--meta)]">Site</span>
                </a>
              </div>
              <button onClick={() => { const a = document.createElement("a"); a.href = `/api/proxy?i=${encodeURIComponent(selected.source[0]?.url)}`; a.download = `image-${Date.now()}.jpg`; document.body.appendChild(a); a.click(); document.body.removeChild(a); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[13px] font-medium transition-colors"><Download size={15} /> Download</button>
            </div>
          </div>
        </div>
      )}

      <BackToTop />
    </main>
  );
}

export default function ImagesPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[var(--bg)]" />}><ImageGrid /></Suspense>;
}
