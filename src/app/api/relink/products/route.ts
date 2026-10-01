import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
    try {
        const products = await sql`
      SELECT id, name
      FROM items
      WHERE photo_url IS NULL
      ORDER BY name ASC
    `;

        return NextResponse.json({ products });
    } catch (error) {
        console.error("Relink products error:", error);

        return NextResponse.json(
            { error: "Failed to load products." },
            { status: 500 },
        );
    }
}