"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface MusicResult {
    title: string;
    url: string;
    thumb?: { url: string };
    author?: { name: string };
    stream?: { url: string };
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
        { value: "yt", label: "YouTube Music" },
    ];

    useEffect(() => {
        if (!query) return;

        const fetchMusic = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/music?s=${encodeURIComponent(query)}&scraper=${scraper}`);
                const data = await res.json();
                setResults(data.music || data.audio || []);
            } catch {
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
                    <p className="text-[#888]">No music found</p>
                ) : (
                    <div className="space-y-4">
                        {results.map((track, i) => (
                            <a key={i} href={track.url} target="_blank" rel="noopener noreferrer" className="flex gap-4 group">
                                {track.thumb?.url && (
                                    <img
                                        src={track.thumb.url}
                                        alt={track.title}
                                        className="w-16 h-16 object-cover rounded"
                                        loading="lazy"
                                    />
                                )}
                                <div className="flex-1">
                                    <p className="text-sm text-[#8ab4f8] group-hover:underline">{track.title}</p>
                                    {track.author?.name && <p className="text-xs text-[#888] mt-1">{track.author.name}</p>}
                                    {track.stream?.url && (
                                        <audio controls className="mt-2 h-8 w-full" src={track.stream.url}>
                                            Your browser does not support audio.
                                        </audio>
                                    )}
                                </div>
                            </a>
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
