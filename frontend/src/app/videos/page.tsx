"use client";

import { Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, Globe2, Image as ImageIcon, Video, Newspaper, ChevronRight, ArrowUp } from "lucide-react";

interface VideoResult {
    title: string;
    url: string;
    thumb?: { url: string };
    date?: string;
    views?: string;
    author?: { name: string };
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
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
    const [scraper, setScraper] = useState("yt");
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [npt, setNpt] = useState<string | null>(null);
    const [previousNpts, setPreviousNpts] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isNavigating, setIsNavigating] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            setShowBackToTop(window.scrollY > 400);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const SCRAPERS = [
        { value: "yt", label: "YouTube" },
        { value: "ddg", label: "DuckDuckGo" },
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
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, [query, scraper, page, searchParams]);

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
            router.push(`/videos?s=${encodeURIComponent(term.trim())}`);
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

    const handleNextPage = () => {
        if (!npt || isNavigating) return;
        
        setIsNavigating(true);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("p");
        params.set("npt", npt);
        
        router.push(`/videos?${params.toString()}`);
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
        
        router.push(`/videos?${params.toString()}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        setTimeout(() => setIsNavigating(false), 500);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            
            if (e.key === 'ArrowLeft' && previousNpts.length > 0) {
                handlePreviousPage();
            } else if (e.key === 'ArrowRight' && npt) {
                handleNextPage();
            }
        };
        
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [npt, previousNpts, isNavigating]);

    return (
        <main className="min-h-screen bg-[#0a0f1f] text-[#e8e6e3]">
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
                                            setActiveSuggestionIndex(-1);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                        onKeyDown={handleKeyDown}
                                        className="flex-1 h-10 sm:h-9 bg-transparent text-[var(--foreground)] placeholder-muted-foreground focus:outline-none text-base sm:text-sm min-w-0"
                                        placeholder="Search videos"
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
                                        aria-label="Search videos"
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
                                <a href={`/images?s=${encodeURIComponent(query)}`} className="flex items-center gap-2 pb-2 border-b-2 border-transparent hover:text-white transition-colors">
                                    <ImageIcon size={16} />
                                    <span>Images</span>
                                </a>
                                <span className="flex items-center gap-2 pb-2 border-b-2 border-[#9b5cff] text-white cursor-default">
                                    <Video size={16} />
                                    <span>Videos</span>
                                </span>
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

            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5 sm:py-6">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[...Array(9)].map((_, i) => (
                            <div key={i} className="space-y-2 rounded-lg p-3 bg-[#0f1525]/70 border border-white/5">
                                <div className="aspect-video rounded-lg shimmer" />
                                <div className="h-4 rounded shimmer w-3/4" />
                                <div className="h-3 rounded shimmer w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : results.length === 0 ? (
                    <div className="rounded-lg p-6 bg-[#0f1525]/70 border border-white/10 text-[#c7d2e4]">
                        No videos found for “{query}”.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {results.map((video, i) => (
                            <a
                                key={i}
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-lg bg-[#0f1525]/70 border border-white/5 p-3 hover:border-white/10 transition fade-slide"
                                style={{ animationDelay: `${i * 50}ms` }}
                            >
                                {video.thumb?.url && (
                                    <img
                                        src={video.thumb.url}
                                        alt={video.title}
                                        className="w-full aspect-video object-cover rounded-lg mb-2 transition duration-200 group-hover:opacity-85"
                                        loading="lazy"
                                    />
                                )}
                                <p className="text-sm text-[#a7c7ff] line-clamp-2">{video.title}</p>
                                <p className="text-xs text-[#8da0bf] mt-1">
                                    {video.author?.name && <span>{video.author.name} • </span>}
                                    {video.views}
                                </p>
                                {video.date && <p className="text-[11px] text-[#6f7b9b] mt-0.5">{video.date}</p>}
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {!loading && results.length > 0 && (
                <div className="max-w-6xl mx-auto px-3 sm:px-4 pb-12">
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
                        Use ← → arrow keys to navigate
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

export default function VideosPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#1a1a1a]" />}>
            <VideosContent />
        </Suspense>
    );
}
