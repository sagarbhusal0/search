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
    const cookieScraper = cookieStore.get("scraper_ac")?.value;
    const nsfw = cookieStore.get("nsfw")?.value;

    const backendUrl = process.env.PHP_BACKEND_URL || "http://localhost:80";

    let url = `${backendUrl}/api/v1/images.php?s=${encodeURIComponent(query)}`;
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
        console.error("Images API error:", error);
        // Graceful sample fallback to keep UI functional offline
        const sample = {
            image: [
                {
                    title: "Sample result",
                    url: "https://example.com/sample",
                    source: [
                        { url: "https://placehold.co/800x600?text=Sample+Full", width: 800, height: 600 },
                        { url: "https://placehold.co/400x300?text=Sample+Thumb", width: 400, height: 300 }
                    ]
                }
            ],
            status: "offline-fallback"
        };
        return NextResponse.json(sample, { status: 200 });
    }
}
