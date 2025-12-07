import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get("i");
    const size = request.nextUrl.searchParams.get("s") || "original";

    if (!url) {
        return new NextResponse("Missing url (i) parameter", { status: 400 });
    }

    // PHP backend runs on 127.0.0.1:80 inside the container
    const backendUrl = process.env.PHP_BACKEND_URL || "http://127.0.0.1:80";

    try {
        const proxyUrl = `${backendUrl}/proxy.php?i=${encodeURIComponent(url)}&s=${size}`;

        const response = await fetch(proxyUrl, {
            headers: {
                "Accept": "image/*",
                "User-Agent": "Mozilla/5.0 (compatible; Sorvx/1.0)",
            },
        });

        if (!response.ok) {
            console.error(`PHP proxy returned ${response.status} for ${url}`);
            return new NextResponse("Image not found", { status: 404 });
        }

        const contentType = response.headers.get("content-type") || "image/jpeg";
        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=86400, immutable",
            },
        });
    } catch (error) {
        console.error("Image proxy error:", error);
        return new NextResponse("Failed to proxy image", { status: 500 });
    }
}
