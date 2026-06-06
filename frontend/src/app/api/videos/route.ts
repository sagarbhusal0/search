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

    const backendUrl = process.env.BACKEND_URL || process.env.PHP_BACKEND_URL || "http://localhost:3001";

    let url = `${backendUrl}/api/v1/videos.php?s=${encodeURIComponent(query)}`;
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
            console.error("Non-JSON response from backend (videos):", text.slice(0, 200));
            return NextResponse.json({ status: "Backend returned an invalid response. It may be offline or misconfigured.", video: [] }, { status: 502 });
        }
        const data = await response.json();
        if (data.status && data.status !== "ok") {
            return NextResponse.json({ status: data.status, video: [] }, { status: 502 });
        }
        return NextResponse.json(data);
    } catch (error) {
        console.error("Videos API error:", error);
        const sample = {
            video: [
                {
                    title: "Welcome to Sorvx Videos",
                    description: "Backend is offline, showing sample result.",
                    url: "https://example.com/videos/welcome",
                    author: { name: "Sorvx" },
                    date: Math.floor(Date.now() / 1000),
                    duration: 120,
                    thumb: { url: "https://placehold.co/480x360?text=Sample+Video" },
                },
                {
                    title: "Building modern search interfaces",
                    description: "A look at how modern search engines are rethinking the user experience with privacy-first design.",
                    url: "https://example.com/videos/search-ui",
                    author: { name: "TechTalks" },
                    date: Math.floor(Date.now() / 1000) - 172800,
                    duration: 845,
                    thumb: { url: "https://placehold.co/480x360?text=Search+UI" },
                },
            ],
            status: "offline-fallback"
        };
        return NextResponse.json(sample, { status: 200 });
    }
}
