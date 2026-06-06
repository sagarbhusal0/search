"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const handler = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-6 right-6 p-2.5 rounded-full bg-[var(--accent)] text-white shadow-lg transition-[opacity,transform] duration-200 z-50 hover:bg-[var(--accent-hover)] active:scale-90 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
      aria-label="Back to top"
    >
      <ArrowUp size={18} />
    </button>
  );
}
