"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe2, Image as ImageIcon, Newspaper, Search, Video, X, ArrowLeft, ArrowRight, ArrowUp, ExternalLink, Maximize2, Download, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
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

  const openPreview = (index: number) => {
    setSelectedImageIndex(index);
    document.body.style.overflow = "hidden";
  };

  const closePreview = useCallback(() => {
    setSelectedImageIndex(null);
    document.body.style.overflow = "auto";
  }, []);

  const nextImage = useCallback(() => {
    if (selectedImageIndex !== null && selectedImageIndex < results.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  }, [selectedImageIndex, results.length]);

  const prevImage = useCallback(() => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  }, [selectedImageIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageIndex === null) return;
      if (e.key === "ArrowRight") nextImage();
      else if (e.key === "ArrowLeft") prevImage();
      else if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImageIndex, nextImage, prevImage, closePreview]);

  const selectedImage = selectedImageIndex !== null ? results[selectedImageIndex] : null;

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-40 bg-[var(--background)] border-b border-[var(--border)] py-3">
        <div className="max-w-[1300px] mx-auto px-4 flex items-center gap-4 md:gap-6">
          <a href="/" className="flex-shrink-0">
            <img src="/logo.svg" alt="Sorvx" className="h-7 md:h-9 w-auto" />
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
                className="flex-1 h-8 md:h-9 bg-transparent text-[var(--foreground)] focus:outline-none text-sm md:text-base"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); inputRef.current?.focus(); }} className="p-1 md:p-1.5 hover:bg-white/10 rounded-full text-[var(--muted)]">
                  <X size={14} />
                </button>
              )}
              <div className="w-px h-5 bg-[var(--border)] mx-1 md:mx-2" />
              <select
                value={scraper}
                onChange={(e) => setScraper(e.target.value)}
                className="bg-transparent text-[11px] md:text-[13px] text-[var(--foreground)] border-none outline-none cursor-pointer hover:bg-white/5 rounded px-1"
              >
                {SCRAPERS.map(s => <option key={s.value} value={s.value} className="bg-[var(--card)]">{s.label}</option>)}
              </select>
              <button onClick={() => handleSearch()} className="ml-2 text-[var(--accent)] hover:text-[var(--accent-2)] transition-colors">
                <Search size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-[1300px] mx-auto px-4 mt-3 flex items-center gap-4 md:gap-6 text-[12px] md:text-[13px] text-[var(--muted)] font-medium overflow-x-auto no-scrollbar whitespace-nowrap">
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

      <div className="max-w-[1300px] mx-auto px-2 md:px-4 py-4 md:py-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="aspect-square bg-[var(--border)] animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
              {results.map((result, i) => {
                const thumbUrl = result.source && result.source.length > 0 
                  ? result.source[result.source.length - 1].url 
                  : "";
                const proxiedThumb = thumbUrl ? `/api/proxy?i=${encodeURIComponent(thumbUrl)}&s=thumb` : "";
                
                return (
                  <div 
                    key={i} 
                    onClick={() => openPreview(i)}
                    className="group relative aspect-square bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden transition-fast hover:border-[var(--accent)] cursor-pointer"
                  >
                    <img
                      src={proxiedThumb}
                      alt={result.title || ""}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity p-2 md:p-3 flex flex-col justify-end pointer-events-none">
                      <p className="text-white text-[10px] md:text-[11px] font-medium line-clamp-2">{result.title}</p>
                      <p className="text-white/60 text-[8px] md:text-[9px] truncate">{getDomain(result.url)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {results.length > 0 && (
              <div className="mt-8 md:mt-12 flex items-center justify-center gap-4 pb-8 md:pb-12">
                <button
                  onClick={handlePreviousPage}
                  disabled={previousNpts.length === 0 || isNavigating}
                  className="flex items-center gap-2 px-4 md:px-5 py-2 rounded border border-[var(--border)] text-[13px] md:text-[14px] font-medium hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-fast"
                >
                  <ArrowLeft size={16} /> <span className="hidden xs:inline">Previous</span>
                </button>
                <span className="text-xs md:text-sm font-medium text-[var(--muted)]">Page {currentPage}</span>
                <button
                  onClick={handleNextPage}
                  disabled={!npt || isNavigating}
                  className="flex items-center gap-2 px-4 md:px-5 py-2 rounded border border-[var(--border)] text-[13px] md:text-[14px] font-medium hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-fast"
                >
                  <span className="hidden xs:inline">Next</span> <ArrowRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Image Preview Modal (DuckDuckGo style) */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-black/95 animate-in fade-in zoom-in duration-200">
          <button 
            onClick={closePreview}
            className="absolute top-4 right-4 z-[60] p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
          >
            <X size={24} />
          </button>

          {/* Navigation Buttons */}
          <button
            onClick={prevImage}
            disabled={selectedImageIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-[60] p-3 bg-black/30 hover:bg-black/60 text-white rounded-full transition-all disabled:opacity-0 disabled:pointer-events-none hidden md:block"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={nextImage}
            disabled={selectedImageIndex === results.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-[60] p-3 bg-black/30 hover:bg-black/60 text-white rounded-full transition-all disabled:opacity-0 disabled:pointer-events-none hidden md:block"
          >
            <ChevronRight size={32} />
          </button>

          {/* Mobile Navigation Area (Invisible tap zones) */}
          <div className="absolute inset-y-0 left-0 w-16 z-50 md:hidden" onClick={prevImage} />
          <div className="absolute inset-y-0 right-0 w-16 z-50 md:hidden" onClick={nextImage} />

          {/* Image Container */}
          <div className="flex-1 flex items-center justify-center p-4 md:p-8 min-h-0 relative">
            <img 
              key={selectedImage.source[0].url}
              src={`/api/proxy?i=${encodeURIComponent(selectedImage.source[0].url)}`} 
              alt={selectedImage.title}
              className="max-w-full max-h-full object-contain shadow-2xl animate-in fade-in duration-300"
            />
          </div>

          {/* Sidebar */}
          <div className="w-full md:w-96 bg-[var(--card)] border-l border-[var(--border)] flex flex-col overflow-y-auto max-h-[40vh] md:max-h-full">
            <div className="p-4 md:p-6 space-y-6">
              <div>
                <h2 className="text-lg md:text-xl font-medium text-[var(--foreground)] leading-tight mb-2">
                  {selectedImage.title}
                </h2>
                <a 
                  href={selectedImage.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--accent-2)] hover:underline flex items-center gap-2 break-all"
                >
                  {getDomain(selectedImage.url)}
                  <ExternalLink size={14} />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <a 
                  href={selectedImage.source[0].url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[var(--border)] hover:bg-white/5 transition-fast group"
                >
                  <Maximize2 size={20} className="text-[var(--muted)] group-hover:text-[var(--accent)]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">View Image</span>
                  <span className="text-[10px] text-[var(--muted)] opacity-60">
                    {selectedImage.source[0].width} x {selectedImage.source[0].height}
                  </span>
                </a>
                <a 
                  href={selectedImage.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[var(--border)] hover:bg-white/5 transition-fast group"
                >
                  <Globe2 size={20} className="text-[var(--muted)] group-hover:text-[var(--accent)]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Visit Site</span>
                  <span className="text-[10px] text-[var(--muted)] opacity-60">Source page</span>
                </a>
              </div>

              <div className="pt-6 border-t border-[var(--border)]">
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `/api/proxy?i=${encodeURIComponent(selectedImage.source[0].url)}`;
                    link.download = `image-${Date.now()}.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-2)] text-white py-3 rounded-xl font-medium transition-fast"
                >
                  <Download size={18} /> Download
                </button>
              </div>
              
              {/* Mobile Arrows Indicator */}
              <div className="flex items-center justify-center gap-6 pt-4 md:hidden opacity-40">
                <ChevronLeft size={24} onClick={prevImage} className={selectedImageIndex === 0 ? "opacity-20" : ""} />
                <span className="text-xs font-medium">Swipe or tap edges to navigate</span>
                <ChevronRight size={24} onClick={nextImage} className={selectedImageIndex === results.length - 1 ? "opacity-20" : ""} />
              </div>
            </div>
          </div>
        </div>
      )}

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
