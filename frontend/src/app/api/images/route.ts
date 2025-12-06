import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || searchParams.get("s");
    const scraper = searchParams.get("scraper");

    if (!query) {
        return NextResponse.json({ status: "Missing search query" }, { status: 400 });
    }

    const backendUrl = process.env.PHP_BACKEND_URL || "http://localhost:80";

    let url = `${backendUrl}/api/v1/images.php?s=${encodeURIComponent(query)}`;
    if (scraper) url += `&scraper=${scraper}`;

    try {
        const response = await fetch(url, { headers: { "Accept": "application/json" } });
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Images API error:", error);
        return NextResponse.json({ status: "Failed to fetch images" }, { status: 500 });
    }
}
