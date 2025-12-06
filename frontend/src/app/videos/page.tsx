"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

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
            } catch {
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

    return (
        <main className="min-h-screen bg-[#1a1a1a] text-[#e8e6e3]">
            <header className="sticky top-0 bg-[#1a1a1a] border-b border-[#333] z-10">
                <div className="max-w-6xl mx-auto px-4 py-3">
                    <div className="flex items-center gap-4">
                        <a href="/" className="text-xl font-bold">Sorvx</a>
                        <div className="flex-1 max-w-xl flex gap-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                className="flex-1 h-9 px-3 bg-[#2a2a2a] border border-[#444] rounded text-sm focus:outline-none"
                            />
                            <select
                                value={scraper}
                                onChange={(e) => setScraper(e.target.value)}
                                className="h-9 px-2 bg-[#2a2a2a] border border-[#444] rounded text-sm focus:outline-none"
                            >
                                {SCRAPERS.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                            <button onClick={handleSearch} className="px-3 h-9 bg-[#3a3a3a] rounded text-sm">Search</button>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-3 text-sm">
                        <a href={`/search?s=${encodeURIComponent(query)}`} className="text-[#888] hover:text-white">Web</a>
                        <a href={`/images?s=${encodeURIComponent(query)}`} className="text-[#888] hover:text-white">Images</a>
                        <span className="text-white border-b-2 border-[#d4af37] pb-1">Videos</span>
                        <a href={`/news?s=${encodeURIComponent(query)}`} className="text-[#888] hover:text-white">News</a>
                        <a href={`/music?s=${encodeURIComponent(query)}`} className="text-[#888] hover:text-white">Music</a>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(9)].map((_, i) => (
                            <div key={i} className="animate-pulse">
                                <div className="aspect-video bg-[#333] rounded mb-2" />
                                <div className="h-4 bg-[#333] rounded w-3/4 mb-1" />
                                <div className="h-3 bg-[#333] rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : results.length === 0 ? (
                    <p className="text-[#888]">No videos found</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {results.map((video, i) => (
                            <a key={i} href={video.url} target="_blank" rel="noopener noreferrer" className="block group">
                                {video.thumb?.url && (
                                    <img
                                        src={video.thumb.url}
                                        alt={video.title}
                                        className="w-full aspect-video object-cover rounded mb-2 group-hover:opacity-80 transition"
                                        loading="lazy"
                                    />
                                )}
                                <p className="text-sm text-[#8ab4f8] group-hover:underline line-clamp-2">{video.title}</p>
                                <p className="text-xs text-[#888] mt-1">
                                    {video.author?.name && <span>{video.author.name} • </span>}
                                    {video.views}
                                </p>
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
        <Suspense fallback={<div className="min-h-screen bg-[#1a1a1a]" />}>
            <VideosContent />
        </Suspense>
    );
}
