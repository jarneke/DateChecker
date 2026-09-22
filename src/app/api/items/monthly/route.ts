import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
    try {
        const settings = await sql`
      SELECT month_check_days_before_end
      FROM settings
      WHERE id = 1
      LIMIT 1
    `;

        if (settings.length === 0) {
            return NextResponse.json(
                { error: "Settings not found" },
                { status: 500 },
            );
        }

        const daysBeforeEnd = Number(settings[0].month_check_days_before_end);

        const result = await sql`
      SELECT
        i.id,
        i.name,
        i.photo_url,
        i.category_id,
        i.expiry_date,
        i.sticker_30_percent,
        i.created_at,
        i.updated_at,
        c.name AS category_name
      FROM items i
      LEFT JOIN categories c ON c.id = i.category_id
      WHERE CURRENT_DATE >= (
        DATE_TRUNC('month', CURRENT_DATE)
        + INTERVAL '1 month'
        - INTERVAL '1 day'
        - (${daysBeforeEnd} * INTERVAL '1 day')
      )::date
      AND CURRENT_DATE <= (
        DATE_TRUNC('month', CURRENT_DATE)
        + INTERVAL '1 month'
        - INTERVAL '1 day'
      )::date
      ORDER BY c.name, i.name
    `;

        return NextResponse.json(result);
    } catch (error) {
        console.error("GET /api/items/monthly error:", error);

        return NextResponse.json(
            { error: "Failed to fetch monthly items" },
            { status: 500 },
        );
    }
}