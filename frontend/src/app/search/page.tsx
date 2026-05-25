import type { Metadata } from "next";
import { Suspense } from "react";
import SearchResults from "./SearchResults";

type Props = { searchParams: Promise<{ s?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = (await searchParams).s ? decodeURIComponent((await searchParams).s!) : null;
  if (!q) return { title: "Search — Sorvx", description: "Private metasearch." };
  return {
    title: `${q} — Sorvx Search`,
    description: `Private search results for "${q}".`,
    openGraph: { title: `${q} — Sorvx Search`, description: `Private search results for "${q}".`, type: "website" },
    twitter: { card: "summary", title: `${q} — Sorvx Search`, description: `Private search results for "${q}".` },
  };
}

function Fallback() {
  return (
    <main className="min-h-screen bg-[var(--bg)] p-4">
      <div className="max-w-[var(--container)] mx-auto">
        <div className="space-y-7">{[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="skeleton h-3 w-48" />
            <div className="skeleton h-5 w-96" />
            <div className="skeleton h-3 w-full" />
          </div>
        ))}</div>
      </div>
    </main>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<Fallback />}><SearchResults /></Suspense>;
}
