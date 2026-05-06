import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://search.sorvx.com"),
  title: "Sorvx Search | Privacy-first search engine from Nepal",
  description: "Sorvx is a privacy-focused, fast, and clean search engine built in Nepal. Browse the web with Startpage-inspired UI, zero tracking, and smart results across web, images, videos, and news.",
  applicationName: "Sorvx Search",
  keywords: [
    "Sorvx",
    "Sorvx Search",
    "privacy search engine",
    "Nepal search engine",
    "DuckDuckGo alternative",
    "Startpage alternative",
    "private search",
    "image search",
    "video search",
    "news search",
    "anonymous search",
    "no tracking search",
    "secure search engine",
    "fast search",
    "clean UI search",
    "Nepal tech",
    "privacy-focused browser",
    "ad-free search",
    "search without ads",
    "web search privacy",
    "image finder",
    "video finder",
    "news aggregator",
    "search results",
    "online search tool",
    "privacy-first search",
    "Nepal startup",
    "search engine Nepal",
    "Startpage-like search",
    "DuckDuckGo-like search",
    "zero tracking",
    "encrypted search",
    "data protection search",
    "private browsing",
    "search privacy tools",
    "alternative search engine",
    "open source search",
    "free search engine"
  ],
  authors: [{ name: "Sorvx", url: "https://sorvx.com" }],
  creator: "Sorvx",
  publisher: "Sorvx (Nepal)",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://search.sorvx.com",
  },
  openGraph: {
    title: "Sorvx Search | Privacy-first search engine from Nepal",
    description: "Fast, private, and elegant search built in Nepal — web, images, videos, and news with zero tracking.",
    url: "https://search.sorvx.com",
    siteName: "Sorvx Search",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/logo.svg",
        width: 512,
        height: 512,
        alt: "Sorvx Search logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sorvx Search | Privacy-first search engine from Nepal",
    description: "Search privately with Sorvx — fast results for web, images, videos, and news with no tracking.",
    images: ["/logo.svg"],
    creator: "@sorvx",
    site: "@sorvx",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value || "dark";

  return (
    <html lang="en" data-theme={theme}>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Sorvx",
              "url": "https://search.sorvx.com",
              "logo": "https://search.sorvx.com/logo.svg",
              "foundingLocation": {
                "@type": "Place",
                "addressCountry": "NP",
                "addressRegion": "Nepal"
              },
              "foundingDate": "2024",
              "description": "Privacy-focused search engine built in Nepal",
              "sameAs": [
                "https://sorvx.com"
              ]
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Sorvx Search",
              "url": "https://search.sorvx.com",
              "description": "Private and fast search engine with web, image, video, and news results",
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": "https://search.sorvx.com/search?s={search_term_string}"
                },
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        {children}
      </body>
    </html>
  );
}
