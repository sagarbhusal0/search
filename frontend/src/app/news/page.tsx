"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import SearchHeader from "../components/SearchHeader";
import BackToTop from "../components/BackToTop";

interface NewsResult {
  title: string; description: string; url: string; author?: string; date?: number; thumb?: { url?: string } | string;
}

function NewsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("s") || "";
  const page = searchParams.get("p") || "1";
  const [results, setResults] = useState<NewsResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraper] = useState("google");

  useEffect(() => {
    if (!query) return;
    const fetchNews = async () => {
      setLoading(true);
      try {
        let url = `/api/news?s=${encodeURIComponent(query)}&scraper=${scraper}`;
        const n = searchParams.get("npt");
        if (n) url += `&npt=${encodeURIComponent(n)}`; else url += `&p=${page}`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.news || []);
      } catch { setResults([]); } finally { setLoading(false); }
    };
    fetchNews();
  }, [query, scraper, page, searchParams]);

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <SearchHeader />

      <div className="max-w-2xl mx-auto px-4 py-5">
        {loading ? (
          <div className="space-y-7">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex-1 space-y-2.5">
                  <div className="skeleton h-3 w-36" />
                  <div className="skeleton h-5 w-full" />
                  <div className="skeleton h-4 w-full" />
                </div>
                <div className="hidden sm:block w-28 h-20 skeleton rounded-[var(--radius-sm)] shrink-0" />
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="py-20 text-center text-[var(--meta)]">
            <p className="text-lg font-medium text-[var(--fg)] mb-1">No news for &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          <div className="space-y-8">
            {results.map((result, i) => {
              const thumbUrl = typeof result.thumb === "string" ? result.thumb : result.thumb?.url || "";
              const proxied = thumbUrl ? `/api/proxy?i=${encodeURIComponent(thumbUrl)}&s=thumb` : "";
              return (
                <article key={i} className="group flex gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[11px] text-[var(--meta)] mb-0.5">
                      <span className="font-semibold uppercase tracking-tight">{result.author || "News"}</span>
                      {result.date && <span>&middot; {new Date(result.date * 1000).toLocaleDateString()}</span>}
                    </div>
                    <a href={result.url} target="_blank" rel="noopener noreferrer" className="block mb-0.5">
                      <h2 className="text-[16px] font-medium text-[var(--fg)] leading-snug group-hover:text-[var(--accent-hover)]">{result.title}</h2>
                    </a>
                    <p className="text-[13px] text-[var(--fg-2)] leading-relaxed line-clamp-2">{result.description}</p>
                  </div>
                  {proxied && (
                    <div className="hidden sm:block w-28 h-20 shrink-0 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] overflow-hidden">
                      <img src={proxied} alt="" className="size-full object-cover" loading="lazy" />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <BackToTop />
    </main>
  );
}

export default function NewsPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[var(--bg)]" />}><NewsContent /></Suspense>;
}
