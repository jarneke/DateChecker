import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
    try {
        const result = await sql`
      SELECT
        id,
        name
      FROM items
      WHERE photo_url IS NULL
      ORDER BY name ASC
      LIMIT 1
    `;

        return NextResponse.json({
            product: result[0] ?? null,
        });
    } catch (error) {
        console.error("Failed to load image linker product:", error);

        return NextResponse.json(
            { error: "Failed to load product" },
            { status: 500 },
        );
    }
}