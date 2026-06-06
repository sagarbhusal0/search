import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || searchParams.get("s");
    const scraper = searchParams.get("scraper") || "ddg";
    const page = searchParams.get("p") || "1";

    if (!query) {
        return NextResponse.json({ status: "Missing search query" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const nsfw = cookieStore.get("nsfw")?.value;

    const backendUrl = process.env.BACKEND_URL || process.env.PHP_BACKEND_URL || "http://localhost:3001";

    let url = `${backendUrl}/api/v1/web.php?s=${encodeURIComponent(query)}&scraper=${encodeURIComponent(scraper)}`;
    const npt = searchParams.get("npt");
    if (npt) url += `&npt=${encodeURIComponent(npt)}`;
    else url += `&p=${page}`;
    if (nsfw) url += `&nsfw=${nsfw}`;

    const safe = searchParams.get("safe");
    if (safe) url += `&safe=${encodeURIComponent(safe)}`;
    const spellcheck = searchParams.get("spellcheck");
    if (spellcheck) url += `&spellcheck=${encodeURIComponent(spellcheck)}`;
    const extendedsearch = searchParams.get("extendedsearch");
    if (extendedsearch) url += `&extendedsearch=${encodeURIComponent(extendedsearch)}`;

    try {
        const response = await fetch(url, { headers: { "Accept": "application/json" } });
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
            const text = await response.text();
            console.error("Non-JSON response from PHP backend:", text.slice(0, 200));
            const res = NextResponse.json({ status: "Backend returned an invalid response. It may be offline or misconfigured." }, { status: 502 });
            res.cookies.set("scraper_web", "", { maxAge: 0, path: "/" });
            return res;
        }
        const data = await response.json();
        const res = NextResponse.json(data);
        res.cookies.set("scraper_web", "", { maxAge: 0, path: "/" });
        return res;
    } catch (error) {
        console.error("Error fetching from PHP backend:", error);
        const res = NextResponse.json({ status: "Could not connect to the search backend. It may be offline." }, { status: 502 });
        res.cookies.set("scraper_web", "", { maxAge: 0, path: "/" });
        return res;
    }
}
