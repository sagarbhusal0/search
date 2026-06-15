"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, X, ExternalLink, Maximize2,
  Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  RotateCcw, RotateCw, Copy, Play, Pause, Loader2,
  Minus, Plus, Maximize
} from "lucide-react";
import SearchHeader from "../components/SearchHeader";
import BackToTop from "../components/BackToTop";

interface ImageSource { url: string; width?: number; height?: number; }
interface ImageResult { title?: string; url: string; source: ImageSource[]; }

/* ─── Image Grid (Masonry layout) ─── */

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
  const [zoom, setZoom] = useState<number | null>(null); // null = fit-to-screen, 1=100%, 1.5, 2, 3, 5
  const [rotation, setRotation] = useState(0);
  const [slideshowActive, setSlideshowActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [preloaded, setPreloaded] = useState<Set<string>>(new Set());
  const filmstripRef = useRef<HTMLDivElement>(null);
  const slideshowRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const pinchDist = useRef(0);

  /* ── Zoom levels (null = fit to screen) ── */
  const zoomLevels: (number | null)[] = [null, 1, 1.5, 2, 3, 5];
  const zoomIn = useCallback(() => {
    const current = zoom ?? 0.5;
    const next = zoomLevels.find(z => z !== null && z > current);
    if (next) setZoom(next);
    else setZoom(5);
  }, [zoom]);
  const zoomOut = useCallback(() => {
    if (zoom === null) return;
    const prev = [...zoomLevels].reverse().find(z => (z === null ? 0.5 : z) < zoom);
    if (prev === undefined) setZoom(null);
    else setZoom(prev);
  }, [zoom]);
  const resetZoom = useCallback(() => setZoom(null), []);
  const toggleFitZoom = useCallback(() => { setZoom(z => z === null ? 1 : null); }, []);

  const getCookie = (name: string) => {
    if (typeof document === "undefined") return null;
    const m = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith(`${name}=`));
    return m ? decodeURIComponent(m.split("=")[1]) : null;
  };
  const [scraper] = useState(getCookie("scraper_images") || "ddg");

  /* ── Fetch results ── */
  useEffect(() => {
    if (!query) return;
    const fetchImages = async () => {
      setLoading(true);
      setPreloaded(new Set());
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

  /* ── Preload adjacent images ── */
  useEffect(() => {
    if (selectedIdx === null || results.length === 0) return;
    const indices = new Set<number>();
    for (let d = 1; d <= 2; d++) {
      if (selectedIdx - d >= 0) indices.add(selectedIdx - d);
      if (selectedIdx + d < results.length) indices.add(selectedIdx + d);
    }
    indices.forEach(i => {
      const url = results[i].source?.[0]?.url;
      if (url && !preloaded.has(url)) {
        const img = new Image();
        img.src = `/api/proxy?i=${encodeURIComponent(url)}`;
        setPreloaded(p => new Set(p).add(url));
      }
    });
  }, [selectedIdx, results, preloaded]);

  /* ── Slideshow ── */
  useEffect(() => {
    if (slideshowActive && selectedIdx !== null) {
      slideshowRef.current = setInterval(() => {
        setSelectedIdx(prev => {
          if (prev === null || prev >= results.length - 1) {
            setSlideshowActive(false);
            return prev;
          }
          setImgLoaded(false);
          setZoom(null);
          setRotation(0);
          return prev + 1;
        });
      }, 3500);
    }
    return () => { if (slideshowRef.current) { clearInterval(slideshowRef.current); slideshowRef.current = null; } };
  }, [slideshowActive, results.length]);

  const nextImage = useCallback(() => {
    if (selectedIdx !== null && selectedIdx < results.length - 1) {
      setSelectedIdx(selectedIdx + 1); setImgLoaded(false); setZoom(null); setRotation(0);
    }
  }, [selectedIdx, results.length]);
  const prevImage = useCallback(() => {
    if (selectedIdx !== null && selectedIdx > 0) {
      setSelectedIdx(selectedIdx - 1); setImgLoaded(false); setZoom(null); setRotation(0);
    }
  }, [selectedIdx]);
  const closePreview = useCallback(() => {
    setSelectedIdx(null); setImgLoaded(false); setZoom(null); setRotation(0);
    setSlideshowActive(false); document.body.style.overflow = "auto";
  }, []);

  /* ── Keyboard ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (selectedIdx === null) return;
      if (e.key === "ArrowRight") nextImage();
      else if (e.key === "ArrowLeft") prevImage();
      else if (e.key === "Escape") closePreview();
      else if (e.key === "r") setRotation(r => (r + 90) % 360);
      else if (e.key === "R") setRotation(r => (r - 90 + 360) % 360);
      else if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-" || e.key === "_") zoomOut();
      else if (e.key === "0") resetZoom();
      else if (e.key === " " || e.key === "Spacebar") { e.preventDefault(); setSlideshowActive(s => !s); }
    };
    window.addEventListener("keydown", handler, { passive: true });
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIdx, nextImage, prevImage, closePreview, zoomIn, zoomOut, resetZoom]);

  /* ── Lock scroll & scroll filmstrip ── */
  useEffect(() => {
    if (selectedIdx !== null) {
      document.body.style.overflow = "hidden";
      const el = filmstripRef.current?.children[selectedIdx] as HTMLElement | undefined;
      el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedIdx]);

  /* ── Touch handlers ── */
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) pinchDist.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 60) {
      if (diff > 0) nextImage();
      else prevImage();
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const diff = d - pinchDist.current;
      if (Math.abs(diff) > 40) {
        if (diff > 0) zoomIn();
        else zoomOut();
        pinchDist.current = d;
      }
    }
  };

  const getDomain = (u: string) => { try { return new URL(u).hostname.replace("www.", ""); } catch { return u; } };
  const selected = selectedIdx !== null ? results[selectedIdx] : null;

  /* ── Copy image URL ── */
  const copyUrl = useCallback(() => {
    if (!selected) return;
    const url = window.location.origin + `/api/proxy?i=${encodeURIComponent(selected.source?.[0]?.url || "")}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [selected]);

  /* ── Download ── */
  const download = useCallback(() => {
    if (!selected) return;
    const a = document.createElement("a");
    a.href = `/api/proxy?i=${encodeURIComponent(selected.source[0]?.url)}`;
    a.download = `image-${Date.now()}.jpg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, [selected]);

  /* ── Pagination ── */
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
            <p className="text-sm">Try a different search term or scraper.</p>
          </div>
        ) : (
          <>
            {/* ─── Masonry grid ─── */}
            <div className="masonry-grid">
              {results.map((result, i) => {
                const thumbUrl = result.source?.length > 0 ? result.source[result.source.length - 1].url : "";
                const proxied = thumbUrl ? `/api/proxy?i=${encodeURIComponent(thumbUrl)}&s=thumb` : "";
                const isWide = result.source?.[0]?.width && result.source[0].height &&
                  (result.source[0].width / result.source[0].height) > 1.6;
                return (
                  <div key={i} onClick={() => { setSelectedIdx(i); setImgLoaded(false); setZoom(null); setRotation(0); document.body.style.overflow = "hidden"; }}
                    className="masonry-item group relative bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] overflow-hidden cursor-pointer transition-all duration-200 hover:border-[var(--accent)] hover:shadow-[0_0_0_1px_var(--accent)]"
                  >
                    {proxied && (
                      <img
                        src={proxied}
                        alt={result.title || ""}
                        className="w-full h-auto block"
                        loading="lazy"
                        style={{ aspectRatio: isWide ? "auto" : undefined }}
                      />
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2.5 flex flex-col justify-end pointer-events-none">
                      {result.title && <p className="text-white text-[11px] font-medium line-clamp-2 drop-shadow-sm">{result.title}</p>}
                      <p className="text-white/60 text-[9px] truncate drop-shadow-sm">{getDomain(result.url)}</p>
                    </div>
                    {/* Badge */}
                    {result.source?.[0]?.width && (
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-black/60 text-white/80 text-[9px] font-medium rounded-[3px] backdrop-blur-sm pointer-events-none">
                        {result.source[0].width}&times;{result.source[0].height}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ─── Pagination ─── */}
            {results.length > 0 && (
              <div className="mt-8 flex items-center justify-center gap-4 pb-8">
                <button onClick={handlePrev} disabled={prevNpts.length === 0 || isNavigating}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-[13px] font-medium hover:bg-white/[0.03] disabled:opacity-25 disabled:pointer-events-none transition-colors"
                ><ArrowLeft size={14} /> Prev</button>
                <span className="text-[12px] font-medium text-[var(--meta)] tabular-nums">{currentPage}</span>
                <button onClick={handleNext} disabled={!npt || isNavigating}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-[13px] font-medium hover:bg-white/[0.03] disabled:opacity-25 disabled:pointer-events-none transition-colors"
                >Next <ArrowRight size={14} /></button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══════════════════ LIGHTBOX ═══════════════════ */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95 animate-in"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onClick={closePreview}
        >
          {/* ── Top bar ── */}
          <div className="relative z-10 flex items-center justify-between px-3 sm:px-4 py-2.5 shrink-0 bg-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-1">
              <button onClick={e => { e.stopPropagation(); closePreview(); }}
                className="p-1.5 -ml-1 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors" aria-label="Close">
                <X size={20} />
              </button>
              <span className="text-[12px] font-medium text-white/50 tabular-nums ml-1 select-none">
                {selectedIdx! + 1} / {results.length}
              </span>
            </div>

            <div className="flex items-center gap-0.5">
              {/* Slideshow */}
              <button onClick={e => { e.stopPropagation(); setSlideshowActive(s => !s); }}
                className={`p-1.5 rounded-lg transition-colors ${slideshowActive ? "text-[var(--accent)] bg-white/10" : "text-white/70 hover:text-white hover:bg-white/10"}`}
                aria-label={slideshowActive ? "Stop slideshow" : "Start slideshow"}>
                {slideshowActive ? <Pause size={16} /> : <Play size={16} />}
              </button>
              {/* Rotate */}
              <button onClick={e => { e.stopPropagation(); setRotation(r => (r - 90 + 360) % 360); }}
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors" aria-label="Rotate left">
                <RotateCcw size={16} />
              </button>
              <button onClick={e => { e.stopPropagation(); setRotation(r => (r + 90) % 360); }}
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors" aria-label="Rotate right">
                <RotateCw size={16} />
              </button>
              {/* Zoom controls */}
              <div className="flex items-center gap-0.5 border-r border-white/10 pr-1.5 mr-0.5">
                <button onClick={e => { e.stopPropagation(); zoomIn(); }}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors" aria-label="Zoom in">
                  <Plus size={16} />
                </button>
                <span
                  onClick={e => { e.stopPropagation(); resetZoom(); }}
                  className="text-[11px] font-medium tabular-nums cursor-pointer select-none min-w-[3ch] text-center
                    text-white/60 hover:text-white/90 transition-colors"
                  title="Click to reset zoom"
                  aria-label="Current zoom level"
                >
                  {zoom === null ? "Fit" : `${Math.round(zoom * 100)}%`}
                </span>
                <button onClick={e => { e.stopPropagation(); zoomOut(); }}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors" aria-label="Zoom out">
                  <Minus size={16} />
                </button>
              </div>
              {/* Copy URL */}
              <button onClick={e => { e.stopPropagation(); copyUrl(); }}
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors relative" aria-label="Copy image URL">
                {copied ? <span className="text-[10px] font-medium px-0.5 text-[var(--accent)]">Copied</span> : <Copy size={16} />}
              </button>
              {/* Download */}
              <button onClick={e => { e.stopPropagation(); download(); }}
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors" aria-label="Download">
                <Download size={16} />
              </button>
            </div>
          </div>

          {/* ── Navigation arrows ── */}
          <button onClick={e => { e.stopPropagation(); prevImage(); }} disabled={selectedIdx === 0}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-2.5 bg-black/40 hover:bg-black/70 text-white/80 hover:text-white rounded-full transition-all disabled:opacity-0 disabled:pointer-events-none">
            <ChevronLeft size={22} />
          </button>
          <button onClick={e => { e.stopPropagation(); nextImage(); }} disabled={selectedIdx === results.length - 1}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-2.5 bg-black/40 hover:bg-black/70 text-white/80 hover:text-white rounded-full transition-all disabled:opacity-0 disabled:pointer-events-none">
            <ChevronRight size={22} />
          </button>

          {/* Mobile tap zones */}
          <div className="absolute inset-y-0 left-0 w-1/4 z-10 sm:hidden" onClick={e => { e.stopPropagation(); prevImage(); }} />
          <div className="absolute inset-y-0 right-0 w-1/4 z-10 sm:hidden" onClick={e => { e.stopPropagation(); nextImage(); }} />

          {/* ── Image area ── */}
          <div
            className="flex-1 flex relative"
            onClick={e => e.stopPropagation()}
            onWheel={e => {
              e.preventDefault();
              if (e.deltaY < 0) zoomIn();
              else zoomOut();
            }}
            style={{ touchAction: "pan-x pan-y" }}
          >
            {/* Scroll container when zoomed */}
            <div
              className={`flex-1 flex items-start justify-center relative ${zoom !== null ? "overflow-auto" : "overflow-hidden items-center"}`}
              onClick={() => toggleFitZoom()}
            >
              {!imgLoaded && (
                <div className="flex items-center justify-center p-12 absolute inset-0">
                  <Loader2 size={32} className="text-white/40 animate-spin" />
                </div>
              )}
              <img
                key={selected.source[0]?.url}
                src={`/api/proxy?i=${encodeURIComponent(selected.source[0]?.url)}`}
                alt={selected.title || ""}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgLoaded(true)}
                className={`transition-opacity duration-250 ease-out ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                style={{
                  transform: `rotate(${rotation}deg) scale(${zoom ?? 1})`,
                  transition: "transform 0.3s ease, opacity 0.25s ease",
                  ...(zoom === null
                    ? { maxHeight: "calc(100dvh - 14rem)", maxWidth: "100%", objectFit: "contain" as const }
                    : { width: "auto", height: "auto", minWidth: 0, minHeight: 0 }),
                }}
              />
            </div>
          </div>

          {/* ── Filmstrip ── */}
          <div className="shrink-0 bg-black/60 border-t border-white/[0.04]" onClick={e => e.stopPropagation()}>
            <div ref={filmstripRef} className="flex gap-1.5 overflow-x-auto px-4 py-3 scroll-smooth" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.15) transparent" }}>
              {results.map((result, i) => {
                const thumbUrl = result.source?.length > 0 ? result.source[result.source.length - 1].url : "";
                const proxied = thumbUrl ? `/api/proxy?i=${encodeURIComponent(thumbUrl)}&s=thumb` : "";
                return (
                  <button key={i} onClick={() => { setSelectedIdx(i); setImgLoaded(false); setZoom(null); setRotation(0); }}
                    className={`size-12 sm:size-14 shrink-0 rounded-[var(--radius-sm)] overflow-hidden border-2 transition-all duration-200 ${i === selectedIdx ? "border-white opacity-100 scale-105 shadow-[0_0_8px_rgba(255,255,255,0.15)]" : "border-transparent opacity-40 hover:opacity-80"}`}
                  >
                    {proxied && <img src={proxied} alt="" className="size-full object-cover" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Info bar ── */}
          <div className="shrink-0 bg-black/80 border-t border-white/[0.04] px-3 sm:px-4 py-2.5 flex items-center gap-3 overflow-hidden" onClick={e => e.stopPropagation()}>
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
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-[11px] font-medium transition-colors">
                <Maximize2 size={12} /> <span className="hidden sm:inline">View</span>
              </a>
              <a href={selected.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-[11px] font-medium transition-colors">
                <ExternalLink size={12} /> <span className="hidden sm:inline">Site</span>
              </a>
            </div>
          </div>

          {/* Slideshow indicator */}
          {slideshowActive && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/5 z-30">
              <div className="h-full bg-[var(--accent)] animate-slide-progress" />
            </div>
          )}
        </div>
      )}

      <BackToTop />
    </main>
  );
}

export default function ImagesPage() {
  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .animate-in { animation: fadeIn .15s ease-out }

        /* Masonry grid */
        .masonry-grid {
          column-count: 2;
          column-gap: 12px;
        }
        @media (min-width: 640px) { .masonry-grid { column-count: 3; } }
        @media (min-width: 768px) { .masonry-grid { column-count: 4; } }
        @media (min-width: 1024px) { .masonry-grid { column-count: 5; } }
        .masonry-item {
          break-inside: avoid;
          margin-bottom: 12px;
        }

        /* Slideshow progress bar */
        @keyframes slideProgress {
          from { width: 0% }
          to { width: 100% }
        }
        .animate-slide-progress {
          animation: slideProgress 3.5s linear forwards;
        }
      `}</style>
      <Suspense fallback={<div className="min-h-screen bg-[var(--bg)]" />}>
        <ImageGrid />
      </Suspense>
    </>
  );
}
