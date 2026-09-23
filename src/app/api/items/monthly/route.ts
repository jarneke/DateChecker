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
                c.name AS category_name
            FROM items i
            LEFT JOIN categories c ON c.id = i.category_id
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
                )::date
            ORDER BY i.expiry_date ASC, i.name ASC;
        `;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch monthly items:", error);

    return NextResponse.json(
      { error: "Failed to fetch monthly items" },
      { status: 500 }
    );
  }
}