"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search, Globe2, Image as ImageIcon, Video, Newspaper, ArrowLeft, ArrowRight, ArrowUp, X } from "lucide-react";

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
        const handleScroll = () => setShowBackToTop(window.scrollY > 400);
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
    }, [query, scraper, page, searchParams]);

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
            } else { handleSearch(); }
        } else if (e.key === "Escape") { setShowSuggestions(false); }
    };

    const getFavicon = (url: string) => {
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
        } catch { return null; }
    };

    const handleNextPage = () => {
        if (!npt || isNavigating) return;
        setIsNavigating(true);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("p");
        params.set("npt", npt);
        router.push(`/search?${params.toString()}`);
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
        router.push(`/search?${params.toString()}`);
        window.scrollTo({ top: 0, behavior: 'instant' });
        setTimeout(() => setIsNavigating(false), 200);
    };

    return (
        <main className="min-h-screen bg-[var(--background)]">
            {/* Header - Fixed & Solid */}
            <header className="sticky top-0 z-40 bg-[var(--background)] border-b border-[var(--border)] py-3">
                <div className="max-w-[1300px] mx-auto px-4 flex items-center gap-6">
                    <a href="/" className="flex-shrink-0">
                        <img src="/logo.svg" alt="Sorvx" className="h-9 w-auto" />
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
                                onKeyDown={handleKeyDown}
                                className="flex-1 h-9 bg-transparent text-[var(--foreground)] focus:outline-none text-base"
                            />
                            {searchQuery && (
                                <button onClick={() => { setSearchQuery(""); inputRef.current?.focus(); }} className="p-1.5 hover:bg-white/10 rounded-full text-[var(--muted)]">
                                    <X size={16} />
                                </button>
                            )}
                            <div className="w-px h-5 bg-[var(--border)] mx-2" />
                            <select
                                value={scraper}
                                onChange={(e) => setScraper(e.target.value)}
                                className="bg-transparent text-[13px] text-[var(--foreground)] border-none outline-none cursor-pointer hover:bg-white/5 rounded px-1"
                            >
                                {SCRAPERS.map(s => <option key={s.value} value={s.value} className="bg-[var(--card)]">{s.label}</option>)}
                            </select>
                            <button onClick={() => handleSearch()} className="ml-2 text-[var(--accent)] hover:text-[var(--accent-2)] transition-colors">
                                <Search size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-[var(--card)] border border-[var(--border)] border-t-0 rounded-b-2xl shadow-xl overflow-hidden z-50">
                                {suggestions.map((s, i) => (
                                    <div
                                        key={i}
                                        onMouseDown={(e) => { e.preventDefault(); handleSearch(s); }}
                                        className={`px-4 py-2 cursor-pointer text-[15px] flex items-center gap-3 ${i === activeSuggestionIndex ? 'bg-[var(--accent)]/10 text-[var(--accent-2)]' : 'hover:bg-white/5'}`}
                                    >
                                        <Search size={14} className="opacity-40" />
                                        <span>{s}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Categories */}
                <div className="max-w-[1300px] mx-auto px-4 mt-3 flex items-center gap-6 text-[13px] text-[var(--muted)] font-medium">
                    <span className="flex items-center gap-1.5 pb-1.5 border-b-2 border-[var(--accent)] text-[var(--foreground)]">
                        <Search size={14} /> All
                    </span>
                    <a href={`/images?s=${encodeURIComponent(query)}`} className="flex items-center gap-1.5 pb-1.5 border-b-2 border-transparent hover:text-[var(--foreground)] transition-colors">
                        <ImageIcon size={14} /> Images
                    </a>
                    <a href={`/videos?s=${encodeURIComponent(query)}`} className="flex items-center gap-1.5 pb-1.5 border-b-2 border-transparent hover:text-[var(--foreground)] transition-colors">
                        <Video size={14} /> Videos
                    </a>
                    <a href={`/news?s=${encodeURIComponent(query)}`} className="flex items-center gap-1.5 pb-1.5 border-b-2 border-transparent hover:text-[var(--foreground)] transition-colors">
                        <Newspaper size={14} /> News
                    </a>
                </div>
            </header>

            {/* Content Area */}
            <div className="max-w-[1300px] mx-auto px-4 py-6 flex gap-12">
                <div className="flex-1 min-w-0 max-w-2xl">
                    {/* Stats */}
                    {!loading && results.length > 0 && (
                        <div className="text-[13px] text-[var(--muted)] mb-6 opacity-70">
                            About {results.length} results ({timeTaken.toFixed(2)} seconds)
                        </div>
                    )}

                    {loading ? (
                        <div className="space-y-8">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="animate-pulse space-y-3">
                                    <div className="h-3 bg-[var(--border)] rounded w-48" />
                                    <div className="h-5 bg-[var(--border)] rounded w-3/4" />
                                    <div className="space-y-2">
                                        <div className="h-3 bg-[var(--border)] rounded w-full" />
                                        <div className="h-3 bg-[var(--border)] rounded w-5/6" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="py-12 text-center border border-red-500/20 rounded-xl bg-red-500/5">
                            <p className="text-red-400 font-medium">{error}</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="py-20 text-center text-[var(--muted)]">
                            <p className="text-xl font-medium text-[var(--foreground)] mb-2">No results found for "{query}"</p>
                            <p>Try different keywords or check your spelling.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {results.map((result, i) => (
                                <article key={i} className="group flex flex-col items-start result-link">
                                    <div className="flex items-center gap-2 mb-1">
                                        {getFavicon(result.url) && (
                                            <img src={getFavicon(result.url)!} alt="" className="w-4 h-4" />
                                        )}
                                        <span className="text-[13px] result-url truncate max-w-sm">
                                            {result.url}
                                        </span>
                                    </div>
                                    <a href={result.url} target="_blank" rel="noopener noreferrer" className="block">
                                        <h2 className="text-[19px] font-medium text-[var(--accent-2)] result-title leading-tight mb-1">
                                            {result.title}
                                        </h2>
                                    </a>
                                    <p className="text-[14px] text-[var(--foreground)] opacity-80 leading-relaxed">
                                        {result.description}
                                    </p>
                                </article>
                            ))}
                        </div>
                    )}

                    {/* Related */}
                    {related.length > 0 && !loading && (
                        <div className="mt-12 pt-8 border-t border-[var(--border)]">
                            <h3 className="text-sm font-bold text-[var(--foreground)] mb-4 uppercase tracking-wider">Related Searches</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {related.map((term, i) => (
                                    <a key={i} href={`/search?s=${encodeURIComponent(term)}`} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] hover:bg-white/5 transition-fast">
                                        <Search size={14} className="text-[var(--muted)]" />
                                        <span className="text-[14px] font-medium">{term}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && results.length > 0 && (
                        <div className="mt-12 flex items-center gap-4">
                            <button
                                onClick={handlePreviousPage}
                                disabled={previousNpts.length === 0 || isNavigating}
                                className="flex items-center gap-2 px-5 py-2 rounded border border-[var(--border)] text-[14px] font-medium hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-fast"
                            >
                                <ArrowLeft size={16} /> Previous
                            </button>
                            <span className="text-sm font-medium text-[var(--muted)]">Page {currentPage}</span>
                            <button
                                onClick={handleNextPage}
                                disabled={!npt || isNavigating}
                                className="flex items-center gap-2 px-5 py-2 rounded border border-[var(--border)] text-[14px] font-medium hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-fast"
                            >
                                Next <ArrowRight size={16} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Sidebar - Videos */}
                {videos.length > 0 && !loading && (
                    <aside className="hidden lg:block w-72 flex-shrink-0">
                        <div className="sticky top-40">
                            <h3 className="text-[12px] font-bold text-[var(--muted)] uppercase tracking-widest mb-4">Video Results</h3>
                            <div className="space-y-6">
                                {videos.slice(0, 4).map((video, i) => {
                                    const thumbUrl = video.thumb?.url;
                                    const proxiedThumb = thumbUrl ? `/api/proxy?i=${encodeURIComponent(thumbUrl)}&s=landscape` : null;

                                    return (
                                        <a key={i} href={video.url} target="_blank" rel="noopener noreferrer" className="group block">
                                            <div className="relative aspect-video rounded-lg overflow-hidden bg-black/20 mb-2 border border-[var(--border)]">
                                                {proxiedThumb ? (
                                                    <img src={proxiedThumb} alt="" className="w-full h-full object-cover" />
                                                ) : <div className="flex items-center justify-center h-full"><Video size={20} /></div>}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                            </div>
                                            <h4 className="text-[14px] font-medium text-[var(--foreground)] leading-tight group-hover:text-[var(--accent-2)] group-hover:underline line-clamp-2">
                                                {video.title}
                                            </h4>
                                            <div className="text-[12px] text-[var(--muted)] mt-1">
                                                {video.author?.name || "Video"}
                                            </div>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    </aside>
                )}
            </div>

            {/* Back to Top */}
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
                className={`fixed bottom-6 right-6 p-3 rounded-full bg-[var(--accent)] text-white shadow-lg transition-fast z-50 hover:opacity-90 active:scale-95 ${showBackToTop ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
                <ArrowUp size={20} />
            </button>
        </main>
    );
}
