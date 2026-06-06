import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sorvx — Private Search",
  description: "A high-performance, privacy-focused metasearch engine.",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var m=document.cookie.match(/theme=([^;]+)/);var t=m?decodeURIComponent(m[1]):"dark";document.documentElement.setAttribute("data-theme",t)}catch(e){}})();`,
        }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300..700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
