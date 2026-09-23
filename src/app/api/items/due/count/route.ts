import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
    try {
        const result = await sql`
            SELECT COUNT(*)::int AS count
            FROM items
            WHERE sticker_30_percent = TRUE
              AND expiry_date = (
                  CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Brussels'
              )::date;
        `;

        return NextResponse.json({
            count: result[0]?.count ?? 0,
        });
    } catch (error) {
        console.error("Failed to count due items:", error);

        return NextResponse.json(
            { error: "Aantal items kon niet geladen worden." },
            { status: 500 }
        );
    }
}