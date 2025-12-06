"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface MusicResult {
    title: string;
    url: string;
    thumb?: { url?: string } | string;
    author?: { name?: string; url?: string } | string;
    stream?: { url?: string } | string;
    date?: string;
    plays?: string;
}

function MusicContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get("s") || "";
    const [results, setResults] = useState<MusicResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(query);
    const [scraper, setScraper] = useState("sc");

    const SCRAPERS = [
        { value: "sc", label: "SoundCloud" },
    ];

    useEffect(() => {
        if (!query) return;

        const fetchMusic = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/music?s=${encodeURIComponent(query)}&scraper=${scraper}`);
                const data = await res.json();
                console.log("Music API response:", data);
                // Music API might return "music" or "audio" array
                setResults(data.music || data.audio || []);
            } catch (e) {
                console.error("Music fetch error:", e);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMusic();
    }, [query, scraper]);

    const handleSearch = () => {
        if (searchQuery.trim()) {
            router.push(`/music?s=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const getThumbUrl = (item: MusicResult): string | null => {
        if (typeof item.thumb === "string") return item.thumb;
        if (item.thumb?.url) return item.thumb.url;
        return null;
    };

    const getAuthorName = (item: MusicResult): string | null => {
        if (typeof item.author === "string") return item.author;
        if (item.author?.name) return item.author.name;
        return null;
    };

    const getStreamUrl = (item: MusicResult): string | null => {
        if (typeof item.stream === "string") return item.stream;
        if (item.stream?.url) return item.stream.url;
        return null;
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
                        <a href={`/videos?s=${encodeURIComponent(query)}`} className="text-[#888] hover:text-white">Videos</a>
                        <a href={`/news?s=${encodeURIComponent(query)}`} className="text-[#888] hover:text-white">News</a>
                        <span className="text-white border-b-2 border-[#d4af37] pb-1">Music</span>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="space-y-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="flex gap-4 animate-pulse">
                                <div className="w-16 h-16 bg-[#333] rounded" />
                                <div className="flex-1">
                                    <div className="h-4 bg-[#333] rounded w-3/4 mb-2" />
                                    <div className="h-3 bg-[#333] rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : results.length === 0 ? (
                    <p className="text-[#888]">No music found for &quot;{query}&quot;</p>
                ) : (
                    <div className="space-y-4">
                        {results.map((track, i) => (
                            <div key={i} className="flex gap-4 group">
                                {getThumbUrl(track) && (
                                    <img
                                        src={getThumbUrl(track)!}
                                        alt={track.title}
                                        className="w-16 h-16 object-cover rounded bg-[#333]"
                                        loading="lazy"
                                    />
                                )}
                                <div className="flex-1">
                                    <a href={track.url} target="_blank" rel="noopener noreferrer">
                                        <p className="text-sm text-[#8ab4f8] group-hover:underline">{track.title}</p>
                                    </a>
                                    {getAuthorName(track) && (
                                        <p className="text-xs text-[#888] mt-1">{getAuthorName(track)}</p>
                                    )}
                                    {track.plays && <p className="text-xs text-[#666] mt-1">{track.plays} plays</p>}
                                    {getStreamUrl(track) && (
                                        <audio controls className="mt-2 h-8 w-full max-w-md" preload="none">
                                            <source src={getStreamUrl(track)!} />
                                        </audio>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

export default function MusicPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#1a1a1a]" />}>
            <MusicContent />
        </Suspense>
    );
}
