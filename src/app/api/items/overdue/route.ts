import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
    try {
        const result = await sql`
            SELECT
                i.id,
                i.name,
                i.photo_url,
                i.category_id,
                c.name AS category_name,
                i.expiry_date,
                i.sticker_30_percent,
                i.created_at,
                i.updated_at
            FROM items i
            INNER JOIN categories c
                ON c.id = i.category_id
            WHERE i.expiry_date < (
                CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Brussels'
            )::date
            ORDER BY
                i.expiry_date ASC,
                i.name ASC;
        `;

        return NextResponse.json(result);
    } catch (error) {
        console.error("Failed to fetch overdue items:", error);

        return NextResponse.json(
            { error: "Failed to fetch overdue items" },
            { status: 500 }
        );
    }
}