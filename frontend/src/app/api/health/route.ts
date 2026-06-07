import { NextResponse } from "next/server";

export async function GET() {
    const backendUrl = process.env.BACKEND_URL  || "http://localhost:3001";

    try {
        const backendResp = await fetch(`${backendUrl}/healthz.php`, {
            signal: AbortSignal.timeout(5000),
        });
        if (!backendResp.ok) {
            return NextResponse.json(
                { status: "degraded", backend: "unhealthy" },
                { status: 503 }
            );
        }
        const backendData = await backendResp.json();
        return NextResponse.json({
            status: "ok",
            frontend: "healthy",
            backend: backendData,
        });
    } catch {
        return NextResponse.json(
            { status: "degraded", frontend: "healthy", backend: "unreachable" },
            { status: 503 }
        );
    }
}
