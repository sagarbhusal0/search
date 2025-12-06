"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

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
                console.log("News API response:", data);
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
                        <span className="text-white border-b-2 border-[#d4af37] pb-1">News</span>
                        <a href={`/music?s=${encodeURIComponent(query)}`} className="text-[#888] hover:text-white">Music</a>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="space-y-6">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="animate-pulse space-y-2">
                                <div className="h-4 bg-[#333] rounded w-3/4" />
                                <div className="h-3 bg-[#333] rounded w-full" />
                                <div className="h-3 bg-[#333] rounded w-1/4" />
                            </div>
                        ))}
                    </div>
                ) : results.length === 0 ? (
                    <p className="text-[#888]">No news found for &quot;{query}&quot;</p>
                ) : (
                    <div className="space-y-6">
                        {results.map((news, i) => (
                            <article key={i} className="group">
                                <a href={news.url} target="_blank" rel="noopener noreferrer">
                                    <h2 className="text-[#8ab4f8] group-hover:underline text-base mb-1">
                                        {news.title}
                                    </h2>
                                    {news.description && (
                                        <p className="text-[#bbb] text-sm line-clamp-2 mb-1">{news.description}</p>
                                    )}
                                    <div className="flex gap-2 text-xs text-[#888]">
                                        {news.source?.name && <span>{news.source.name}</span>}
                                        {news.date && <span>• {news.date}</span>}
                                    </div>
                                </a>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

export default function NewsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#1a1a1a]" />}>
            <NewsContent />
        </Suspense>
    );
}
