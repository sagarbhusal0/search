import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || searchParams.get("s");
    const scraperParam = searchParams.get("scraper");

    if (!query) {
        return NextResponse.json({ status: "Missing search query" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const cookieScraper = cookieStore.get("scraper_music")?.value;

    const backendUrl = process.env.BACKEND_URL || process.env.PHP_BACKEND_URL || "http://localhost:3001";

    let url = `${backendUrl}/api/v1/music.php?s=${encodeURIComponent(query)}`;
    
    if (scraperParam || cookieScraper) url += `&scraper=${scraperParam || cookieScraper}`;

    try {
        const response = await fetch(url, { headers: { "Accept": "application/json" } });
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Music API error:", error);
        return NextResponse.json({ status: "Failed to fetch music" }, { status: 500 });
    }
}
