import { del } from "@vercel/blob";
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
                i.expiry_date::text AS expiry_date,
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

        const currentItem = await sql`
            SELECT photo_url
            FROM items
            WHERE id = ${id}
            LIMIT 1
        `;

        if (currentItem.length === 0) {
            return NextResponse.json(
                { error: "Item not found" },
                { status: 404 }
            );
        }

        const oldPhotoUrl = currentItem[0].photo_url;

        const result = await sql`
            UPDATE items
            SET
                name = COALESCE(${name ?? null}, name),
                photo_url = COALESCE(${photo_url ?? null}, photo_url),
                category_id = COALESCE(${category_id ?? null}, category_id),
                expiry_date = COALESCE(
                    ${expiry_date ?? null}::date,
                    expiry_date
                ),
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
                expiry_date::text AS expiry_date,
                sticker_30_percent,
                created_at,
                updated_at
        `;

        const newPhotoUrl = result[0].photo_url;

        if (
            oldPhotoUrl &&
            oldPhotoUrl !== newPhotoUrl &&
            typeof oldPhotoUrl === "string"
        ) {
            try {
                await del(oldPhotoUrl);
            } catch (blobError) {
                console.error(
                    "Failed to delete old item photo blob:",
                    blobError
                );
            }
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

        const item = await sql`
            SELECT photo_url
            FROM items
            WHERE id = ${id}
            LIMIT 1
        `;

        if (item.length === 0) {
            return NextResponse.json(
                { error: "Item not found" },
                { status: 404 }
            );
        }

        const photoUrl = item[0].photo_url;

        if (photoUrl && typeof photoUrl === "string") {
            try {
                await del(photoUrl);
            } catch (blobError) {
                console.error(
                    "Failed to delete item photo blob:",
                    blobError
                );

                return NextResponse.json(
                    { error: "Foto kon niet verwijderd worden." },
                    { status: 500 }
                );
            }
        }

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