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
    const cookieScraper = cookieStore.get("scraper_music")?.value;

    const backendUrl = process.env.BACKEND_URL  || "http://localhost:3001";

    let url = `${backendUrl}/api/v1/music.php?s=${encodeURIComponent(query)}&p=${page}`;

    if (scraperParam || cookieScraper) url += `&scraper=${scraperParam || cookieScraper}`;

    try {
        const response = await fetch(url, { headers: { "Accept": "application/json" } });
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
            const text = await response.text();
            console.error("Non-JSON response from backend (music):", text.slice(0, 200));
            return NextResponse.json({ status: "Backend returned an invalid response. It may be offline or misconfigured.", song: [] }, { status: 502 });
        }
        const data = await response.json();
        if (data.status && data.status !== "ok") {
            return NextResponse.json({ status: data.status, song: [] }, { status: 502 });
        }
        return NextResponse.json(data);
    } catch (error) {
        console.error("Music API error:", error);
        return NextResponse.json({ status: "Failed to fetch music", song: [] }, { status: 502 });
    }
}
