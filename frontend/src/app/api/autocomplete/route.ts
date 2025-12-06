import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("s");
    const scraper = searchParams.get("scraper") || "brave";

    if (!query) {
        return NextResponse.json({ error: "Missing search(s) parameter" }, { status: 400 });
    }

    const backendUrl = process.env.PHP_BACKEND_URL || "http://localhost:80";

    try {
        const response = await fetch(
            `${backendUrl}/api/v1/ac.php?s=${encodeURIComponent(query)}&scraper=${scraper}`,
            { headers: { "Accept": "application/json" } }
        );
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Autocomplete error:", error);
        return NextResponse.json([query, []], { status: 200 });
    }
}
