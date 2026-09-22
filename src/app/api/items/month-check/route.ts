import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const daysBeforeEnd = Number(searchParams.get("daysBeforeEnd"));

        if (
            !Number.isInteger(daysBeforeEnd) ||
            daysBeforeEnd < 0 ||
            daysBeforeEnd > 31
        ) {
            return NextResponse.json(
                { error: "Ongeldig aantal dagen voor einde maand." },
                { status: 400 },
            );
        }

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
      INNER JOIN categories c
        ON c.id = i.category_id
      WHERE i.sticker_30_percent = FALSE
        AND i.expiry_date = (
          DATE_TRUNC('month', CURRENT_DATE)
          + INTERVAL '1 month'
          - INTERVAL '1 day'
        )::date
        AND CURRENT_DATE >= (
          DATE_TRUNC('month', CURRENT_DATE)
          + INTERVAL '1 month'
          - INTERVAL '1 day'
          - (${daysBeforeEnd} * INTERVAL '1 day')
        )::date
      ORDER BY
        i.expiry_date ASC,
        i.name ASC
    `;

        return NextResponse.json(result);
    } catch (error) {
        console.error("Failed to fetch month check items:", error);

        return NextResponse.json(
            {
                error:
                    "Items voor de maandcontrole konden niet geladen worden.",
            },
            { status: 500 },
        );
    }
}