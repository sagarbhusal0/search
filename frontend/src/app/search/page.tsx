import type { Metadata } from "next";
import { Suspense } from "react";
import SearchResults from "./SearchResults";

type Props = {
    searchParams: Promise<{ s?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
    const resolvedSearchParams = await searchParams;
    const query = resolvedSearchParams.s ? decodeURIComponent(resolvedSearchParams.s) : null;

    if (!query) {
        return {
            title: "Search | Sorvx",
            description: "Secure, private search for the modern web.",
        };
    }

    return {
        title: `${query} - Sorvx Search`,
        description: `Search results for "${query}" on Sorvx. Private, fast, and tracking-free.`,
        openGraph: {
            title: `${query} - Sorvx Search`,
            description: `Explore private search results for "${query}".`,
            type: "website",
        },
        twitter: {
            card: "summary",
            title: `${query} - Sorvx Search`,
            description: `Private search results for "${query}".`,
        },
    };
}

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
