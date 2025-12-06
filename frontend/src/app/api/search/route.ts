import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query) {
        return NextResponse.json({ status: "Missing search query" }, { status: 400 });
    }

    // PHP backend URL - defaults to localhost for single container setup
    const backendUrl = process.env.PHP_BACKEND_URL || "http://localhost:80";

    try {
        const response = await fetch(
            `${backendUrl}/api/v1/web.php?s=${encodeURIComponent(query)}`,
            {
                headers: {
                    "Accept": "application/json",
                },
            }
        );

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching from PHP backend:", error);
        return NextResponse.json(
            { status: "Failed to connect to search backend" },
            { status: 500 }
        );
    }
}
