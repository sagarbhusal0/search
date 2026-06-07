import { NextRequest, NextResponse } from "next/server";

function isValidImageUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
        const hostname = parsed.hostname.toLowerCase();
        if (
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname === "0.0.0.0" ||
            hostname === "[::1]" ||
            hostname.startsWith("10.") ||
            (hostname.startsWith("172.") && (() => { const octet = parseInt(hostname.split(".")[1]); return octet >= 16 && octet <= 31; })()) ||
            hostname.startsWith("192.168.") ||
            hostname.endsWith(".local") ||
            hostname.endsWith(".internal")
        ) return false;
        return true;
    } catch {
        return false;
    }
}

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get("i");
    const size = request.nextUrl.searchParams.get("s") || "original";

    if (!url) {
        return new NextResponse("Missing url (i) parameter", { status: 400 });
    }

    if (!isValidImageUrl(url)) {
        return new NextResponse("Invalid or disallowed URL", { status: 400 });
    }

    const backendUrl = process.env.BACKEND_URL  || "http://localhost:3001";

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
