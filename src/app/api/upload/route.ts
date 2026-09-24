import { handleUpload } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const itemId = body?.itemId;

        if (!itemId) {
            return NextResponse.json(
                { error: "itemId is required" },
                { status: 400 }
            );
        }

        const itemResult = await sql`
      SELECT id
      FROM items
      WHERE id = ${itemId}
      LIMIT 1
    `;

        if (itemResult.length === 0) {
            return NextResponse.json(
                { error: "Item not found" },
                { status: 404 }
            );
        }

        const response = await handleUpload({
            request,
            body: {
                ...body,
                clientPayload: JSON.stringify({ itemId }),
            },
            onBeforeGenerateToken: async () => {
                return {
                    allowedContentTypes: [
                        "image/jpeg",
                        "image/png",
                        "image/webp",
                    ],
                    addRandomSuffix: true,
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                try {
                    const payload = JSON.parse(tokenPayload || "{}");
                    const uploadedItemId = payload.itemId;

                    if (!uploadedItemId) {
                        throw new Error("Missing itemId in upload token");
                    }

                    await sql`
            UPDATE items
SET
photo_url = ${blob.url},
updated_at = NOW()
            WHERE id = ${uploadedItemId}
`;
                } catch (error) {
                    console.error(
                        "Failed to update item after upload:",
                        error
                    );

                    throw error;
                }
            },
        });

        return NextResponse.json(response);
    } catch (error) {
        console.error("POST /api/upload error:", error);

        return NextResponse.json(
            {
                error: "Upload failed",
            },
            {
                status: 500,
            }
        );
    }
}
