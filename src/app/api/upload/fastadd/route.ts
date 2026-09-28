import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

const ALLOWED_CONTENT_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json(
                {
                    error: "Geen afbeelding ontvangen.",
                },
                { status: 400 },
            );
        }

        if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
            return NextResponse.json(
                {
                    error: "Ongeldig afbeeldingstype.",
                },
                { status: 400 },
            );
        }

        const pathname = `fastadd/${crypto.randomUUID()}-${file.name}`;

        const blob = await put(pathname, file, {
            access: "public",
            addRandomSuffix: true,
        });

        return NextResponse.json({
            url: blob.url,
        });
    } catch (error) {
        console.error("POST /api/upload/fastadd error:", error);

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