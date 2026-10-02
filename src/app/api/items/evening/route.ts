import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
    try {
        const result = await sql`
            SELECT
                i.id,
                i.name,
                i.photo_url,
                i.expiry_date,
                i.sticker_30_percent,
                i.category_id,
                i.paused,
                i.stickered_for_date,
                c.name AS category_name
            FROM items i
            INNER JOIN categories c
                ON c.id = i.category_id
            WHERE i.sticker_30_percent = TRUE
              AND i.paused = FALSE
              AND i.stickered_for_date = (
                  CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Brussels'
              )::date
            ORDER BY
                c.sort_order ASC,
                i.name ASC;
        `;

        return NextResponse.json(result);
    } catch (error) {
        console.error("Failed to fetch evening items:", error);

        return NextResponse.json(
            { error: "Avondcontrole kon niet geladen worden." },
            { status: 500 }
        );
    }
}