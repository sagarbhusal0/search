import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sorvx - Private Search",
  description: "A high-performance, privacy-focused search engine inspired by DuckDuckGo.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
