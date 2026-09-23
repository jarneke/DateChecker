import { NextResponse, NextRequest } from "next/server";
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
    c.name AS category_name
      FROM items i
      INNER JOIN categories c
        ON c.id = i.category_id
      ORDER BY
i.expiry_date ASC,
    i.name ASC
        `;

        return NextResponse.json(items);
    } catch (error) {
        console.error("Failed to fetch items:", error);

        return NextResponse.json(
            { error: "Items konden niet geladen worden." },
            { status: 500 },
        );
    }
}
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            name,
            photo_url,
            expiry_date,
            category_id,
            sticker_30_percent,
        } = body;

        if (!name || !expiry_date || !category_id) {
            return NextResponse.json(
                {
                    error: "name, expiry_date and category_id are required",
                },
                { status: 400 }
            );
        }

        const result = await sql`
            INSERT INTO items (
                name,
                photo_url,
                expiry_date,
                category_id,
                sticker_30_percent
            )
            VALUES (
                ${name.trim()},
                ${photo_url || null},
                ${expiry_date},
                ${category_id},
                ${sticker_30_percent ?? false}
            )
            RETURNING
                id,
                name,
                photo_url,
                expiry_date,
                sticker_30_percent,
                category_id;
        `;

        return NextResponse.json(result[0], { status: 201 });
    } catch (error) {
        console.error("Failed to create item:", error);

        return NextResponse.json(
            { error: "Failed to create item" },
            { status: 500 }
        );
    }
}