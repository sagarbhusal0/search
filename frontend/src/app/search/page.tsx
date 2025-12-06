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
        <main className="min-h-screen bg-black p-8">
            <div className="max-w-3xl mx-auto">
                <div className="animate-pulse space-y-6">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="space-y-2">
                            <div className="h-4 bg-gray-800 rounded w-1/3"></div>
                            <div className="h-6 bg-gray-800 rounded w-2/3"></div>
                            <div className="h-4 bg-gray-800 rounded w-full"></div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
