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
    const cookieScraper = cookieStore.get("scraper_images")?.value;
    const nsfw = cookieStore.get("nsfw")?.value;

    const backendUrl = process.env.BACKEND_URL || process.env.PHP_BACKEND_URL || "http://localhost:3001";

    let url = `${backendUrl}/api/v1/images.php?s=${encodeURIComponent(query)}`;
    const npt = searchParams.get("npt");
    if (npt) url += `&npt=${encodeURIComponent(npt)}`;
    else url += `&p=${page}`;
    if (scraperParam || cookieScraper) url += `&scraper=${scraperParam || cookieScraper}`;
    if (nsfw) url += `&nsfw=${nsfw}`;
    const safe = searchParams.get("safe");
    if (safe) url += `&safe=${encodeURIComponent(safe)}`;

    try {
        const response = await fetch(url, { headers: { "Accept": "application/json" } });
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
            const text = await response.text();
            console.error("Non-JSON response from backend (images):", text.slice(0, 200));
            return NextResponse.json({ status: "Backend returned an invalid response. It may be offline or misconfigured.", image: [] }, { status: 502 });
        }
        const data = await response.json();
        if (data.status && data.status !== "ok") {
            return NextResponse.json({ status: data.status, image: [] }, { status: 502 });
        }
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
