"use client";

import { Suspense } from "react";
import SearchResults from "./SearchResults";

export default function SearchPage() {
    return (
        <Suspense fallback={<SearchLoading />}>
            <SearchResults />
        </Suspense>
    );
}

function SearchLoading() {
    return (
        <main className="min-h-screen bg-[#1a1a1a] p-4">
            <div className="max-w-5xl mx-auto">
                <div className="animate-pulse space-y-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="space-y-2">
                            <div className="h-3 bg-[#333] rounded w-48"></div>
                            <div className="h-5 bg-[#333] rounded w-96"></div>
                            <div className="h-3 bg-[#333] rounded w-full"></div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
