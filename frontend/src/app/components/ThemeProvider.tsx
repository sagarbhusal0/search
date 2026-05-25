"use client";

import { useEffect } from "react";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const match = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("theme="));
    const theme = match ? decodeURIComponent(match.split("=")[1]) : "dark";
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  return <>{children}</>;
}
