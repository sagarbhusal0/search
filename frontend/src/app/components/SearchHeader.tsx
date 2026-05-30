"use client";

import { Search, Image as ImageIcon, Video, Newspaper } from "lucide-react";
import { useSearchParams } from "next/navigation";
import SearchBar from "./SearchBar";

interface NavTab {
  href: string;
  label: string;
  icon: typeof Search;
}

export default function SearchHeader() {
  const searchParams = useSearchParams();
  const query = searchParams?.get("s") || "";
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/search";

  const tabs: NavTab[] = [
    { href: `/search?s=${encodeURIComponent(query)}`, label: "All", icon: Search },
    { href: `/images?s=${encodeURIComponent(query)}`, label: "Images", icon: ImageIcon },
    { href: `/videos?s=${encodeURIComponent(query)}`, label: "Videos", icon: Video },
    { href: `/news?s=${encodeURIComponent(query)}`, label: "News", icon: Newspaper },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--border)]">
      <div className="max-w-[var(--container)] mx-auto px-4">
        <div className="flex items-center gap-4 py-2.5">
          <a href="/" className="shrink-0 transition-opacity hover:opacity-80">
            <img src="/logo.svg" alt="Sorvx" className="h-7 w-auto" />
          </a>
          <div className="flex-1 max-w-[600px]">
            <SearchBar initialQuery={query} scoped />
          </div>
        </div>
        <nav className="flex items-center gap-1 -mb-px" role="tablist">
          {tabs.map(tab => {
            const isActive = pathname === tab.href.split("?")[0];
            const Icon = tab.icon;
            return (
              <a
                key={tab.href}
                href={tab.href}
                role="tab"
                aria-selected={isActive}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium border-b-2 transition-all duration-150 ${
                  isActive
                    ? "border-[var(--accent)] text-[var(--fg)]"
                    : "border-transparent text-[var(--meta)] hover:text-[var(--fg-2)] hover:border-[var(--border)]"
                }`}
              >
                <Icon size={13} strokeWidth={isActive ? 2.5 : 2} />
                {tab.label}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
