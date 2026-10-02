import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const items = await sql`
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
        AND i.expiry_date = (
          CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Brussels'
        )::date
      ORDER BY
        c.sort_order ASC,
        i.expiry_date ASC,
        i.name ASC;
    `;

    return NextResponse.json(items);
  } catch (error) {
    console.error("Failed to fetch due items:", error);

    return NextResponse.json(
      { error: "Items konden niet geladen worden." },
      { status: 500 }
    );
  }
}