"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search, ExternalLink } from "lucide-react";
import Image from "next/image";

interface WebResult {
    title: string;
    description: string;
    url: string;
}

interface VideoResult {
    title: string;
    url: string;
    thumb?: { url: string };
    views?: string;
}

interface ApiResponse {
    web?: WebResult[];
    video?: VideoResult[];
    related?: string[];
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
            } catch {
                setError("Failed to fetch results.");
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query, router]);

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
                    setSuggestions(data[1].slice(0, 6));
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
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        } catch {
            return null;
        }
    };

    return (
        <main className="min-h-screen animated-bg">
            {/* Header */}
            <header className="sticky top-0 glass z-20">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center gap-3 sm:gap-6">
                        <a href="/" className="flex-shrink-0">
                            <Image src="/logo.png" alt="Sorvx" width={40} height={40} />
                        </a>

                        <div className="relative flex-1 max-w-2xl">
                            <div className="flex items-center">
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
                                    className="w-full h-11 px-5 pr-12 input-glass text-sm"
                                    placeholder="Search..."
                                />
                                <button
                                    onClick={() => handleSearch()}
                                    className="absolute right-1 p-2 rounded-full hover:bg-violet-500/20 transition"
                                >
                                    <Search size={18} className="text-cyan-400" />
                                </button>
                            </div>

                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 glass rounded-xl overflow-hidden z-50">
                                    {suggestions.map((s, i) => (
                                        <div
                                            key={i}
                                            className="px-4 py-2.5 cursor-pointer text-sm hover:bg-violet-500/10 transition"
                                            onMouseDown={() => handleSearch(s)}
                                        >
                                            <Search size={14} className="inline mr-2 text-slate-500" />
                                            {s}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <a href="/settings" className="text-slate-400 hover:text-white transition hidden sm:block text-sm">
                            Settings
                        </a>
                    </div>

                    <div className="flex gap-6 mt-3 text-sm overflow-x-auto pb-1">
                        <span className="tab-active pb-2 whitespace-nowrap">Web</span>
                        <a href={`/images?s=${encodeURIComponent(query)}`} className="text-slate-400 hover:text-white transition whitespace-nowrap">Images</a>
                        <a href={`/videos?s=${encodeURIComponent(query)}`} className="text-slate-400 hover:text-white transition whitespace-nowrap">Videos</a>
                        <a href={`/news?s=${encodeURIComponent(query)}`} className="text-slate-400 hover:text-white transition whitespace-nowrap">News</a>
                        <a href={`/music?s=${encodeURIComponent(query)}`} className="text-slate-400 hover:text-white transition whitespace-nowrap">Music</a>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-8">
                <div className="flex-1 min-w-0">
                    {!loading && (
                        <p className="text-xs text-slate-500 mb-6 fade-in">
                            Found results in {timeTaken.toFixed(2)}s
                        </p>
                    )}

                    {loading ? (
                        <div className="space-y-6">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="h-3 shimmer rounded w-48"></div>
                                    <div className="h-5 shimmer rounded w-80"></div>
                                    <div className="h-3 shimmer rounded w-full"></div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="card-glass p-6 text-center">
                            <p className="text-slate-400">{error}</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="card-glass p-6 text-center">
                            <p className="text-slate-400">No results found for &quot;{query}&quot;</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {results.map((result, index) => (
                                <article
                                    key={index}
                                    className="card-glass p-4 hover-lift fade-in"
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    <a href={result.url} target="_blank" rel="noopener noreferrer" className="block">
                                        <div className="flex items-center gap-2 mb-2">
                                            {getFavicon(result.url) && (
                                                <img src={getFavicon(result.url)!} alt="" className="w-5 h-5 rounded" />
                                            )}
                                            <span className="text-xs text-slate-500 truncate">{result.url}</span>
                                        </div>
                                        <h2 className="text-cyan-400 hover:underline text-lg font-medium mb-1">
                                            {result.title}
                                        </h2>
                                        <p className="text-slate-400 text-sm line-clamp-2">
                                            {result.description}
                                        </p>
                                    </a>
                                </article>
                            ))}
                        </div>
                    )}

                    {related.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-violet-500/15 fade-in">
                            <h3 className="text-sm font-medium mb-4 gradient-text">Related searches</h3>
                            <div className="flex flex-wrap gap-2">
                                {related.slice(0, 8).map((term, i) => (
                                    <a
                                        key={i}
                                        href={`/search?s=${encodeURIComponent(term)}`}
                                        className="btn-glass text-sm px-4 py-2"
                                    >
                                        {term}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {videos.length > 0 && (
                    <aside className="w-full lg:w-80 flex-shrink-0">
                        <h3 className="text-sm font-medium mb-4 gradient-text">Videos</h3>
                        <div className="space-y-4">
                            {videos.slice(0, 4).map((video, i) => (
                                <a key={i} href={video.url} target="_blank" rel="noopener noreferrer" className="block card-glass overflow-hidden hover-lift">
                                    {video.thumb?.url && (
                                        <img src={video.thumb.url} alt={video.title} className="w-full h-auto" />
                                    )}
                                    <div className="p-3">
                                        <p className="text-sm text-cyan-400 line-clamp-2">{video.title}</p>
                                        {video.views && <p className="text-xs text-slate-500 mt-1">{video.views}</p>}
                                    </div>
                                </a>
                            ))}
                        </div>
                    </aside>
                )}
            </div>
        </main>
    );
}
