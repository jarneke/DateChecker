import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

const PAST_EXPIRY_DATE = "2020-01-01";

type BatchItem = {
    name: string;
    photo_url?: string | null;
    category_id: string;
    sticker_30_percent: boolean;
};

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as {
            items?: BatchItem[];
        };

        if (!Array.isArray(body.items) || body.items.length === 0) {
            return NextResponse.json(
                {
                    error: "Geen items ontvangen.",
                },
                {
                    status: 400,
                },
            );
        }

        if (body.items.length > 250) {
            return NextResponse.json(
                {
                    error: "Je kunt maximaal 250 items tegelijk uploaden.",
                },
                {
                    status: 400,
                },
            );
        }

        const seenNames = new Set<string>();

        const items = body.items.reduce<BatchItem[]>((result, item) => {
            const name = item?.name?.trim().toUpperCase();

            if (!name || seenNames.has(name)) {
                return result;
            }

            if (
                typeof item.category_id !== "string" ||
                !item.category_id
            ) {
                return result;
            }

            if (typeof item.sticker_30_percent !== "boolean") {
                return result;
            }

            seenNames.add(name);

            result.push({
                name,
                photo_url: item.photo_url || null,
                category_id: item.category_id,
                sticker_30_percent: item.sticker_30_percent,
            });

            return result;
        }, []);

        if (items.length === 0) {
            return NextResponse.json(
                {
                    error: "Geen geldige items ontvangen.",
                },
                {
                    status: 400,
                },
            );
        }

        const categoryIds = [
            ...new Set(items.map((item) => item.category_id)),
        ];

        const categories = await sql`
            SELECT id
            FROM categories
            WHERE id = ANY(${categoryIds}::uuid[])
        `;

        const validCategoryIds = new Set(
            categories.map((category) => category.id),
        );

        const invalidCategory = items.find(
            (item) => !validCategoryIds.has(item.category_id),
        );

        if (invalidCategory) {
            return NextResponse.json(
                {
                    error: "Een of meerdere geselecteerde categorieën bestaan niet.",
                },
                {
                    status: 400,
                },
            );
        }

        const inserted: { id: string; name: string }[] = [];
        const skippedNames: string[] = [];

        for (const item of items) {
            const result = await sql`
                INSERT INTO items (
                    name,
                    photo_url,
                    expiry_date,
                    sticker_30_percent,
                    category_id,
                    paused,
                    stickered_for_date
                )
                VALUES (
                    ${item.name},
                    ${item.photo_url},
                    ${PAST_EXPIRY_DATE}::date,
                    ${item.sticker_30_percent},
                    ${item.category_id},
                    false,
                    NULL
                )
                ON CONFLICT (name) DO NOTHING
                RETURNING id, name
            `;

            if (result.length > 0) {
                inserted.push({
                    id: result[0].id,
                    name: result[0].name,
                });
            } else {
                skippedNames.push(item.name);
            }
        }

        return NextResponse.json({
            inserted,
            insertedCount: inserted.length,
            skippedNames,
            skippedCount: skippedNames.length,
        });
    } catch (error) {
        console.error("POST /api/items/batch error:", error);

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Items konden niet in bulk toegevoegd worden.",
            },
            {
                status: 500,
            },
        );
    }
}