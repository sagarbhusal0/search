"use client";

import { useEffect, useState } from "react";
import { Search, Home, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?s=${encodeURIComponent(query.trim())}`);
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse 60% 35% at 50% 25%, rgba(94,106,210,0.06), transparent 70%), var(--bg)" }}
    >
      {/* Decorative background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-[0.015]"
          style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-[0.02]"
          style={{ background: "radial-gradient(circle, var(--accent-hover), transparent 70%)" }}
        />
      </div>

      {/* Glitchy 404 */}
      <div className="relative mb-8 select-none">
        <h1
          className="text-[clamp(6rem,20vw,12rem)] font-bold leading-none tracking-[-0.04em]"
          style={{
            fontFamily: "var(--font-display)",
            background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 40%, #a78bfa 70%, var(--accent) 100%)",
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: mounted ? "gradientShift 4s ease infinite" : "none",
          }}
        >
          404
          {/* Glitch overlay layers */}
          <span
            className="absolute inset-0 pointer-events-none animate-glitch-1 opacity-30"
            style={{
              fontFamily: "var(--font-display)",
              background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 50%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              clipPath: "inset(20% 0 60% 0)",
              transform: "translateX(-2px)",
            }}
            aria-hidden
          >
            404
          </span>
          <span
            className="absolute inset-0 pointer-events-none animate-glitch-2 opacity-30"
            style={{
              fontFamily: "var(--font-display)",
              background: "linear-gradient(135deg, #f472b6 0%, #a78bfa 50%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              clipPath: "inset(50% 0 10% 0)",
              transform: "translateX(3px)",
            }}
            aria-hidden
          >
            404
          </span>
        </h1>
      </div>

      {/* Message */}
      <div className="text-center mb-10 max-w-md">
        <p className="text-[15px] text-[var(--fg)] font-medium mb-1.5">
          This page drifted into the void
        </p>
        <p className="text-[13px] text-[var(--meta)] leading-relaxed">
          The link you followed might be broken, or the page may have been
          moved or deleted. Try searching instead.
        </p>
      </div>

      {/* Search form */}
      <form
        onSubmit={handleSearch}
        className="w-full max-w-lg mb-10"
      >
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] transition-all duration-200"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
          }}
        >
          <Search size={18} className="text-[var(--meta)] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search Sorvx..."
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-[var(--fg)] placeholder-[var(--meta)]"
            autoFocus
            aria-label="Search Sorvx"
          />
        </div>
      </form>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] text-[13px] font-medium transition-all duration-150"
          style={{
            background: "var(--accent)",
            color: "var(--accent-on)",
          }}
        >
          <Home size={15} />
          Go home
        </button>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] text-[13px] font-medium transition-all duration-150"
          style={{
            background: "var(--surface)",
            color: "var(--fg)",
            border: "1px solid var(--border)",
          }}
        >
          <ArrowLeft size={15} />
          Go back
        </button>
      </div>

      {/* Decorative separator */}
      <div className="absolute bottom-8 flex items-center gap-2 text-[11px] text-[var(--meta)] opacity-40">
        <span>✦</span>
        <span>Sorvx Search</span>
        <span>✦</span>
      </div>

      {/* Keyframes injected once */}
      {mounted && (
        <style>{`
          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          @keyframes glitch-1 {
            0%, 100% { transform: translateX(-2px); opacity: 0.3; }
            20% { transform: translateX(1px); opacity: 0.2; }
            40% { transform: translateX(-4px); opacity: 0.4; }
            60% { transform: translateX(2px); opacity: 0.2; }
            80% { transform: translateX(-1px); opacity: 0.35; }
          }
          @keyframes glitch-2 {
            0%, 100% { transform: translateX(3px); opacity: 0.3; }
            25% { transform: translateX(-2px); opacity: 0.2; }
            50% { transform: translateX(4px); opacity: 0.4; }
            75% { transform: translateX(-3px); opacity: 0.25; }
          }
        `}</style>
      )}
    </main>
  );
}
