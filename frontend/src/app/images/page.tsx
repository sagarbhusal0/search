"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, ExternalLink } from "lucide-react";

interface ImageSource {
    url: string;
    width?: number;
    height?: number;
}

interface ImageResult {
    title?: string;
    url: string;
    source?: ImageSource[];
    thumb?: { url?: string } | string;
}

function ImagesContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get("s") || "";
    const [results, setResults] = useState<ImageResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(query);
    const [scraper, setScraper] = useState("ddg");
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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

    // Keyboard navigation
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (selectedIndex === null) return;

        if (e.key === "ArrowLeft") {
            e.preventDefault();
            setSelectedIndex(prev => prev !== null && prev > 0 ? prev - 1 : prev);
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            setSelectedIndex(prev => prev !== null && prev < results.length - 1 ? prev + 1 : prev);
        } else if (e.key === "Escape") {
            setSelectedIndex(null);
        }
    }, [selectedIndex, results.length]);

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    // Lock body scroll when preview is open
    useEffect(() => {
        if (selectedIndex !== null) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [selectedIndex]);

    const handleSearch = () => {
        if (searchQuery.trim()) {
            router.push(`/images?s=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const getThumbUrl = (img: ImageResult): string => {
        if (img.source && img.source.length > 1 && img.source[1]?.url) {
            return `/api/proxy?i=${encodeURIComponent(img.source[1].url)}&s=original`;
        }
        if (img.source && img.source.length > 0 && img.source[0]?.url) {
            return `/api/proxy?i=${encodeURIComponent(img.source[0].url)}&s=thumb`;
        }
        if (typeof img.thumb === "string") {
            return `/api/proxy?i=${encodeURIComponent(img.thumb)}&s=thumb`;
        }
        if (img.thumb && typeof img.thumb === "object" && img.thumb.url) {
            return `/api/proxy?i=${encodeURIComponent(img.thumb.url)}&s=thumb`;
        }
        return "";
    };

    const getFullUrl = (img: ImageResult): string => {
        if (img.source && img.source.length > 0 && img.source[0]?.url) {
            return `/api/proxy?i=${encodeURIComponent(img.source[0].url)}&s=original`;
        }
        return "";
    };

    const getOriginalUrl = (img: ImageResult): string => {
        if (img.source && img.source.length > 0 && img.source[0]?.url) {
            return img.source[0].url;
        }
        return img.url;
    };

    const selectedImage = selectedIndex !== null ? results[selectedIndex] : null;

    return (
        <main className="min-h-screen bg-[#1a1a1a] text-[#e8e6e3]">
            {/* Header */}
            <header className="sticky top-0 bg-[#1a1a1a] border-b border-[#333] z-20">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center gap-4">
                        <a href="/" className="text-xl font-bold">Sorvx</a>
                        <div className="flex-1 max-w-xl flex gap-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                className="flex-1 h-9 px-3 bg-[#2a2a2a] border border-[#444] rounded text-sm focus:outline-none"
                                placeholder="Search images..."
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
                            <button onClick={handleSearch} className="px-4 h-9 bg-[#3a3a3a] hover:bg-[#444] rounded text-sm transition">
                                Search
                            </button>
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

            {/* Image Grid */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {[...Array(24)].map((_, i) => (
                            <div key={i} className="aspect-square bg-[#2a2a2a] rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : results.length === 0 ? (
                    <p className="text-[#888] text-center py-12">No images found for &quot;{query}&quot;</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {results.map((img, i) => {
                            const thumbUrl = getThumbUrl(img);

                            return (
                                <div
                                    key={i}
                                    onClick={() => setSelectedIndex(i)}
                                    className="group cursor-pointer relative aspect-square bg-[#2a2a2a] rounded-lg overflow-hidden hover:ring-2 hover:ring-[#d4af37] transition-all"
                                >
                                    {thumbUrl ? (
                                        <img
                                            src={thumbUrl}
                                            alt={img.title || ""}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                            loading="lazy"
                                            onError={(e) => {
                                                e.currentTarget.parentElement!.style.display = "none";
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-[#666]">
                                            No preview
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Image Preview Modal */}
            {selectedImage && selectedIndex !== null && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
                    onClick={() => setSelectedIndex(null)}
                >
                    {/* Close button */}
                    <button
                        onClick={() => setSelectedIndex(null)}
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition z-10"
                    >
                        <X size={28} />
                    </button>

                    {/* Left arrow */}
                    {selectedIndex > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedIndex(selectedIndex - 1); }}
                            className="absolute left-2 md:left-6 p-2 md:p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition"
                        >
                            <ChevronLeft size={32} />
                        </button>
                    )}

                    {/* Right arrow */}
                    {selectedIndex < results.length - 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedIndex(selectedIndex + 1); }}
                            className="absolute right-2 md:right-6 p-2 md:p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition"
                        >
                            <ChevronRight size={32} />
                        </button>
                    )}

                    {/* Image container */}
                    <div
                        className="flex flex-col items-center max-w-[90vw] max-h-[85vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={getFullUrl(selectedImage)}
                            alt={selectedImage.title || ""}
                            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
                            onError={(e) => {
                                // Fallback to thumb if full fails
                                e.currentTarget.src = getThumbUrl(selectedImage);
                            }}
                        />

                        {/* Image info */}
                        <div className="mt-4 text-center max-w-2xl px-4">
                            {selectedImage.title && (
                                <h3 className="text-white text-lg font-medium line-clamp-2 mb-2">
                                    {selectedImage.title}
                                </h3>
                            )}
                            <a
                                href={getOriginalUrl(selectedImage)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-[#8ab4f8] hover:underline text-sm"
                            >
                                Open original <ExternalLink size={14} />
                            </a>
                            <p className="text-[#666] text-xs mt-2">
                                {selectedIndex + 1} of {results.length} • Use ← → keys to navigate
                            </p>
                        </div>
                    </div>
                </div>
            )}
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
