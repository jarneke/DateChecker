import { handleUpload } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const response = await handleUpload({
            request,
            body,
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
                    const itemId = payload.itemId;

                    if (!itemId) {
                        console.error("Upload completed without itemId.");
                        return;
                    }

                    await sql`
            UPDATE items
            SET photo_url = ${blob.url}
            WHERE id = ${itemId}
          `;
                } catch (error) {
                    console.error(
                        "Failed to update item after upload:",
                        error
                    );
                }
            },
        });

        return NextResponse.json(response);
    } catch (error) {
        console.error("POST /api/upload error:", error);

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Upload failed",
            },
            {
                status: 500,
            }
        );
    }
}