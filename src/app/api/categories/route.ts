import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const categories = await sql`
            SELECT id, name
            FROM categories
            ORDER BY name ASC
        `;

        return NextResponse.json(categories);
    } catch (error) {
        console.error("GET /api/categories failed:", error);

        return NextResponse.json(
            { error: "Failed to fetch categories" },
            { status: 500 }
        );
    }
}