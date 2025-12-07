"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface ImageResult {
    url: string;
    thumb?: { url?: string } | string;
    source?: { url?: string; title?: string };
}

function ImagesContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get("s") || "";
    const [results, setResults] = useState<ImageResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(query);
    const [scraper, setScraper] = useState("ddg");

    const SCRAPERS = [
        { value: "ddg", label: "DuckDuckGo" },
        { value: "google", label: "Google" },
        { value: "yandex", label: "Yandex" },
        { value: "brave", label: "Brave" },
    ];

    useEffect(() => {
        if (!query) return;

        const fetchImages = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/images?s=${encodeURIComponent(query)}&scraper=${scraper}`);
                const data = await res.json();
                console.log("Images API response:", data);
                setResults(data.image || []);
            } catch (e) {
                console.error("Images fetch error:", e);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        fetchImages();
    }, [query, scraper]);

    const handleSearch = () => {
        if (searchQuery.trim()) {
            router.push(`/images?s=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const getThumbUrl = (img: ImageResult): string => {
        let url: string;
        if (typeof img.thumb === "string") {
            url = img.thumb;
        } else if (img.thumb?.url) {
            url = img.thumb.url;
        } else {
            url = img.url;
        }
        // Proxy the image to bypass CORS
        return `/api/proxy?url=${encodeURIComponent(url)}`;
    };

    const getFullUrl = (img: ImageResult): string => {
        return `/api/proxy?url=${encodeURIComponent(img.url)}`;
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
                        <span className="text-white border-b-2 border-[#d4af37] pb-1">Images</span>
                        <a href={`/videos?s=${encodeURIComponent(query)}`} className="text-[#888] hover:text-white">Videos</a>
                        <a href={`/news?s=${encodeURIComponent(query)}`} className="text-[#888] hover:text-white">News</a>
                        <a href={`/music?s=${encodeURIComponent(query)}`} className="text-[#888] hover:text-white">Music</a>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {[...Array(18)].map((_, i) => (
                            <div key={i} className="aspect-square bg-[#333] rounded animate-pulse" />
                        ))}
                    </div>
                ) : results.length === 0 ? (
                    <p className="text-[#888]">No images found for &quot;{query}&quot;</p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {results.map((img, i) => (
                            <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="block">
                                <img
                                    src={getThumbUrl(img)}
                                    alt=""
                                    className="w-full aspect-square object-cover rounded hover:opacity-80 transition bg-[#333]"
                                    loading="lazy"
                                    onError={(e) => {
                                        // Fallback to full image URL through proxy
                                        if (!e.currentTarget.src.includes(encodeURIComponent(img.url))) {
                                            e.currentTarget.src = getFullUrl(img);
                                        }
                                    }}
                                />
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

export default function ImagesPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#1a1a1a]" />}>
            <ImagesContent />
        </Suspense>
    );
}
