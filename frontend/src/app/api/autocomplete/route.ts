import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("s");
    const scraperParam = searchParams.get("scraper");
    
    // Read cookie directly from request
    const cookieHeader = request.headers.get("cookie") || "";
    const cookieMatch = cookieHeader.split(";").map(c => c.trim()).find(c => c.startsWith("scraper_ac="));
    const cookieScraper = cookieMatch ? cookieMatch.split("=")[1] : undefined;
    
    const scraper = scraperParam || cookieScraper || "ddg";
    const nsfwMatch = cookieHeader.split(";").map(c => c.trim()).find(c => c.startsWith("nsfw="));
    const nsfw = nsfwMatch ? nsfwMatch.split("=")[1] : undefined;

    if (!query) {
        return NextResponse.json({ error: "Missing search(s) parameter" }, { status: 400 });
    }

    const backendUrl = process.env.BACKEND_URL || process.env.PHP_BACKEND_URL || "http://localhost:3001";

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
