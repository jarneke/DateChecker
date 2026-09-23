import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const result = await sql`
            SELECT COUNT(*)::int AS count
            FROM items
            WHERE
                sticker_30_percent = FALSE
                AND expiry_date >= DATE_TRUNC('month', CURRENT_DATE)::date
                AND expiry_date < (
                    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
                )::date;
        `;

    return NextResponse.json({
      count: result[0].count,
    });
  } catch (error) {
    console.error("Failed to count monthly check items:", error);

    return NextResponse.json(
      { error: "Failed to count monthly check items" },
      { status: 500 }
    );
  }
}