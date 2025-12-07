import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get("i");
    const size = request.nextUrl.searchParams.get("s") || "original";

    if (!url) {
        return new NextResponse("Missing url (i) parameter", { status: 400 });
    }

    const backendUrl = process.env.PHP_BACKEND_URL || "http://localhost:80";

    try {
        // Forward to PHP proxy
        const proxyUrl = `${backendUrl}/proxy.php?i=${encodeURIComponent(url)}&s=${size}`;

        const response = await fetch(proxyUrl, {
            headers: {
                "Accept": "image/*",
            },
        });

        if (!response.ok) {
            return new NextResponse("Failed to fetch image", { status: response.status });
        }

        const contentType = response.headers.get("content-type") || "image/jpeg";
        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=86400",
            },
        });
    } catch (error) {
        console.error("Image proxy error:", error);
        return new NextResponse("Failed to proxy image", { status: 500 });
    }
}
