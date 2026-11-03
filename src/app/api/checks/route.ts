import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { isCheckType } from "@/app/check/types";
import { POST as handleAction } from "./action/route";

export const dynamic = "force-dynamic";

function isCategoryId(value: string): boolean {
    return (
        value === "all" ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            value,
        )
    );
}

export async function GET(request: NextRequest) {
    const type = request.nextUrl.searchParams.get("type");
    const categoryId =
        request.nextUrl.searchParams.get("categoryId") || "all";

    if (type !== null && !isCheckType(type)) {
        return NextResponse.json(
            { error: "Ongeldige controle." },
            { status: 400 },
        );
    }

    if (!isCategoryId(categoryId)) {
        return NextResponse.json(
            { error: "Ongeldige categorie." },
            { status: 400 },
        );
    }

    try {
        const rows = await sql`
      SELECT public.datecheck_live_snapshot(
        ${type}::text,
        ${categoryId}::text
      ) AS snapshot
    `;

        return NextResponse.json(rows[0].snapshot, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("Loading live checks failed:", error);

        return NextResponse.json(
            { error: "De controles konden niet geladen worden." },
            { status: 500 },
        );
    }
}

export async function POST(request: NextRequest) {
    return handleAction(request);
}