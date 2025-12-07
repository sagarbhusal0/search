"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, Clock, ExternalLink } from "lucide-react";
import Image from "next/image";

interface NewsResult {
    title: string;
    description?: string;
    url: string;
    date?: string;
    thumb?: { url?: string } | string;
    source?: { name?: string; url?: string };
}

function NewsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get("s") || "";
    const [results, setResults] = useState<NewsResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(query);
    const [scraper, setScraper] = useState("google");

    const SCRAPERS = [
        { value: "google", label: "Google" },
        { value: "ddg", label: "DuckDuckGo" },
        { value: "brave", label: "Brave" },
    ];

    useEffect(() => {
        if (!query) return;

        const fetchNews = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/news?s=${encodeURIComponent(query)}&scraper=${scraper}`);
                const data = await res.json();
                setResults(data.news || []);
            } catch (e) {
                console.error("News fetch error:", e);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, [query, scraper]);

    const handleSearch = () => {
        if (searchQuery.trim()) {
            router.push(`/news?s=${encodeURIComponent(searchQuery.trim())}`);
        }
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
                                placeholder="Search news..."
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
                        <span className="tab-active pb-2 whitespace-nowrap">News</span>
                        <a href={`/music?s=${encodeURIComponent(query)}`} className="text-[--text-secondary] hover:text-[--text-primary] transition whitespace-nowrap">Music</a>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="space-y-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="card-glass p-4 space-y-2">
                                <div className="h-4 shimmer rounded w-3/4" />
                                <div className="h-3 shimmer rounded w-full" />
                                <div className="h-3 shimmer rounded w-1/4" />
                            </div>
                        ))}
                    </div>
                ) : results.length === 0 ? (
                    <div className="card-glass p-8 text-center">
                        <p className="text-[--text-secondary]">No news found for &quot;{query}&quot;</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {results.map((news, i) => (
                            <a
                                key={i}
                                href={news.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block card-glass p-5 hover-lift group fade-in"
                                style={{ animationDelay: `${i * 0.05}s` }}
                            >
                                <div className="flex gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-[--primary-cyan] font-medium line-clamp-2 group-hover:underline mb-2">
                                            {news.title}
                                        </h2>
                                        {news.description && (
                                            <p className="text-[--text-secondary] text-sm line-clamp-2 mb-3">
                                                {news.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3 text-xs text-[--text-muted]">
                                            {news.source?.name && (
                                                <span className="font-medium text-[--primary-purple]">{news.source.name}</span>
                                            )}
                                            {news.date && (
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} /> {news.date}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ExternalLink size={16} className="text-[--text-muted] flex-shrink-0 mt-1" />
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

export default function NewsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen animated-bg" />}>
            <NewsContent />
        </Suspense>
    );
}
