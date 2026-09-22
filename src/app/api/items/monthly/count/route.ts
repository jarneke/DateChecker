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
      SELECT COUNT(*)::int AS count
      FROM items
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
    `;

        return NextResponse.json({
            count: result[0].count,
        });
    } catch (error) {
        console.error("GET /api/items/monthly/count error:", error);

        return NextResponse.json(
            { error: "Failed to fetch monthly item count" },
            { status: 500 },
        );
    }
}