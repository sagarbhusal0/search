"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, X, ExternalLink, Maximize2,
  Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  RotateCcw, RotateCw, Copy, Play, Pause, Loader2,
  Minus, Plus, Maximize, Keyboard
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
  const [lightboxPhase, setLightboxPhase] = useState<"closed" | "entering" | "open" | "exiting">("closed");
  const [imgLoaded, setImgLoaded] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null); // null = fit-to-screen, 1=100%, 1.5, 2, 3, 5
  const [rotation, setRotation] = useState(0);
  const [slideshowActive, setSlideshowActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [preloaded, setPreloaded] = useState<Set<string>>(new Set());
  const [slideDir, setSlideDir] = useState<"left" | "right">("right");
  const filmstripRef = useRef<HTMLDivElement>(null);
  const slideshowRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const pinchDist = useRef(0);
  const pullTranslateY = useRef(0);

  /* ── Smooth zoom (null = fit to screen, 0.25–10 continuous) ── */
  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 10;
  const ZOOM_FIT_THRESHOLD = 0.5; // below this snaps back to fit
  const zoomClamp = (v: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v));

  const zoomIn = useCallback(() => setZoom(z => {
    if (z === null) return 1;
    return zoomClamp(z + 0.5);
  }), []);
  const zoomOut = useCallback(() => setZoom(z => {
    if (z === null) return null;
    const next = z - 0.5;
    return next < ZOOM_FIT_THRESHOLD ? null : zoomClamp(next);
  }), []);
  const zoomInSmooth = useCallback(() => setZoom(z => {
    if (z === null) return 1;
    return zoomClamp(z + 0.15);
  }), []);
  const zoomOutSmooth = useCallback(() => setZoom(z => {
    if (z === null) return null;
    const next = z - 0.15;
    return next < ZOOM_FIT_THRESHOLD ? null : zoomClamp(next);
  }), []);
  const resetZoom = useCallback(() => setZoom(null), []);
  const toggleFitZoom = useCallback(() => setZoom(z => z === null ? 1 : null), []);
  const displayZoom = zoom === null ? "Fit" : `${Math.round(zoom * 100)}%`;

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
      setSlideDir("right");
      setSelectedIdx(selectedIdx + 1); setImgLoaded(false); setZoom(null); setRotation(0);
    }
  }, [selectedIdx, results.length]);
  const prevImage = useCallback(() => {
    if (selectedIdx !== null && selectedIdx > 0) {
      setSlideDir("left");
      setSelectedIdx(selectedIdx - 1); setImgLoaded(false); setZoom(null); setRotation(0);
    }
  }, [selectedIdx]);

  /* ── Lightbox open/close with animation ── */
  const openPreview = useCallback((idx: number) => {
    setSelectedIdx(idx);
    setImgLoaded(false);
    setZoom(null);
    setRotation(0);
    setLightboxPhase("entering");
    document.body.style.overflow = "hidden";
    setTimeout(() => setLightboxPhase("open"), 30);
  }, []);
  const closePreview = useCallback(() => {
    setLightboxPhase("exiting");
    setSlideshowActive(false);
    setTimeout(() => {
      setSelectedIdx(null); setImgLoaded(false); setZoom(null); setRotation(0);
      setLightboxPhase("closed");
      document.body.style.overflow = "auto";
    }, 200);
  }, []);

  /* ── Fullscreen API ── */
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  /* ── Keyboard ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (selectedIdx === null) return;
      if (e.key === "ArrowRight") { e.preventDefault(); setSlideDir("right"); nextImage(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); setSlideDir("left"); prevImage(); }
      else if (e.key === "Escape") { if (showShortcuts) setShowShortcuts(false); else closePreview(); }
      else if (e.key === "?") { setShowShortcuts(s => !s); }
      else if (e.key === "f" || e.key === "F") toggleFullscreen();
      else if (e.key === "r") setRotation(r => (r + 90) % 360);
      else if (e.key === "R") setRotation(r => (r - 90 + 360) % 360);
      else if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-" || e.key === "_") zoomOut();
      else if (e.key === "0") resetZoom();
      else if (e.key === " " || e.key === "Spacebar") { e.preventDefault(); setSlideshowActive(s => !s); }
    };
    window.addEventListener("keydown", handler, { passive: false });
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIdx, nextImage, prevImage, closePreview, zoomIn, zoomOut, resetZoom, toggleFullscreen, showShortcuts]);

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
    if (e.touches.length === 2) {
      pinchDist.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    pullTranslateY.current = 0;
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
      return;
    }
    // Pull-to-close: only if swiping down on image area
    const dy = e.touches[0].clientY - touchStartY.current;
    if (zoom !== null) return; // disable pull when zoomed in
    if (dy > 0) {
      pullTranslateY.current = dy;
      if (lightboxRef.current) {
        lightboxRef.current.style.transform = `translateY(${dy * 0.5}px)`;
        lightboxRef.current.style.opacity = `${Math.max(0, 1 - dy / 500)}`;
        lightboxRef.current.style.transition = "none";
      }
    }
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = e.changedTouches[0].clientY - touchStartY.current;

    // Pull-to-close: if dragged down past threshold
    if (dy > 120 && zoom === null) {
      document.body.style.overflow = "auto";
      setLightboxPhase("exiting");
      setSlideshowActive(false);
      if (lightboxRef.current) {
        lightboxRef.current.style.transform = `translateY(${dy}px)`;
        lightboxRef.current.style.opacity = "0";
        lightboxRef.current.style.transition = "all 0.25s ease";
      }
      setTimeout(() => {
        setSelectedIdx(null); setImgLoaded(false); setZoom(null); setRotation(0);
        setLightboxPhase("closed");
        if (lightboxRef.current) {
          lightboxRef.current.style.transform = "";
          lightboxRef.current.style.opacity = "";
          lightboxRef.current.style.transition = "";
        }
      }, 250);
      return;
    }
    // Reset pull position
    if (lightboxRef.current) {
      lightboxRef.current.style.transform = "";
      lightboxRef.current.style.opacity = "";
      lightboxRef.current.style.transition = "all 0.3s ease";
    }

    // Horizontal swipe for navigation
    if (Math.abs(dx) > 60 && Math.abs(dy) < 80) {
      if (dx > 0) { setSlideDir("right"); nextImage(); }
      else { setSlideDir("left"); prevImage(); }
    }
  };

  const getDomain = (u: string) => { try { return new URL(u).hostname.replace("www.", ""); } catch { return u; } };
  const selected = selectedIdx !== null && lightboxPhase !== "closed" ? results[selectedIdx] : null;

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
                  <div key={i} onClick={() => openPreview(i)}
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
          ref={lightboxRef}
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          style={{
            opacity: lightboxPhase === "entering" || lightboxPhase === "open" ? 1 : 0,
            transform: lightboxPhase === "exiting" ? "scale(0.96)" : "scale(1)",
            transition: lightboxPhase === "exiting"
              ? "opacity 0.2s ease, transform 0.25s ease"
              : "opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onClick={closePreview}
        >
          {/* ── Dark gradient vignette ── */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_transparent_50%,_rgba(0,0,0,0.3))]" />

          {/* ── Top bar ── */}
          <div className="relative z-10 flex items-center justify-between px-3 sm:px-5 py-2.5 shrink-0 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center gap-2">
              <button onClick={e => { e.stopPropagation(); closePreview(); }}
                className="p-1.5 -ml-1.5 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all active:scale-90" aria-label="Close">
                <X size={20} />
              </button>
              <span className="text-[12px] font-semibold text-white/40 tabular-nums select-none tracking-tight">
                <span className="text-white/80">{selectedIdx! + 1}</span>
                <span className="mx-1">/</span>
                {results.length}
              </span>
            </div>

            <div className="flex items-center gap-0.5">
              {/* Fullscreen */}
              <button onClick={e => { e.stopPropagation(); toggleFullscreen(); }}
                className="p-1.5 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all active:scale-90" aria-label="Toggle fullscreen">
                <Maximize size={16} />
              </button>
              {/* Keyboard shortcuts help */}
              <button onClick={e => { e.stopPropagation(); setShowShortcuts(s => !s); }}
                className={`p-1.5 rounded-xl transition-all active:scale-90 ${showShortcuts ? "text-[var(--accent)] bg-white/10" : "text-white/70 hover:text-white hover:bg-white/10"}`}
                aria-label="Keyboard shortcuts">
                <Keyboard size={16} />
              </button>
              {/* Slideshow */}
              <button onClick={e => { e.stopPropagation(); setSlideshowActive(s => !s); }}
                className={`p-1.5 rounded-xl transition-all active:scale-90 ${slideshowActive ? "text-[var(--accent)] bg-white/10" : "text-white/70 hover:text-white hover:bg-white/10"}`}
                aria-label={slideshowActive ? "Stop slideshow" : "Start slideshow"}>
                {slideshowActive ? <Pause size={16} /> : <Play size={16} />}
              </button>
              {/* Rotate */}
              <button onClick={e => { e.stopPropagation(); setRotation(r => (r - 90 + 360) % 360); }}
                className="p-1.5 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all active:scale-90" aria-label="Rotate left">
                <RotateCcw size={16} />
              </button>
              <button onClick={e => { e.stopPropagation(); setRotation(r => (r + 90) % 360); }}
                className="p-1.5 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all active:scale-90" aria-label="Rotate right">
                <RotateCw size={16} />
              </button>
              {/* Zoom controls */}
              <div className="flex items-center gap-0.5 border-l border-white/10 pl-1.5 ml-0.5">
                <button onClick={e => { e.stopPropagation(); zoomIn(); }}
                  className="p-1.5 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all active:scale-90" aria-label="Zoom in">
                  <Plus size={16} />
                </button>
                <span
                  onClick={e => { e.stopPropagation(); resetZoom(); }}
                  className="text-[11px] font-semibold tabular-nums cursor-pointer select-none min-w-[3.2ch] text-center text-white/50 hover:text-white/90 transition-colors"
                  title="Click to reset zoom"
                  aria-label="Zoom level"
                >
                  {displayZoom}
                </span>
                <button onClick={e => { e.stopPropagation(); zoomOut(); }}
                  className="p-1.5 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all active:scale-90" aria-label="Zoom out">
                  <Minus size={16} />
                </button>
              </div>
              {/* Copy URL */}
              <button onClick={e => { e.stopPropagation(); copyUrl(); }}
                className="p-1.5 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all active:scale-90 relative" aria-label="Copy image URL">
                {copied
                  ? <span className="text-[10px] font-semibold px-0.5 text-[var(--accent)]">Copied</span>
                  : <Copy size={16} />}
              </button>
              {/* Download */}
              <button onClick={e => { e.stopPropagation(); download(); }}
                className="p-1.5 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all active:scale-90" aria-label="Download">
                <Download size={16} />
              </button>
            </div>
          </div>

          {/* ── Navigation arrows ── */}
          <button onClick={e => { e.stopPropagation(); prevImage(); }} disabled={selectedIdx === 0}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-2.5 bg-black/50 hover:bg-black/80 text-white/80 hover:text-white rounded-full transition-all disabled:opacity-0 disabled:pointer-events-none backdrop-blur-sm active:scale-90">
            <ChevronLeft size={22} />
          </button>
          <button onClick={e => { e.stopPropagation(); nextImage(); }} disabled={selectedIdx === results.length - 1}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-2.5 bg-black/50 hover:bg-black/80 text-white/80 hover:text-white rounded-full transition-all disabled:opacity-0 disabled:pointer-events-none backdrop-blur-sm active:scale-90">
            <ChevronRight size={22} />
          </button>

          {/* Mobile tap zones */}
          <div className="absolute inset-y-0 left-0 w-1/4 z-10 sm:hidden" onClick={e => { e.stopPropagation(); prevImage(); }} />
          <div className="absolute inset-y-0 right-0 w-1/4 z-10 sm:hidden" onClick={e => { e.stopPropagation(); nextImage(); }} />

          {/* ── Image area ── */}
          <div
            className="flex-1 flex relative select-none"
            onClick={e => e.stopPropagation()}
            onWheel={e => {
              e.preventDefault();
              e.stopPropagation();
              if (e.deltaY < 0) zoomInSmooth();
              else zoomOutSmooth();
            }}
            style={{ touchAction: "pan-x pan-y" }}
          >
            {/* Scroll container when zoomed */}
            <div
              className={`flex-1 flex relative ${zoom !== null ? "overflow-auto items-start" : "overflow-hidden items-center justify-center"}`}
              onClick={() => toggleFitZoom()}
            >
              {/* Loading shimmer */}
              {!imgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="size-8 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
                    <span className="text-[11px] text-white/30 font-medium tracking-widest uppercase">Loading</span>
                  </div>
                </div>
              )}

              {/* Artifact frame — subtle shadow behind the image */}
              <div
                className={`transition-all duration-300 ease-out ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                style={{
                  transform: `rotate(${rotation}deg) scale(${zoom ?? 1})`,
                  transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
                  ...(zoom === null
                    ? { maxHeight: "calc(100dvh - 14rem)", maxWidth: "100%", display: "flex", alignItems: "center", justifyContent: "center" }
                    : { display: "inline-flex" }),
                }}
              >
                <div className="relative" style={{ boxShadow: zoom === null ? "0 8px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)" : "none" }}>
                  <img
                    key={selected.source[0]?.url}
                    src={`/api/proxy?i=${encodeURIComponent(selected.source[0]?.url)}`}
                    alt={selected.title || ""}
                    onLoad={() => setImgLoaded(true)}
                    onError={() => setImgLoaded(true)}
                    className="block"
                    draggable={false}
                    style={{
                      maxHeight: zoom === null ? "calc(100dvh - 14rem)" : undefined,
                      maxWidth: zoom === null ? "100%" : undefined,
                      width: zoom !== null ? "auto" : undefined,
                      height: zoom !== null ? "auto" : undefined,
                      objectFit: zoom === null ? "contain" as const : undefined,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Filmstrip ── */}
          <div className="shrink-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent pt-6 -mt-4 relative z-10" onClick={e => e.stopPropagation()}>
            <div ref={filmstripRef} className="flex gap-1.5 overflow-x-auto px-4 pb-3 scroll-smooth"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
              {results.map((result, i) => {
                const thumbUrl = result.source?.length > 0 ? result.source[result.source.length - 1].url : "";
                const proxied = thumbUrl ? `/api/proxy?i=${encodeURIComponent(thumbUrl)}&s=thumb` : "";
                return (
                  <button key={i} onClick={() => { setSlideDir(i > selectedIdx! ? "right" : "left"); setSelectedIdx(i); setImgLoaded(false); setZoom(null); setRotation(0); }}
                    className={`size-12 sm:size-14 shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 active:scale-90
                      ${i === selectedIdx
                        ? "border-white/90 opacity-100 scale-105 shadow-[0_0_12px_rgba(255,255,255,0.12)]"
                        : "border-white/0 opacity-40 hover:opacity-80 hover:border-white/20"}`}
                  >
                    {proxied && <img src={proxied} alt="" className="size-full object-cover" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Info bar ── */}
          <div className="shrink-0 bg-black/70 backdrop-blur-md border-t border-white/[0.04] px-3 sm:px-5 py-2.5 flex items-center gap-3 overflow-hidden relative z-10" onClick={e => e.stopPropagation()}>
            <div className="flex-1 min-w-0">
              {selected.title && <p className="text-white text-[12px] font-medium truncate leading-tight">{selected.title}</p>}
              <div className="flex items-center gap-2 text-[11px] text-white/40 mt-0.5">
                <span className="truncate">{getDomain(selected.url)}</span>
                {selected.source[0]?.width && (
                  <>
                    <span className="shrink-0 text-white/20">&middot;</span>
                    <span className="shrink-0 tabular-nums">{selected.source[0].width}&times;{selected.source[0].height}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <a href={selected.source[0]?.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-white/70 hover:text-white text-[11px] font-medium transition-all active:scale-95">
                <Maximize2 size={12} /> <span className="hidden sm:inline">View</span>
              </a>
              <a href={selected.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-white/70 hover:text-white text-[11px] font-medium transition-all active:scale-95">
                <ExternalLink size={12} /> <span className="hidden sm:inline">Site</span>
              </a>
            </div>
          </div>

          {/* Slideshow indicator */}
          {slideshowActive && (
            <div className="absolute top-0 left-0 right-0 h-0.5 z-30">
              <div className="h-full bg-gradient-to-r from-[var(--accent)] to-purple-400 animate-slide-progress" />
            </div>
          )}

          {/* ── Keyboard shortcuts overlay ── */}
          {showShortcuts && (
            <div
              className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={e => e.stopPropagation()}
            >
              <div
                className="bg-zinc-900/95 border border-white/[0.06] rounded-2xl p-5 sm:p-6 max-w-xs w-full mx-4 shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white text-sm font-semibold tracking-tight">Keyboard Shortcuts</h3>
                  <button onClick={() => setShowShortcuts(false)}
                    className="p-1 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-2.5">
                  {[
                    ["← / →", "Navigate images"],
                    ["Esc", "Close preview"],
                    ["Space", "Toggle slideshow"],
                    ["+ / -", "Zoom in / out"],
                    ["0", "Reset zoom"],
                    ["r / R", "Rotate right / left"],
                    ["f", "Fullscreen"],
                    ["?", "Toggle shortcuts"],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center justify-between">
                      <kbd className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white/8 text-white/80 border border-white/[0.06] min-w-[5rem] text-center">
                        {key}
                      </kbd>
                      <span className="text-[12px] text-white/50 ml-3">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
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

        /* Smooth image loading with blur-up */
        .img-loading {
          filter: blur(8px);
          transform: scale(1.02);
        }

        /* Custom scrollbar for lightbox image area */
        .lightbox-scroll::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .lightbox-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .lightbox-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 3px;
        }
        .lightbox-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.25);
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .masonry-item,
          .animate-slide-progress {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
      <Suspense fallback={<div className="min-h-screen bg-[var(--bg)]" />}>
        <ImageGrid />
      </Suspense>
    </>
  );
}
