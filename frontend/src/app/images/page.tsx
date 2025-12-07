"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, ExternalLink, Search } from "lucide-react";
import Image from "next/image";

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
                                placeholder="Search images..."
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
                        <span className="tab-active pb-2 whitespace-nowrap">Images</span>
                        <a href={`/videos?s=${encodeURIComponent(query)}`} className="text-slate-400 hover:text-white transition whitespace-nowrap">Videos</a>
                        <a href={`/news?s=${encodeURIComponent(query)}`} className="text-slate-400 hover:text-white transition whitespace-nowrap">News</a>
                        <a href={`/music?s=${encodeURIComponent(query)}`} className="text-slate-400 hover:text-white transition whitespace-nowrap">Music</a>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {[...Array(24)].map((_, i) => (
                            <div key={i} className="aspect-square shimmer rounded-xl" />
                        ))}
                    </div>
                ) : results.length === 0 ? (
                    <div className="card-glass p-8 text-center">
                        <p className="text-slate-400">No images found for &quot;{query}&quot;</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {results.map((img, i) => {
                            const thumbUrl = getThumbUrl(img);

                            return (
                                <div
                                    key={i}
                                    onClick={() => setSelectedIndex(i)}
                                    className="group cursor-pointer relative aspect-square rounded-xl overflow-hidden bg-slate-800/50 hover:ring-2 hover:ring-cyan-400 transition-all fade-in"
                                    style={{ animationDelay: `${(i % 12) * 0.03}s` }}
                                >
                                    {thumbUrl ? (
                                        <img
                                            src={thumbUrl}
                                            alt={img.title || ""}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                            loading="lazy"
                                            onError={(e) => {
                                                e.currentTarget.parentElement!.style.display = "none";
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                                            No preview
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                        <p className="text-white text-xs line-clamp-2">{img.title}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedImage && selectedIndex !== null && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center"
                    onClick={() => setSelectedIndex(null)}
                >
                    <button
                        onClick={() => setSelectedIndex(null)}
                        className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition z-10"
                    >
                        <X size={24} className="text-white" />
                    </button>

                    {selectedIndex > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedIndex(selectedIndex - 1); }}
                            className="absolute left-2 md:left-6 p-3 bg-white/10 rounded-full hover:bg-white/20 transition"
                        >
                            <ChevronLeft size={28} className="text-white" />
                        </button>
                    )}

                    {selectedIndex < results.length - 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedIndex(selectedIndex + 1); }}
                            className="absolute right-2 md:right-6 p-3 bg-white/10 rounded-full hover:bg-white/20 transition"
                        >
                            <ChevronRight size={28} className="text-white" />
                        </button>
                    )}

                    <div
                        className="flex flex-col items-center max-w-[90vw] max-h-[85vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={getFullUrl(selectedImage)}
                            alt={selectedImage.title || ""}
                            className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
                            onError={(e) => {
                                e.currentTarget.src = getThumbUrl(selectedImage);
                            }}
                        />

                        <div className="mt-4 text-center max-w-2xl px-4 fade-in">
                            {selectedImage.title && (
                                <h3 className="text-white text-lg font-medium line-clamp-2 mb-3">
                                    {selectedImage.title}
                                </h3>
                            )}
                            <div className="flex items-center justify-center gap-4">
                                <a
                                    href={getOriginalUrl(selectedImage)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-glass text-sm inline-flex items-center gap-2 px-4 py-2"
                                >
                                    Open original <ExternalLink size={14} />
                                </a>
                            </div>
                            <p className="text-slate-500 text-xs mt-3">
                                {selectedIndex + 1} of {results.length} • Use ← → keys
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
        <Suspense fallback={<div className="min-h-screen animated-bg" />}>
            <ImagesContent />
        </Suspense>
    );
}
