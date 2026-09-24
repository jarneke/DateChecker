import { del } from "@vercel/blob";
import {
    handleUpload,
    type HandleUploadBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(
    request: Request,
): Promise<NextResponse> {
    try {
        const body = (await request.json()) as HandleUploadBody;

        const jsonResponse = await handleUpload({
            body,
            request,

            onBeforeGenerateToken: async (
                pathname,
                clientPayload,
            ) => {
                let payload: { itemId?: string } = {};

                try {
                    payload = clientPayload
                        ? JSON.parse(clientPayload)
                        : {};
                } catch {
                    throw new Error("Invalid client payload.");
                }

                const itemId = payload.itemId;

                if (!itemId) {
                    throw new Error("Item ID is required.");
                }

                const item = await sql`
          SELECT id
          FROM items
          WHERE id = ${itemId}
          LIMIT 1
        `;

                if (item.length === 0) {
                    throw new Error("Item not found.");
                }

                return {
                    allowedContentTypes: [
                        "image/jpeg",
                        "image/png",
                        "image/webp",
                    ],
                    addRandomSuffix: true,
                    tokenPayload: JSON.stringify({
                        itemId,
                    }),
                };
            },

            onUploadCompleted: async ({
                blob,
                tokenPayload,
            }) => {
                let payload: { itemId?: string } = {};

                try {
                    payload = tokenPayload
                        ? JSON.parse(tokenPayload)
                        : {};
                } catch {
                    throw new Error("Invalid token payload.");
                }

                const itemId = payload.itemId;

                if (!itemId) {
                    throw new Error("Item ID is missing.");
                }

                const result = await sql`
          UPDATE items
          SET
            photo_url = ${blob.url},
            updated_at = NOW()
          WHERE id = ${itemId}
          RETURNING id
        `;

                if (result.length === 0) {
                    throw new Error("Item not found.");
                }
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        console.error("POST /api/upload error:", error);

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Upload failed.",
            },
            { status: 400 },
        );
    }
}

export async function DELETE(
    request: Request,
): Promise<NextResponse> {
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