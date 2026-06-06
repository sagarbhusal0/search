import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("s");
    const scraperParam = searchParams.get("scraper");
    const cookieStore = await cookies();
    const cookieScraper = cookieStore.get("scraper_ac")?.value;
    const scraper = scraperParam || cookieScraper || "brave";
    const nsfw = cookieStore.get("nsfw")?.value;

    if (!query) {
        return NextResponse.json({ error: "Missing search(s) parameter" }, { status: 400 });
    }

    const backendUrl = process.env.PHP_BACKEND_URL || "http://localhost:80";

    try {
        let url = `${backendUrl}/api/v1/ac.php?s=${encodeURIComponent(query)}&scraper=${scraper}`;
        if (nsfw) url += `&nsfw=${nsfw}`;

        const response = await fetch(url, { headers: { "Accept": "application/json" } });
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Autocomplete error:", error);
        return NextResponse.json([query, []], { status: 200 });
    }
}
