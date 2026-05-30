"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ArrowLeft, ArrowRight, X, ExternalLink, Maximize2, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
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
  const [imgLoaded, setImgLoaded] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const getCookie = (name: string) => {
    if (typeof document === "undefined") return null;
    const m = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith(`${name}=`));
    return m ? decodeURIComponent(m.split("=")[1]) : null;
  };
  const [scraper, setScraper] = useState(getCookie("scraper_images") || "brave");

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

  const nextImage = useCallback(() => { if (selectedIdx !== null && selectedIdx < results.length - 1) { setSelectedIdx(selectedIdx + 1); setImgLoaded(false); setZoomed(false); } }, [selectedIdx, results.length]);
  const prevImage = useCallback(() => { if (selectedIdx !== null && selectedIdx > 0) { setSelectedIdx(selectedIdx - 1); setImgLoaded(false); setZoomed(false); } }, [selectedIdx]);
  const closePreview = useCallback(() => { setSelectedIdx(null); setImgLoaded(false); setZoomed(false); document.body.style.overflow = "auto"; }, []);

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

  useEffect(() => {
    if (selectedIdx !== null) {
      document.body.style.overflow = "hidden";
      const el = filmstripRef.current?.children[selectedIdx] as HTMLElement | undefined;
      el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedIdx]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 60) {
      if (diff > 0) nextImage();
      else prevImage();
    }
  };

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

  const download = useCallback(() => {
    if (!selected) return;
    const a = document.createElement("a");
    a.href = `/api/proxy?i=${encodeURIComponent(selected.source[0]?.url)}`;
    a.download = `image-${Date.now()}.jpg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, [selected]);

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
            <div className="flex items-center gap-2 mb-4">
              <label className="text-[12px] text-[var(--meta)]">Scraper:</label>
              <select
                value={scraper}
                onChange={e => {
                  setScraper(e.target.value);
                  document.cookie = `scraper_images=${e.target.value};path=/;max-age=31536000`;
                  const p = new URLSearchParams(searchParams.toString());
                  p.set("scraper", e.target.value);
                  p.delete("npt");
                  router.push(`/images?${p.toString()}`);
                }}
                className="appearance-none bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[12px] text-[var(--fg-2)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
              >
                <option value="brave">Brave</option>
                <option value="ddg">DuckDuckGo</option>
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {results.map((result, i) => {
                const thumbUrl = result.source?.length > 0 ? result.source[result.source.length - 1].url : "";
                const proxied = thumbUrl ? `/api/proxy?i=${encodeURIComponent(thumbUrl)}&s=thumb` : "";
                return (
                  <div key={i} onClick={() => { setSelectedIdx(i); setImgLoaded(false); setZoomed(false); document.body.style.overflow = "hidden"; }}
                    className="group relative aspect-square bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] overflow-hidden cursor-pointer transition-all hover:border-[var(--accent)] hover:shadow-[0_0_0_1px_var(--accent)]"
                  >
                    {proxied && <img src={proxied} alt={result.title || ""} className="size-full object-cover" loading="lazy" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end pointer-events-none">
                      {result.title && <p className="text-white text-[11px] font-medium line-clamp-2">{result.title}</p>}
                      <p className="text-white/50 text-[9px] truncate">{getDomain(result.url)}</p>
                    </div>
                    {result.source?.[0]?.width && (
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-black/60 text-white/80 text-[9px] font-medium rounded-[3px] backdrop-blur-sm">
                        {result.source[0].width}&times;{result.source[0].height}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {results.length > 0 && (
              <div className="mt-8 flex items-center justify-center gap-4 pb-8">
                <button onClick={handlePrev} disabled={prevNpts.length === 0 || isNavigating} className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-[13px] font-medium text-[var(--fg-2)] hover:bg-white/[0.03] hover:border-[var(--border-accent)] disabled:opacity-25 disabled:pointer-events-none transition-all duration-150"><ChevronLeft size={14} /> Prev</button>
                <span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-[var(--radius-sm)] bg-[var(--pagination-orange)]/15 text-[var(--pagination-orange)] text-[13px] font-bold px-2">{currentPage}</span>
                <button onClick={handleNext} disabled={!npt || isNavigating} className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-[13px] font-medium text-[var(--fg-2)] hover:bg-white/[0.03] hover:border-[var(--border-accent)] disabled:opacity-25 disabled:pointer-events-none transition-all duration-150">Next <ChevronRight size={14} /></button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95 animate-in"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={closePreview}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top bar */}
          <div className="relative z-10 flex items-center justify-between px-4 py-3 shrink-0">
            <button onClick={e => { e.stopPropagation(); closePreview(); }} className="p-2 -ml-1 text-white/80 hover:text-white transition-colors" aria-label="Close">
              <X size={22} />
            </button>
            <span className="text-[13px] font-medium text-white/60 tabular-nums">
              {selectedIdx! + 1} / {results.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={e => { e.stopPropagation(); setZoomed(!zoomed); }} className="p-2 text-white/80 hover:text-white transition-colors" aria-label={zoomed ? "Zoom out" : "Zoom in"}>
                {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
              </button>
              <button onClick={e => { e.stopPropagation(); download(); }} className="p-2 text-white/80 hover:text-white transition-colors" aria-label="Download">
                <Download size={18} />
              </button>
            </div>
          </div>

          {/* Navigation arrows */}
          <button onClick={e => { e.stopPropagation(); prevImage(); }} disabled={selectedIdx === 0}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-black/40 hover:bg-black/70 text-white/80 hover:text-white rounded-full transition-all disabled:opacity-0 disabled:pointer-events-none hidden sm:block"
          >
            <ChevronLeft size={26} />
          </button>
          <button onClick={e => { e.stopPropagation(); nextImage(); }} disabled={selectedIdx === results.length - 1}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-black/40 hover:bg-black/70 text-white/80 hover:text-white rounded-full transition-all disabled:opacity-0 disabled:pointer-events-none hidden sm:block"
          >
            <ChevronRight size={26} />
          </button>

          {/* Mobile tap zones */}
          <div className="absolute inset-y-0 left-0 w-1/4 z-10 sm:hidden" onClick={e => { e.stopPropagation(); prevImage(); }} />
          <div className="absolute inset-y-0 right-0 w-1/4 z-10 sm:hidden" onClick={e => { e.stopPropagation(); nextImage(); }} />

          {/* Image area */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden relative"
            onClick={e => e.stopPropagation()}
          >
            <div className={`relative transition-all duration-300 ${zoomed ? "overflow-auto cursor-zoom-out" : "overflow-hidden cursor-zoom-in"}`}>
              {!imgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="size-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                </div>
              )}
              <img
                key={selected.source[0]?.url}
                src={`/api/proxy?i=${encodeURIComponent(selected.source[0]?.url)}`}
                alt={selected.title || ""}
                onLoad={() => setImgLoaded(true)}
                className={`transition-all duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"} ${zoomed ? "max-w-none" : "max-h-[calc(100dvh-13rem)] max-w-full"} object-contain`}
              />
            </div>
          </div>

          {/* Filmstrip */}
          <div className="shrink-0 bg-black/60 border-t border-white/5" onClick={e => e.stopPropagation()}>
            <div ref={filmstripRef} className="flex gap-1.5 overflow-x-auto px-4 py-3 scrollbar-thin" style={{ scrollbarWidth: "thin" }}>
              {results.map((result, i) => {
                const thumbUrl = result.source?.length > 0 ? result.source[result.source.length - 1].url : "";
                const proxied = thumbUrl ? `/api/proxy?i=${encodeURIComponent(thumbUrl)}&s=thumb` : "";
                return (
                  <button key={i} onClick={() => { setSelectedIdx(i); setImgLoaded(false); setZoomed(false); }}
                    className={`size-14 shrink-0 rounded-[var(--radius-sm)] overflow-hidden border-2 transition-all ${i === selectedIdx ? "border-white opacity-100 scale-105" : "border-transparent opacity-50 hover:opacity-80"}`}
                  >
                    {proxied && <img src={proxied} alt="" className="size-full object-cover" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info bar */}
          <div className="shrink-0 bg-black/80 border-t border-white/5 px-4 py-2.5 flex items-center gap-3 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex-1 min-w-0">
              {selected.title && <p className="text-white text-[12px] font-medium truncate">{selected.title}</p>}
              <div className="flex items-center gap-2 text-[11px] text-white/50">
                <span className="truncate">{getDomain(selected.url)}</span>
                {selected.source[0]?.width && (
                  <span className="shrink-0">{selected.source[0].width}&times;{selected.source[0].height}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <a href={selected.source[0]?.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-[11px] font-medium transition-colors"
              >
                <Maximize2 size={12} /> View
              </a>
              <a href={selected.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-[11px] font-medium transition-colors"
              >
                <ExternalLink size={12} /> Site
              </a>
            </div>
          </div>
        </div>
      )}

      <BackToTop />
    </main>
  );
}

export default function ImagesPage() {
  return (
    <>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}.animate-in{animation:fadeIn .15s ease-out}`}</style>
      <Suspense fallback={<div className="min-h-screen bg-[var(--bg)]" />}>
        <ImageGrid />
      </Suspense>
    </>
  );
}
