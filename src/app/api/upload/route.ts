import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const formData = await request.formData();

        const file = formData.get("file");
        const itemId = formData.get("itemId");

        if (!(file instanceof File)) {
            return NextResponse.json(
                {
                    error: "Image file is required.",
                },
                { status: 400 },
            );
        }

        if (typeof itemId !== "string" || !itemId) {
            return NextResponse.json(
                {
                    error: "Item ID is required.",
                },
                { status: 400 },
            );
        }

        const item = await sql`
  SELECT id
  FROM items
  WHERE id = ${itemId}
  LIMIT 1
`;

        if (item.length === 0) {
            return NextResponse.json(
                {
                    error: "Item not found.",
                },
                { status: 404 },
            );
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                {
                    error: "Only JPEG, PNG and WebP images are allowed.",
                },
                { status: 400 },
            );
        }

        const blob = await put(file.name, file, {
            access: "public",
            addRandomSuffix: true,
            contentType: file.type,
        });

        const result = await sql`
  UPDATE items
  SET
    photo_url = ${blob.url},
    updated_at = NOW()
  WHERE id = ${itemId}
  RETURNING id
`;

        if (result.length === 0) {
            await del(blob.url);

            return NextResponse.json(
                {
                    error: "Item not found.",
                },
                { status: 404 },
            );
        }

        return NextResponse.json({
            success: true,
            url: blob.url,
        });

    } catch (error) {
        console.error("POST /api/upload error:", error);

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Upload failed.",
            },
            { status: 500 },
        );

    }
}

export async function DELETE(request: Request): Promise<NextResponse> {
    try {
        const body = await request.json();
        const url = body?.url;

        if (!url || typeof url !== "string") {
            return NextResponse.json(
                {
                    error: "Blob URL is required.",
                },
                { status: 400 },
            );
        }

        await del(url);

        return NextResponse.json({
            success: true,
        });

    } catch (error) {
        console.error("DELETE /api/upload error:", error);

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Delete failed.",
            },
            { status: 400 },
        );

    }
}