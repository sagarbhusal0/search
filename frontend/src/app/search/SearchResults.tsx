"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search, ExternalLink } from "lucide-react";

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

export default function SearchResults() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get("s") || "";
    const [results, setResults] = useState<WebResult[]>([]);
    const [videos, setVideos] = useState<VideoResult[]>([]);
    const [related, setRelated] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState(query);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [timeTaken, setTimeTaken] = useState<number>(0);
    const inputRef = useRef<HTMLInputElement>(null);

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
                const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                const data: ApiResponse = await response.json();

                setTimeTaken((Date.now() - startTime) / 1000);

                if (data.status && !data.web) {
                    setError(data.status);
                    setResults([]);
                } else {
                    setResults(data.web || []);
                    setVideos(data.video || []);
                    setRelated(data.related || []);
                }
            } catch (err) {
                setError("Failed to fetch results.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query, router]);

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
        if (searchQ.trim() && searchQ !== query) {
            router.push(`/search?s=${encodeURIComponent(searchQ.trim())}`);
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

    return (
        <main className="min-h-screen bg-[#1a1a1a] text-[#e8e6e3]">
            {/* Header */}
            <header className="sticky top-0 bg-[#1a1a1a] border-b border-[#333] z-10">
                <div className="max-w-6xl mx-auto px-4 py-3">
                    <div className="flex items-center gap-4">
                        {/* Logo */}
                        <a href="/" className="text-xl font-bold text-[#e8e6e3]">Sorvx</a>

                        {/* Search Box */}
                        <div className="relative flex-1 max-w-xl">
                            <div className="flex items-center bg-[#2a2a2a] border border-[#444] rounded-md">
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
                                    className="flex-1 h-9 px-3 bg-transparent text-[#e8e6e3] placeholder-[#888] focus:outline-none text-sm"
                                />
                                <button
                                    onClick={() => handleSearch()}
                                    className="px-3 h-9 bg-[#3a3a3a] text-[#e8e6e3] hover:bg-[#444] border-l border-[#444] text-sm"
                                >
                                    Search
                                </button>
                            </div>

                            {/* Autocomplete */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 bg-[#2a2a2a] border border-[#444] border-t-0 rounded-b-md z-50">
                                    {suggestions.map((s, i) => (
                                        <div
                                            key={i}
                                            className="px-3 py-2 cursor-pointer text-sm hover:bg-[#3a3a3a]"
                                            onMouseDown={() => handleSearch(s)}
                                        >
                                            <Search size={12} className="inline mr-2 text-[#888]" />
                                            {s}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Nav */}
                        <div className="flex gap-4 text-sm">
                            <a href="/" className="text-[#888] hover:text-white">Home</a>
                            <a href="/settings" className="text-[#888] hover:text-white">Settings</a>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 mt-3 text-sm">
                        <span className="text-[#e8e6e3] border-b-2 border-[#d4af37] pb-1">Web</span>
                        <a href={`/images?s=${encodeURIComponent(query)}`} className="text-[#888] hover:text-[#e8e6e3]">Images</a>
                        <a href={`/videos?s=${encodeURIComponent(query)}`} className="text-[#888] hover:text-[#e8e6e3]">Videos</a>
                        <a href={`/news?s=${encodeURIComponent(query)}`} className="text-[#888] hover:text-[#e8e6e3]">News</a>
                        <a href={`/music?s=${encodeURIComponent(query)}`} className="text-[#888] hover:text-[#e8e6e3]">Music</a>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-4 flex gap-8">
                {/* Main Results */}
                <div className="flex-1 min-w-0">
                    {!loading && (
                        <p className="text-xs text-[#888] mb-4">Took {timeTaken.toFixed(2)}s</p>
                    )}

                    {loading ? (
                        <div className="space-y-6">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="animate-pulse space-y-2">
                                    <div className="h-3 bg-[#333] rounded w-48"></div>
                                    <div className="h-5 bg-[#333] rounded w-96"></div>
                                    <div className="h-3 bg-[#333] rounded w-full"></div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <p className="text-[#888]">{error}</p>
                    ) : results.length === 0 ? (
                        <p className="text-[#888]">No results found for &quot;{query}&quot;</p>
                    ) : (
                        <div className="space-y-6">
                            {results.map((result, index) => (
                                <article key={index} className="group">
                                    <a href={result.url} target="_blank" rel="noopener noreferrer">
                                        <div className="flex items-center gap-2 text-xs text-[#888] mb-1">
                                            {getFavicon(result.url) && (
                                                <img
                                                    src={getFavicon(result.url)!}
                                                    alt=""
                                                    className="w-4 h-4"
                                                    onError={(e) => (e.currentTarget.style.display = "none")}
                                                />
                                            )}
                                            <span className="truncate">{result.url}</span>
                                        </div>
                                        <h2 className="text-[#8ab4f8] group-hover:underline text-base mb-1">
                                            {result.title}
                                        </h2>
                                        <p className="text-[#bbb] text-sm line-clamp-2">
                                            {result.description}
                                        </p>
                                    </a>
                                </article>
                            ))}
                        </div>
                    )}

                    {/* Related Searches */}
                    {related.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-[#333]">
                            <h3 className="text-sm font-bold mb-3">Related searches</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {related.map((term, i) => (
                                    <a
                                        key={i}
                                        href={`/search?s=${encodeURIComponent(term)}`}
                                        className="text-sm text-[#8ab4f8] hover:underline"
                                    >
                                        {term}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar - Videos */}
                {videos.length > 0 && (
                    <aside className="w-72 flex-shrink-0 hidden lg:block">
                        <h3 className="text-sm font-bold mb-3">Videos</h3>
                        <div className="space-y-4">
                            {videos.slice(0, 4).map((video, i) => (
                                <a key={i} href={video.url} target="_blank" rel="noopener noreferrer" className="block group">
                                    {video.thumb?.url && (
                                        <img
                                            src={video.thumb.url}
                                            alt={video.title}
                                            className="w-full h-auto rounded mb-2"
                                        />
                                    )}
                                    <p className="text-sm text-[#8ab4f8] group-hover:underline line-clamp-2">{video.title}</p>
                                    {video.views && <p className="text-xs text-[#888] mt-1">{video.views}</p>}
                                </a>
                            ))}
                        </div>
                    </aside>
                )}
            </div>
        </main>
    );
}
