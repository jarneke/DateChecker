import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

const PAST_EXPIRY_DATE = "2020-01-01";

type BatchItem = {
    name: string;
    photo_url?: string | null;
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

            seenNames.add(name);

            result.push({
                name,
                photo_url: item.photo_url || null,
            });

            return result;
        }, []);

        if (items.length === 0) {
            return NextResponse.json(
                {
                    error: "Geen geldige itemnamen ontvangen.",
                },
                {
                    status: 400,
                },
            );
        }

        const inserted = await sql`
      INSERT INTO items (
        name,
        photo_url,
        expiry_date,
        sticker_30_percent
      )
      SELECT
        item.name,
        item.photo_url,
        ${PAST_EXPIRY_DATE}::date,
        false
      FROM jsonb_to_recordset(
        ${JSON.stringify(items)}::jsonb
      ) AS item(
        name text,
        photo_url text
      )
      ON CONFLICT (name) DO NOTHING
      RETURNING id, name
    `;

        const insertedNames = new Set(
            inserted.map((item) => item.name),
        );

        const skippedNames = items
            .map((item) => item.name)
            .filter((name) => !insertedNames.has(name));

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
                error: "Items konden niet in bulk toegevoegd worden.",
            },
            {
                status: 500,
            },
        );
    }
}