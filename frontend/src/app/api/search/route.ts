import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
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
