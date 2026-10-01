import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const productId = String(body.productId ?? "");
        const imageUrl = String(body.imageUrl ?? "");

        if (!productId || !imageUrl) {
            return NextResponse.json(
                { error: "Product and image are required." },
                { status: 400 },
            );
        }

        const result = await sql`
      UPDATE items
      SET photo_url = ${imageUrl}
      WHERE id = ${productId}
        AND photo_url IS NULL
      RETURNING id, name, photo_url
    `;

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Product does not exist or already has an image." },
                { status: 409 },
            );
        }

        return NextResponse.json({
            item: result[0],
        });
    } catch (error) {
        console.error("Relink error:", error);

        return NextResponse.json(
            { error: "Failed to link image." },
            { status: 500 },
        );
    }
}