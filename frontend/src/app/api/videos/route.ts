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
    const cookieScraper = cookieStore.get("scraper_videos")?.value;
    const nsfw = cookieStore.get("nsfw")?.value;

    const backendUrl = process.env.PHP_BACKEND_URL || "http://localhost:80";

    let url = `${backendUrl}/api/v1/videos.php?s=${encodeURIComponent(query)}`;
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
        console.error("Videos API error:", error);
        return NextResponse.json({ status: "Failed to fetch videos" }, { status: 500 });
    }
}
