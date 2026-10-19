import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";

export async function POST(request: NextRequest) {
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Ongeldige aanvraag." },
            { status: 400 },
        );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return NextResponse.json(
            { error: "Ongeldige aanvraag." },
            { status: 400 },
        );
    }

    const categoryId = (body as Record<string, unknown>).categoryId;

    if (
        typeof categoryId !== "string" ||
        (
            categoryId !== "all" &&
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                categoryId,
            )
        )
    ) {
        return NextResponse.json(
            { error: "Ongeldige categorie." },
            { status: 400 },
        );
    }

    try {
        const result = await sql`
      SELECT datecheck_restart_stock(
        ${categoryId}::text
      ) AS restarted_count
    `;

        return NextResponse.json(
            { restartedCount: result[0].restarted_count },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            },
        );
    } catch (error) {
        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P0001" &&
            "message" in error &&
            typeof error.message === "string"
        ) {
            return NextResponse.json(
                { error: error.message },
                { status: 409 },
            );
        }

        console.error("Stockcheck restart failed:", error);

        return NextResponse.json(
            { error: "De stockcheck kon niet opnieuw gestart worden." },
            { status: 500 },
        );
    }
}