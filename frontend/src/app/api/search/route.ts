import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || searchParams.get("s");
    const scraper = searchParams.get("scraper");
    const page = searchParams.get("p") || "1";

    if (!query) {
        return NextResponse.json({ status: "Missing search query" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const cookieScraper = cookieStore.get("scraper_ac")?.value;
    const nsfw = cookieStore.get("nsfw")?.value;

    const backendUrl = process.env.PHP_BACKEND_URL || "http://localhost:80";

    let url = `${backendUrl}/api/v1/web.php?s=${encodeURIComponent(query)}`;
    const npt = searchParams.get("npt");
    if (npt) url += `&npt=${encodeURIComponent(npt)}`;
    else url += `&p=${page}`;
    if (scraper || cookieScraper) url += `&scraper=${scraper || cookieScraper}`;
    if (nsfw) url += `&nsfw=${nsfw}`;

    try {
        const response = await fetch(url, { headers: { "Accept": "application/json" } });
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching from PHP backend:", error);
        // Graceful fallback sample results to keep UI working without backend
        const sample = {
            web: [
                {
                    title: "Welcome to Sorvx",
                    description: "Backend is offline, showing sample result.",
                    url: "https://example.com/welcome"
                },
                {
                    title: "DuckDuckGo inspiration",
                    description: "Privacy-first search UI with purple accents.",
                    url: "https://duckduckgo.com"
                }
            ],
            related: ["privacy search", "duckduckgo", "sorvx demo"],
            status: "offline-fallback"
        };
        return NextResponse.json(sample, { status: 200 });
    }
}

