import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const result = await sql`
            SELECT COUNT(*)::int AS count
            FROM items i
            CROSS JOIN settings s
            WHERE
                i.sticker_30_percent = FALSE
                AND i.expiry_date = (
                    DATE_TRUNC('month', CURRENT_DATE)
                    + INTERVAL '1 month'
                    - INTERVAL '1 day'
                )::date
                AND CURRENT_DATE >= (
                    DATE_TRUNC('month', CURRENT_DATE)
                    + INTERVAL '1 month'
                    - INTERVAL '1 day'
                    - (s.month_check_days_before_end * INTERVAL '1 day')
                )::date
                AND CURRENT_DATE <= (
                    DATE_TRUNC('month', CURRENT_DATE)
                    + INTERVAL '1 month'
                    - INTERVAL '1 day'
                )::date;
        `;

    return NextResponse.json({
      count: result[0].count,
    });
  } catch (error) {
    console.error("Failed to count monthly items:", error);

    return NextResponse.json(
      { error: "Failed to count monthly items" },
      { status: 500 }
    );
  }
}