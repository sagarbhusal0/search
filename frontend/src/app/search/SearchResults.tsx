"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, ArrowLeft, ExternalLink } from "lucide-react";

interface SearchResult {
    title: string;
    description: string;
    url: string;
    favicon?: string;
}

interface ApiResponse {
    web?: SearchResult[];
    status?: string;
}

export default function SearchResults() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get("q") || "";
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState(query);

    useEffect(() => {
        if (!query) {
            router.push("/");
            return;
        }

        const fetchResults = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(
                    `/api/search?q=${encodeURIComponent(query)}`
                );
                const data: ApiResponse = await response.json();

                if (data.status && !data.web) {
                    setError(data.status);
                    setResults([]);
                } else {
                    setResults(data.web || []);
                }
            } catch (err) {
                setError("Failed to fetch results. Please try again.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query, router]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim() && searchQuery !== query) {
            router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    return (
        <main className="min-h-screen bg-black">
            {/* Header */}
            <header className="sticky top-0 bg-black/80 backdrop-blur-sm border-b border-gray-800 z-10">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={() => router.push("/")}
                        className="text-gray-500 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>

                    <form onSubmit={handleSearch} className="flex-1 max-w-xl">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className="w-full h-12 px-4 pr-12 bg-gray-900/50 border border-gray-800 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                            />
                            <button
                                type="submit"
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-white transition-colors"
                            >
                                <Search size={18} />
                            </button>
                        </div>
                    </form>
                </div>
            </header>

            {/* Results */}
            <div className="max-w-3xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="space-y-6">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="space-y-2 animate-pulse">
                                <div className="h-4 bg-gray-800 rounded w-1/3"></div>
                                <div className="h-6 bg-gray-800 rounded w-2/3"></div>
                                <div className="h-4 bg-gray-800 rounded w-full"></div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">{error}</p>
                    </div>
                ) : results.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No results found for &quot;{query}&quot;</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <p className="text-gray-500 text-sm">
                            Results for &quot;{query}&quot;
                        </p>
                        {results.map((result, index) => (
                            <article key={index} className="group">
                                <a
                                    href={result.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                >
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                                        {result.favicon && (
                                            <img
                                                src={result.favicon}
                                                alt=""
                                                className="w-4 h-4"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = "none";
                                                }}
                                            />
                                        )}
                                        <span className="truncate">{result.url}</span>
                                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <h2 className="text-lg text-white group-hover:text-blue-400 transition-colors mb-1">
                                        {result.title}
                                    </h2>
                                    <p className="text-gray-400 text-sm line-clamp-2">
                                        {result.description}
                                    </p>
                                </a>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
