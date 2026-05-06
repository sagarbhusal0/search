"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search, ExternalLink, Globe2, Image as ImageIcon, Video, Newspaper, ArrowRight, ArrowUp } from "lucide-react";

interface WebResult {
    title: string;
    description: string;
    url: string;
    favicon?: string;
}

interface VideoResult {
    title: string;
    description?: string;
    url: string;
    thumb?: { url: string };
    date?: string;
    views?: string;
    author?: { name: string; url: string };
}

interface ApiResponse {
    web?: WebResult[];
    video?: VideoResult[];
    related?: string[];
    npt?: string;
    status?: string;
}

const SCRAPERS = [
    { value: "brave", label: "Brave" },
    { value: "ddg", label: "DuckDuckGo" },
    { value: "google", label: "Google" },
    { value: "yandex", label: "Yandex" },
    { value: "qwant", label: "Qwant" },
    { value: "startpage", label: "Startpage" },
];

export default function SearchResults() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get("s") || "";
    const queryScraper = searchParams.get("scraper");
    const page = searchParams.get("p") || "1";
    const getCookie = (name: string) => {
        if (typeof document === "undefined") return null;
        const match = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith(`${name}=`));
        return match ? decodeURIComponent(match.split("=")[1]) : null;
    };
    const [scraper, setScraper] = useState<string>(queryScraper || getCookie("scraper_ac") || "brave");
    const [results, setResults] = useState<WebResult[]>([]);
    const [videos, setVideos] = useState<VideoResult[]>([]);
    const [related, setRelated] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState(query);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [timeTaken, setTimeTaken] = useState<number>(0);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
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

    useEffect(() => {
        if (!query) {
            router.push("/");
            return;
        }

        const fetchResults = async () => {
            setLoading(true);
            setError(null);
            const startTime = Date.now();

            try {
                let url = `/api/search?q=${encodeURIComponent(query)}&scraper=${encodeURIComponent(scraper)}`;
                const currentNpt = searchParams.get("npt");
                if (currentNpt) url += `&npt=${encodeURIComponent(currentNpt)}`;
                else url += `&p=${page}`;

                const response = await fetch(url);
                const data: ApiResponse = await response.json();

                setTimeTaken((Date.now() - startTime) / 1000);

                if (data.status && !data.web) {
                    setError(data.status);
                    setResults([]);
                } else {
                    setResults(data.web || []);
                    setVideos(data.video || []);
                    setRelated(data.related || []);
                    
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
                }
            } catch (err) {
                setError("Failed to fetch results.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query, scraper, page, router]);

    // Sync scraper when URL param changes
    useEffect(() => {
        if (queryScraper && queryScraper !== scraper) {
            setScraper(queryScraper);
        }
    }, [queryScraper, scraper]);

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
        const searchQ = q || searchQuery;
        if (searchQ.trim() /* && searchQ !== query */) { // Allow re-search to fix potential state sync issues or force refresh
            router.push(`/search?s=${encodeURIComponent(searchQ.trim())}&scraper=${encodeURIComponent(scraper)}`);
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

    const getFavicon = (url: string) => {
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
        } catch {
            return null;
        }
    };

    const handleNextPage = () => {
        if (!npt || isNavigating) return;
        
        setIsNavigating(true);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("p");
        params.set("npt", npt);
        
        router.push(`/search?${params.toString()}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        setTimeout(() => setIsNavigating(false), 500);
    };

    const handlePreviousPage = () => {
        if (previousNpts.length === 0 || isNavigating) return;
        
        setIsNavigating(true);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("p");
        
        if (previousNpts.length === 1) {
            // Go back to first page
            params.delete("npt");
            setPreviousNpts([]);
            setCurrentPage(1);
        } else {
            // Go to previous npt
            const newPreviousNpts = [...previousNpts];
            newPreviousNpts.pop(); // Remove current
            const prevNpt = newPreviousNpts[newPreviousNpts.length - 1];
            params.set("npt", prevNpt);
            setPreviousNpts(newPreviousNpts);
            setCurrentPage(prev => prev - 1);
        }
        
        router.push(`/search?${params.toString()}`);
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
        <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
            {/* Header */}
            <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[color:var(--background-2)]/92 backdrop-blur-lg">
                <div className="max-w-6xl mx-auto px-2 sm:px-4 py-2 sm:py-3 space-y-2 sm:space-y-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2 sm:gap-6">
                        <a href="/" className="flex items-center justify-center sm:justify-start pt-1 pb-1 sm:pb-0">
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
                                        placeholder="Search"
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
                                        aria-label="Search"
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
                            <div className="mt-3 flex overflow-x-auto pb-2 sm:pb-0 items-center gap-4 sm:gap-6 text-sm text-[color:var(--muted)] px-1 sm:px-2 no-scrollbar">
                                <span className="flex items-center gap-2 pb-2 border-b-2 border-[color:var(--accent)] text-[var(--foreground)] cursor-default">
                                    <Search size={16} />
                                    <span>All</span>
                                </span>
                                <a href={`/images?s=${encodeURIComponent(query)}`} className="flex items-center gap-2 pb-2 border-b-2 border-transparent hover:text-[var(--foreground)] transition-colors">
                                    <ImageIcon size={16} />
                                    <span>Images</span>
                                </a>
                                <a href={`/videos?s=${encodeURIComponent(query)}`} className="flex items-center gap-2 pb-2 border-b-2 border-transparent hover:text-[var(--foreground)] transition-colors">
                                    <Video size={16} />
                                    <span>Videos</span>
                                </a>
                                <a href={`/news?s=${encodeURIComponent(query)}`} className="flex items-center gap-2 pb-2 border-b-2 border-transparent hover:text-[var(--foreground)] transition-colors">
                                    <Newspaper size={16} />
                                    <span>News</span>
                                </a>
                            </div>
                        </div>
                        <div className="flex gap-4 text-sm text-[color:var(--muted)] ml-auto">
                            <a href="/" className="hover:text-[var(--foreground)] transition-colors">Home</a>
                            <a href="/settings" className="hover:text-[var(--foreground)] transition-colors">Settings</a>
                        </div>
                    </div>


                </div>
            </header>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5 sm:py-6 flex flex-col lg:flex-row gap-6">
                {/* Main Results */}
                <div className="flex-1 min-w-0 space-y-6">
                    {!loading && (
                        <div className="text-xs font-medium text-[var(--muted)] flex items-center gap-2 px-1 opacity-80">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
                            </span>
                            <span>{results.length} results found in {timeTaken.toFixed(3)} seconds</span>
                        </div>
                    )}

                    {loading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="space-y-3 rounded-2xl p-6 bg-[var(--card)]/40 border border-[var(--border)]/50">
                                    <div className="flex items-center gap-3">
                                        <div className="h-6 w-6 rounded-full shimmer" />
                                        <div className="h-3 rounded-full shimmer w-32" />
                                    </div>
                                    <div className="h-6 rounded-lg shimmer w-3/4" />
                                    <div className="h-4 rounded-lg shimmer w-full opacity-60" />
                                    <div className="h-4 rounded-lg shimmer w-4/5 opacity-60" />
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="rounded-2xl p-8 bg-[var(--card)]/40 border border-red-500/20 text-center">
                            <p className="text-red-400 font-medium">{error}</p>
                            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition">Try Again</button>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="rounded-2xl p-12 bg-[var(--card)]/40 border border-[var(--border)] text-center text-[var(--muted)]">
                            <Search className="mx-auto h-12 w-12 opacity-20 mb-4" />
                            <p className="text-lg font-medium text-[var(--foreground)]">No results found for "{query}"</p>
                            <p className="mt-2 text-sm">Try checking your spelling or use different keywords.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {results.map((result, index) => (
                                <article
                                    key={index}
                                    className="group relative rounded-2xl p-3 sm:p-4 bg-[var(--card)]/30 border border-[var(--border)]/60 hover:border-[var(--accent)]/30 hover:bg-[var(--card)]/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 ease-out fade-slide"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    {/* Hover Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/5 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500 pointer-events-none" />

                                    <a href={result.url} target="_blank" rel="noopener noreferrer" className="relative block space-y-2">
                                        <div className="flex items-center gap-3 text-xs text-[var(--muted)] mb-1.5">
                                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[var(--background)]/80 border border-[var(--border)] p-1.5 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                                {getFavicon(result.url) ? (
                                                    <img
                                                        src={getFavicon(result.url)!}
                                                        alt=""
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => (e.currentTarget.style.display = "none")}
                                                    />
                                                ) : <Globe2 size={14} />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-medium truncate max-w-[200px] opacity-90 text-[var(--foreground)]">{new URL(result.url).hostname}</span>
                                                <span className="text-[10px] opacity-60 truncate max-w-[250px]">{result.url}</span>
                                            </div>
                                        </div>

                                        <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)] leading-snug group-hover:text-[var(--accent-2)] transition-colors duration-200">
                                            {result.title}
                                        </h2>

                                        <p className="text-[var(--foreground)]/80 text-sm leading-relaxed line-clamp-2 md:line-clamp-2 group-hover:text-[var(--foreground)]/90 transition-colors">
                                            {result.description}
                                        </p>
                                    </a>
                                </article>
                            ))}
                        </div>
                    )}

                    {related.length > 0 && !loading && (
                        <div className="mt-8 pt-8 border-t border-[var(--border)]/50">
                            <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-4 px-1">Related searches</h3>
                            <div className="flex flex-wrap gap-2.5">
                                {related.map((term, i) => (
                                    <a
                                        key={i}
                                        href={`/search?s=${encodeURIComponent(term)}`}
                                        className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)]/50 text-sm text-[var(--foreground)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/10 hover:text-white transition-all transform hover:-translate-y-0.5 active:scale-95 duration-200 shadow-sm"
                                    >
                                        <Search size={12} className="inline mr-2 opacity-50" />
                                        {term}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar - Videos */}
                {videos.length > 0 && (
                    <aside className="w-full lg:w-80 flex-shrink-0 space-y-4">
                        <div className="sticky top-24 space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wide">Video Results</h3>
                                <a href={`/videos?s=${encodeURIComponent(query)}`} className="text-xs text-[var(--accent-2)] hover:underline">View all</a>
                            </div>
                            <div className="space-y-3">
                                {videos.slice(0, 3).map((video, i) => (
                                    <a key={i} href={video.url} target="_blank" rel="noopener noreferrer" className="group block rounded-xl bg-[var(--card)]/40 border border-[var(--border)] hover:border-[var(--accent)]/30 hover:bg-[var(--card)]/80 overflow-hidden transition-all duration-300 shadow-sm hover:shadow-lg">
                                        <div className="relative aspect-video w-full overflow-hidden bg-black/20">
                                            {video.thumb?.url ? (
                                                <img
                                                    src={video.thumb.url}
                                                    alt={video.title}
                                                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-out"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-[var(--muted)]"><Video size={24} /></div>
                                            )}
                                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                                            {/* Play Button Overlay */}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
                                                    <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-3.5 space-y-1.5">
                                            <h4 className="text-[15px] font-medium text-[var(--foreground)] leading-snug line-clamp-2 group-hover:text-[var(--accent-2)] transition-colors">
                                                {video.title}
                                            </h4>
                                            <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                                                <span>{video.author?.name || "Unknown Source"}</span>
                                                <span>{video.views || ""}</span>
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </aside>
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
                            className={`group flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--card)]/50 border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--card)] hover:border-[var(--accent)] hover:text-[var(--accent-2)] transition-all duration-300 shadow-sm hover:shadow-md active:scale-95 ${previousNpts.length === 0 || isNavigating ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Previous page (←)"
                        >
                            <ArrowRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
                            <span className="hidden sm:inline">Previous</span>
                        </button>

                        {/* Page Indicator */}
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--card)]/30 border border-[var(--border)]/50 text-sm text-[var(--muted)]">
                            <span className="font-medium text-[var(--foreground)]">Page {currentPage}</span>
                            {isNavigating && (
                                <div className="ml-2 h-4 w-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                            )}
                        </div>

                        {/* Next Button */}
                        <button
                            onClick={handleNextPage}
                            disabled={!npt || isNavigating}
                            className={`group flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--card)]/50 border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--card)] hover:border-[var(--accent)] hover:text-[var(--accent-2)] transition-all duration-300 shadow-sm hover:shadow-md active:scale-95 ${!npt || isNavigating ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Next page (→)"
                        >
                            <span className="hidden sm:inline">Next</span>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                    
                    {/* Keyboard hint */}
                    <div className="text-center mt-4 text-xs text-[var(--muted)] opacity-60">
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
