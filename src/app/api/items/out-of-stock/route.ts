import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const categoryId = request.nextUrl.searchParams.get("categoryId");

        if (!categoryId) {
            return NextResponse.json(
                { error: "Categorie is verplicht." },
                { status: 400 },
            );
        }

        const allCategories = categoryId === "all";
        const filterCategoryId = allCategories ? null : categoryId;

        const items = await sql`
      SELECT
        i.id,
        i.name,
        i.photo_url,
        i.expiry_date::text AS expiry_date,
        i.sticker_30_percent,
        i.category_id,
        i.paused,
        i.stickered_for_date::text AS stickered_for_date,
        c.name AS category_name
      FROM items i
      INNER JOIN categories c
        ON c.id = i.category_id
      WHERE (${allCategories} OR i.category_id = ${filterCategoryId})
        AND i.expiry_date IS NULL
        AND i.paused = FALSE
      ORDER BY
        i.name ASC;
    `;

        return NextResponse.json(items);
    } catch (error) {
        console.error("GET /api/items/out-of-stock failed:", error);

        return NextResponse.json(
            { error: "Stockproducten konden niet geladen worden." },
            { status: 500 },
        );
    }
}