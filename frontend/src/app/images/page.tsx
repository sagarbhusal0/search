"use client";

import { Suspense, useCallback, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ExternalLink, Globe2, Image as ImageIcon, Newspaper, Search, Video, X, ArrowUp } from "lucide-react";

interface ImageSource {
  url: string;
  width?: number;
  height?: number;
}

interface ImageResult {
  title?: string;
  url: string;
  source?: ImageSource[];
  thumb?: { url?: string } | string;
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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [npt, setNpt] = useState<string | null>(null);
  const [previousNpts, setPreviousNpts] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isNavigating, setIsNavigating] = useState(false);
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
        
        // Track pagination history
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
        console.error("Images fetch error:", e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [query, scraper, page, searchParams]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Autocomplete
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
      } catch {
        setSuggestions([]);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = (q?: string) => {
    const term = q || searchQuery;
    if (term.trim()) {
      router.push(`/images?s=${encodeURIComponent(term.trim())}&scraper=${scraper}`);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
        handleSearch(suggestions[activeSuggestionIndex]);
      } else {
        handleSearch();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Lock body scroll when preview is open
  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedIndex]);

  // Keyboard navigation for Modal
  useEffect(() => {
    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === "ArrowLeft") {
        setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (e.key === "ArrowRight") {
        setSelectedIndex((prev) => (prev !== null && prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === "Escape") {
        setSelectedIndex(null);
      }
    };
    window.addEventListener("keydown", handleModalKeyDown);
    return () => window.removeEventListener("keydown", handleModalKeyDown);
  }, [selectedIndex, results.length]);


  const getThumbUrl = (img: ImageResult): string => {
    if (img.source && img.source.length > 1 && img.source[1]?.url) {
      return `/api/proxy?i=${encodeURIComponent(img.source[1].url)}&s=original`;
    }
    if (img.source && img.source.length > 0 && img.source[0]?.url) {
      return `/api/proxy?i=${encodeURIComponent(img.source[0].url)}&s=thumb`;
    }
    if (typeof img.thumb === "string") {
      return `/api/proxy?i=${encodeURIComponent(img.thumb)}&s=thumb`;
    }
    if (img.thumb && typeof img.thumb === "object" && img.thumb.url) {
      return `/api/proxy?i=${encodeURIComponent(img.thumb.url)}&s=thumb`;
    }
    return "";
  };

  const getFullUrl = (img: ImageResult): string => {
    if (img.source && img.source.length > 0 && img.source[0]?.url) {
      return `/api/proxy?i=${encodeURIComponent(img.source[0].url)}&s=original`;
    }
    return "";
  };

  const getOriginalUrl = (img: ImageResult): string => {
    if (img.source && img.source.length > 0 && img.source[0]?.url) {
      return img.source[0].url;
    }
    return img.url;
  };

  const selectedImage = selectedIndex !== null ? results[selectedIndex] : null;

  const handleNextPage = () => {
    if (!npt || isNavigating) return;
    
    setIsNavigating(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("p");
    params.set("npt", npt);
    
    router.push(`/images?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setTimeout(() => setIsNavigating(false), 500);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setTimeout(() => setIsNavigating(false), 500);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (selectedIndex !== null) return; // Don't interfere with image modal navigation
      
      if (e.key === 'ArrowLeft' && previousNpts.length > 0) {
        handlePreviousPage();
      } else if (e.key === 'ArrowRight' && npt) {
        handleNextPage();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [npt, previousNpts, isNavigating, selectedIndex]);

  return (
    <main className="min-h-screen bg-[#0a0f1f] text-[#e8e6e3]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b1020]/92 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 py-2 sm:py-2.5 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:gap-6">
            <a href="/" className="flex items-center justify-center sm:justify-start pt-1">
              <img src="/logo.svg" alt="Sorvx Logo" className="h-[40px] sm:h-[52px] w-auto" />
            </a>
            <div className="flex-1 min-w-0 w-full sm:w-auto sm:max-w-2xl">
              <div className="relative group min-w-0 w-full z-50">
                <div
                  className={`relative flex items-center gap-2 bg-[#27272a] border border-[color:var(--border)] px-4 py-2 shadow-sm transition-all duration-200 ${showSuggestions && suggestions.length > 0
                    ? "rounded-t-2xl rounded-b-none border-b-transparent shadow-none"
                    : "rounded-full focus-within:ring-2 focus-within:ring-[#9b5cff]/30 focus-within:border-[#9b5cff]"
                    }`}
                >
                  <div className="hidden sm:block pl-1 text-muted-foreground">
                    <Search size={16} />
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="flex-1 h-10 sm:h-9 bg-transparent text-[var(--foreground)] placeholder-muted-foreground focus:outline-none text-base sm:text-sm min-w-0"
                    placeholder="Search images"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        inputRef.current?.focus();
                      }}
                      className="p-1 hover:bg-white/10 rounded-full text-muted-foreground transition-colors mr-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                  )}
                  <div className="h-6 w-px bg-[var(--border)] mx-1" />
                  <select
                    value={scraper}
                    onChange={(e) => setScraper(e.target.value)}
                    className="h-7 px-2 bg-transparent text-[13px] text-[var(--foreground)] focus:outline-none whitespace-nowrap cursor-pointer hover:bg-white/5 rounded-md transition-colors border-none"
                  >
                    {SCRAPERS.map((s) => (
                      <option key={s.value} value={s.value} className="bg-[#27272a] text-white">{s.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleSearch()}
                    className="h-9 w-9 sm:h-8 sm:w-8 rounded-full bg-[#9b5cff] hover:bg-[#8b4ce0] text-white flex items-center justify-center shadow-md transition-all duration-200 transform active:scale-95 ml-1"
                    aria-label="Search images"
                  >
                    <Search size={16} strokeWidth={2.5} className="sm:w-[14px] sm:h-[14px]" />
                  </button>
                </div>

                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-[#27272a] border border-[color:var(--border)] border-t-0 rounded-b-2xl shadow-xl overflow-hidden z-50">
                    <div className="max-h-[300px] overflow-y-auto no-scrollbar py-2">
                      {suggestions.map((s, i) => (
                        <div
                          key={i}
                          className="px-4 py-2.5 cursor-pointer text-[15px] flex items-center gap-3 text-[var(--foreground)] transition-all hover:bg-white/5 hover:pl-5 group/item"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSearch(s);
                          }}
                        >
                          <Search size={14} className="text-[color:var(--muted)] opacity-50 group-hover/item:text-[var(--accent)] transition-colors" />
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-[#8da0bf] px-2">
                <a href={`/search?s=${encodeURIComponent(query)}`} className="flex items-center gap-2 pb-2 border-b-2 border-transparent hover:text-white transition-colors">
                  <Search size={16} />
                  <span>All</span>
                </a>
                <span className="flex items-center gap-2 pb-2 border-b-2 border-[#9b5cff] text-white cursor-default">
                  <ImageIcon size={16} />
                  <span>Images</span>
                </span>
                <a href={`/videos?s=${encodeURIComponent(query)}`} className="flex items-center gap-2 pb-2 border-b-2 border-transparent hover:text-white transition-colors">
                  <Video size={16} />
                  <span>Videos</span>
                </a>
                <a href={`/news?s=${encodeURIComponent(query)}`} className="flex items-center gap-2 pb-2 border-b-2 border-transparent hover:text-white transition-colors">
                  <Newspaper size={16} />
                  <span>News</span>
                </a>
              </div>
            </div>
            <div className="flex gap-4 text-sm text-[#c7d2e4] ml-auto">
              <a href="/" className="hover:text-white transition-colors">Home</a>
              <a href="/settings" className="hover:text-white transition-colors">Settings</a>
            </div>
          </div>


        </div>
      </header>

      {/* Image Grid */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-5 sm:py-8">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-2xl shimmer bg-[var(--card)]/40 border border-[var(--border)]/50" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-3xl p-16 bg-[var(--card)]/30 border border-[var(--border)] text-center text-[var(--muted)]">
            <ImageIcon className="mx-auto h-16 w-16 opacity-20 mb-4" />
            <p className="text-xl font-medium text-[var(--foreground)]">No images found for “{query}”</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 auto-rows-min">
            {results.map((img, i) => {
              const thumbUrl = getThumbUrl(img);

              return (
                <div
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  className="group cursor-pointer relative aspect-[4/3] bg-[var(--card)]/40 border border-[var(--border)]/50 rounded-2xl overflow-hidden hover:border-[var(--accent)]/40 hover:shadow-xl transition-all duration-300 fade-slide"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={img.title || ""}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.parentElement!.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-[var(--muted)]">
                      <ImageIcon size={24} className="opacity-20" />
                    </div>
                  )}
                  {/* Gradient Overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    {img.title && (
                      <p className="text-white text-xs font-medium line-clamp-2 drop-shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        {img.title}
                      </p>
                    )}
                    {img.source && img.source[0]?.url && (
                      <p className="text-white/70 text-[10px] truncate mt-1 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                        {getOriginalUrl(img)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && results.length > 0 && (
        <div className="max-w-6xl mx-auto px-3 sm:px-4 pb-12 mt-8">
          <div className="flex items-center justify-center gap-4">
            {/* Previous Button */}
            <button
              onClick={handlePreviousPage}
              disabled={previousNpts.length === 0 || isNavigating}
              className={`group flex items-center gap-2 px-6 py-3 rounded-full bg-[#0f1525]/50 border border-white/10 text-[#e8e6e3] font-medium hover:bg-[#0f1525] hover:border-[#9b5cff] hover:text-[#c4a2ff] transition-all duration-300 shadow-sm hover:shadow-md active:scale-95 ${previousNpts.length === 0 || isNavigating ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Previous page (←)"
            >
              <ChevronRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {/* Page Indicator */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0f1525]/30 border border-white/10 text-sm text-[#8da0bf]">
              <span className="font-medium text-white">Page {currentPage}</span>
              {isNavigating && (
                <div className="ml-2 h-4 w-4 border-2 border-[#9b5cff] border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {/* Next Button */}
            <button
              onClick={handleNextPage}
              disabled={!npt || isNavigating}
              className={`group flex items-center gap-2 px-6 py-3 rounded-full bg-[#0f1525]/50 border border-white/10 text-[#e8e6e3] font-medium hover:bg-[#0f1525] hover:border-[#9b5cff] hover:text-[#c4a2ff] transition-all duration-300 shadow-sm hover:shadow-md active:scale-95 ${!npt || isNavigating ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Next page (→)"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          {/* Keyboard hint */}
          <div className="text-center mt-4 text-xs text-[#8da0bf] opacity-60">
            Use ← → arrow keys to navigate pages
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center px-3 sm:px-4 fade-in"
          onClick={() => setSelectedIndex(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 sm:p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition z-10"
          >
            <X size={22} />
          </button>

          {/* Left arrow */}
          {selectedIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(selectedIndex - 1);
              }}
              className="absolute left-2 sm:left-4 p-2 sm:p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
            >
              <ChevronLeft size={26} />
            </button>
          )}

          {/* Right arrow */}
          {selectedIndex < results.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(selectedIndex + 1);
              }}
              className="absolute right-2 sm:right-4 p-2 sm:p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
            >
              <ChevronRight size={26} />
            </button>
          )}

          {/* Image container */}
          <div
            className="flex flex-col items-center max-w-[95vw] max-h-[85vh] gap-3 sm:gap-4 scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getFullUrl(selectedImage)}
              alt={selectedImage.title || ""}
              className="max-w-full max-h-[60vh] sm:max-h-[70vh] object-contain rounded-xl shadow-2xl"
              onError={(e) => {
                // Fallback to thumb if full fails
                e.currentTarget.src = getThumbUrl(selectedImage);
              }}
            />

            {/* Image info */}
            <div className="mt-4 text-center max-w-2xl px-4">
              {selectedImage.title && (
                <h3 className="text-white text-lg font-medium line-clamp-2 mb-2">
                  {selectedImage.title}
                </h3>
              )}
              <a
                href={getOriginalUrl(selectedImage)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#8ab4f8] hover:underline text-sm"
              >
                Open original <ExternalLink size={14} />
              </a>
              <p className="text-[#666] text-xs mt-2">
                {selectedIndex + 1} of {results.length} • Use ← → keys to navigate
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Back to Top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-6 right-6 p-3 rounded-full bg-[var(--accent)] text-white shadow-lg transition-all duration-300 z-50 hover:bg-[var(--accent)]/90 active:scale-95 ${showBackToTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"}`}
        aria-label="Back to top"
      >
        <ArrowUp size={20} />
      </button>
    </main>
  );
}

export default function ImagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1a1a1a]" />}>
      <ImagesContent />
    </Suspense>
  );
}
