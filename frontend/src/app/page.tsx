"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Settings } from "lucide-react";

export default function Home() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black">
      {/* Settings Icon */}
      <a
        href="/settings"
        className="absolute top-5 right-5 text-gray-500 hover:text-gray-300 transition-colors"
      >
        <Settings size={24} />
      </a>

      <div className="w-full max-w-xl px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-white tracking-tight">
            Sorvx
          </h1>
          <p className="text-gray-500 mt-2">Privacy-focused search</p>
        </div>

        {/* Search Box */}
        <form onSubmit={handleSearch}>
          <div className="relative group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the web..."
              className="w-full h-14 px-5 pr-14 bg-transparent border border-gray-800 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-gray-500 hover:text-white transition-colors"
            >
              <Search size={20} />
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
