import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || searchParams.get("s");
    const scraperParam = searchParams.get("scraper");
    const page = searchParams.get("p") || "1";

    if (!query) {
        return NextResponse.json({ status: "Missing search query" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const cookieScraper = cookieStore.get("scraper_news")?.value;
    const nsfw = cookieStore.get("nsfw")?.value;

    const backendUrl = process.env.PHP_BACKEND_URL || "http://localhost:80";

    let url = `${backendUrl}/api/v1/news.php?s=${encodeURIComponent(query)}`;
    const npt = searchParams.get("npt");
    if (npt) url += `&npt=${encodeURIComponent(npt)}`;
    else url += `&p=${page}`;
    
    if (scraperParam || cookieScraper) url += `&scraper=${scraperParam || cookieScraper}`;
    if (nsfw) url += `&nsfw=${nsfw}`;

    try {
        const response = await fetch(url, { headers: { "Accept": "application/json" } });
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("News API error:", error);
        const sample = {
            news: [
                {
                    title: "Welcome to Sorvx News",
                    description: "Backend is offline, showing sample result.",
                    url: "https://example.com/news/welcome",
                    author: "Sorvx",
                    date: Math.floor(Date.now() / 1000),
                },
                {
                    title: "Privacy-first search engines gaining traction",
                    description: "Users are increasingly turning to private search alternatives that don't track browsing habits or build advertising profiles.",
                    url: "https://example.com/news/privacy",
                    author: "Tech Report",
                    date: Math.floor(Date.now() / 1000) - 86400,
                },
            ],
            status: "offline-fallback"
        };
        return NextResponse.json(sample, { status: 200 });
    }
}
