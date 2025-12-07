"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, Music, User, PlayCircle } from "lucide-react";
import Image from "next/image";

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
    const [playing, setPlaying] = useState<number | null>(null);

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
                                placeholder="Search music..."
                            />
                            <select
                                value={scraper}
                                onChange={(e) => setScraper(e.target.value)}
                                className="h-11 px-3 glass rounded-full text-sm focus:outline-none hidden sm:block"
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
                        <a href={`/search?s=${encodeURIComponent(query)}`} className="text-[--text-secondary] hover:text-[--text-primary] transition whitespace-nowrap">Web</a>
                        <a href={`/images?s=${encodeURIComponent(query)}`} className="text-[--text-secondary] hover:text-[--text-primary] transition whitespace-nowrap">Images</a>
                        <a href={`/videos?s=${encodeURIComponent(query)}`} className="text-[--text-secondary] hover:text-[--text-primary] transition whitespace-nowrap">Videos</a>
                        <a href={`/news?s=${encodeURIComponent(query)}`} className="text-[--text-secondary] hover:text-[--text-primary] transition whitespace-nowrap">News</a>
                        <span className="tab-active pb-2 whitespace-nowrap">Music</span>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="space-y-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="card-glass p-4 flex gap-4">
                                <div className="w-16 h-16 shimmer rounded-lg" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 shimmer rounded w-3/4" />
                                    <div className="h-3 shimmer rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : results.length === 0 ? (
                    <div className="card-glass p-8 text-center">
                        <p className="text-[--text-secondary]">No music found for &quot;{query}&quot;</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {results.map((track, i) => (
                            <div
                                key={i}
                                className="card-glass p-4 hover-lift group fade-in"
                                style={{ animationDelay: `${i * 0.05}s` }}
                            >
                                <div className="flex gap-4">
                                    {/* Album Art */}
                                    <div className="relative w-16 h-16 flex-shrink-0">
                                        {getThumbUrl(track) ? (
                                            <img
                                                src={getThumbUrl(track)!}
                                                alt={track.title}
                                                className="w-full h-full object-cover rounded-lg"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-[--primary-purple] to-[--primary-cyan] rounded-lg flex items-center justify-center">
                                                <Music size={24} className="text-white" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Track Info */}
                                    <div className="flex-1 min-w-0">
                                        <a
                                            href={track.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[--primary-cyan] font-medium line-clamp-1 hover:underline"
                                        >
                                            {track.title}
                                        </a>
                                        {getAuthorName(track) && (
                                            <p className="text-[--text-secondary] text-sm flex items-center gap-1 mt-1">
                                                <User size={12} /> {getAuthorName(track)}
                                            </p>
                                        )}
                                        {track.plays && (
                                            <p className="text-[--text-muted] text-xs mt-1">
                                                {track.plays} plays
                                            </p>
                                        )}

                                        {/* Audio Player */}
                                        {getStreamUrl(track) && (
                                            <div className="mt-3">
                                                <audio
                                                    controls
                                                    className="w-full h-8 opacity-80 hover:opacity-100 transition"
                                                    preload="none"
                                                    onPlay={() => setPlaying(i)}
                                                    onPause={() => playing === i && setPlaying(null)}
                                                >
                                                    <source src={getStreamUrl(track)!} />
                                                </audio>
                                            </div>
                                        )}
                                    </div>
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
        <Suspense fallback={<div className="min-h-screen animated-bg" />}>
            <MusicContent />
        </Suspense>
    );
}
