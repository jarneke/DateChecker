import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json(
                { error: "Geen foto ontvangen." },
                { status: 400 },
            );
        }

        if (!file.type.startsWith("image/")) {
            return NextResponse.json(
                { error: "Het bestand moet een afbeelding zijn." },
                { status: 400 },
            );
        }

        const extension = file.name.split(".").pop() || "jpg";

        const blob = await put(
            `items/${crypto.randomUUID()}.${extension}`,
            file,
            {
                access: "public",
            },
        );

        return NextResponse.json({
            url: blob.url,
        });
    } catch (error) {
        console.error("Blob upload error:", error);

        return NextResponse.json(
            { error: "Foto kon niet geüpload worden." },
            { status: 500 },
        );
    }
}