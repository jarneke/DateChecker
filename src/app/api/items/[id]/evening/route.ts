import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function POST(
    request: Request,
    context: RouteContext,
) {
    try {
        const { id } = await context.params;

        const result = await sql`
            UPDATE items
            SET
                stickered_for_date = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${id}
              AND sticker_30_percent = TRUE
            RETURNING
                id,
                name,
                stickered_for_date::text AS stickered_for_date;
        `;

        if (result.length === 0) {
            return NextResponse.json(
                {
                    error: "Item kon niet verwerkt worden.",
                },
                {
                    status: 404,
                },
            );
        }

        return NextResponse.json(result[0]);
    } catch (error) {
        console.error("POST /api/items/[id]/evening error:", error);

        return NextResponse.json(
            {
                error: "Item kon niet verwerkt worden.",
            },
            {
                status: 500,
            },
        );
    }
}