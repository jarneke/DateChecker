import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

type Params = {
    params: Promise<{ id: string }>;
};

export async function GET(
    _request: NextRequest,
    { params }: Params
) {
    try {
        const { id } = await params;

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
      WHERE i.id = ${id}
      LIMIT 1
    `;

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Item not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(result[0]);
    } catch (error) {
        console.error("GET /api/items/[id] error:", error);

        return NextResponse.json(
            { error: "Failed to fetch item" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: Params
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const {
            name,
            photo_url,
            category_id,
            expiry_date,
            sticker_30_percent,
        } = body;

        const result = await sql`
            UPDATE items
            SET
                name = COALESCE(${name ?? null}, name),
                photo_url = COALESCE(${photo_url ?? null}, photo_url),
                category_id = COALESCE(${category_id ?? null}, category_id),
                expiry_date = COALESCE(${expiry_date ?? null}, expiry_date),
                sticker_30_percent = COALESCE(
                    ${sticker_30_percent ?? null},
                    sticker_30_percent
                ),
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING
                id,
                name,
                photo_url,
                category_id,
                expiry_date,
                sticker_30_percent,
                created_at,
                updated_at
        `;

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Item not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(result[0]);
    } catch (error) {
        console.error("PATCH /api/items/[id] error:", error);

        return NextResponse.json(
            { error: "Failed to update item" },
            { status: 500 }
        );
    }
}
export async function DELETE(
    _request: NextRequest,
    { params }: Params
) {
    try {
        const { id } = await params;

        const result = await sql`
      DELETE FROM items
      WHERE id = ${id}
      RETURNING id
    `;

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Item not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: "Item deleted successfully",
            id: result[0].id,
        });
    } catch (error) {
        console.error("DELETE /api/items/[id] error:", error);

        return NextResponse.json(
            { error: "Failed to delete item" },
            { status: 500 }
        );
    }
}