"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, Play, Eye } from "lucide-react";
import Image from "next/image";

interface VideoResult {
    title: string;
    url: string;
    description?: string;
    thumb?: { url?: string } | string;
    author?: { name?: string; url?: string };
    date?: string;
    views?: string;
}

function VideosContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get("s") || "";
    const [results, setResults] = useState<VideoResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(query);
    const [scraper, setScraper] = useState("yt");

    const SCRAPERS = [
        { value: "yt", label: "YouTube" },
        { value: "ddg", label: "DuckDuckGo" },
    ];

    useEffect(() => {
        if (!query) return;

        const fetchVideos = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/videos?s=${encodeURIComponent(query)}&scraper=${scraper}`);
                const data = await res.json();
                setResults(data.video || []);
            } catch (e) {
                console.error("Videos fetch error:", e);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, [query, scraper]);

    const handleSearch = () => {
        if (searchQuery.trim()) {
            router.push(`/videos?s=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const getThumbUrl = (video: VideoResult): string => {
        if (typeof video.thumb === "string") return video.thumb;
        if (video.thumb?.url) return video.thumb.url;
        return "";
    };

    return (
        <main className="min-h-screen animated-bg">
            <header className="sticky top-0 glass z-20">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center gap-3 sm:gap-6">
                        <a href="/" className="flex-shrink-0">
                            <Image src="/logo.png" alt="Sorvx" width={40} height={40} />
                        </a>

                        <div className="flex-1 max-w-2xl flex gap-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                className="flex-1 h-11 px-5 input-glass text-sm"
                                placeholder="Search videos..."
                            />
                            <select
                                value={scraper}
                                onChange={(e) => setScraper(e.target.value)}
                                className="h-11 px-3 bg-slate-900/80 border border-violet-500/20 rounded-full text-sm focus:outline-none hidden sm:block"
                            >
                                {SCRAPERS.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                            <button onClick={handleSearch} className="btn-primary px-4">
                                <Search size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-6 mt-3 text-sm overflow-x-auto pb-1">
                        <a href={`/search?s=${encodeURIComponent(query)}`} className="text-slate-400 hover:text-white transition whitespace-nowrap">Web</a>
                        <a href={`/images?s=${encodeURIComponent(query)}`} className="text-slate-400 hover:text-white transition whitespace-nowrap">Images</a>
                        <span className="tab-active pb-2 whitespace-nowrap">Videos</span>
                        <a href={`/news?s=${encodeURIComponent(query)}`} className="text-slate-400 hover:text-white transition whitespace-nowrap">News</a>
                        <a href={`/music?s=${encodeURIComponent(query)}`} className="text-slate-400 hover:text-white transition whitespace-nowrap">Music</a>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(9)].map((_, i) => (
                            <div key={i} className="card-glass overflow-hidden">
                                <div className="aspect-video shimmer" />
                                <div className="p-4 space-y-2">
                                    <div className="h-4 shimmer rounded w-3/4" />
                                    <div className="h-3 shimmer rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : results.length === 0 ? (
                    <div className="card-glass p-8 text-center">
                        <p className="text-slate-400">No videos found for &quot;{query}&quot;</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {results.map((video, i) => (
                            <a
                                key={i}
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="card-glass overflow-hidden hover-lift group fade-in"
                                style={{ animationDelay: `${i * 0.05}s` }}
                            >
                                <div className="relative aspect-video bg-black/50">
                                    {getThumbUrl(video) && (
                                        <img
                                            src={getThumbUrl(video)}
                                            alt={video.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            loading="lazy"
                                        />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-14 h-14 rounded-full bg-violet-500/80 flex items-center justify-center">
                                            <Play size={24} className="text-white ml-1" fill="white" />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="text-cyan-400 font-medium line-clamp-2 mb-2 group-hover:underline">
                                        {video.title}
                                    </h3>
                                    {video.author?.name && (
                                        <p className="text-slate-400 text-sm">{video.author.name}</p>
                                    )}
                                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                        {video.views && (
                                            <span className="flex items-center gap-1">
                                                <Eye size={12} /> {video.views}
                                            </span>
                                        )}
                                        {video.date && <span>{video.date}</span>}
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

export default function VideosPage() {
    return (
        <Suspense fallback={<div className="min-h-screen animated-bg" />}>
            <VideosContent />
        </Suspense>
    );
}
