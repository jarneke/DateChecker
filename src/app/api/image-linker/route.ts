
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const excludeParam =
            request.nextUrl.searchParams.get("exclude") ?? "";

        const excludedIds = excludeParam
            .split(",")
            .map((id) => id.trim())
            .filter((id) =>
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                    id,
                ),
            );

        const excludedIdsArray = `{${excludedIds.join(",")}}`;

        const result = await sql`
      SELECT id, name
      FROM items
      WHERE photo_url IS NULL
        AND id <> ALL(${excludedIdsArray}::uuid[])
      ORDER BY name ASC
      LIMIT 1
    `;

        const countResult = await sql`
      SELECT COUNT(*)::int AS total
      FROM items
      WHERE photo_url IS NULL
    `;

        return NextResponse.json({
            product: result[0] ?? null,
            remaining: countResult[0].total,
        });
    } catch (error) {
        console.error("GET /api/image-linker error:", error);

        return NextResponse.json(
            { error: "Producten konden niet geladen worden." },
            { status: 500 },
        );
    }
}
