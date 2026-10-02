import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

type Params = {
    params: Promise<{ id: string }>;
};

async function deleteGitHubImage(photoUrl: string) {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!token || !owner || !repo) {
        throw new Error("GitHub environment variables are missing");
    }

    const url = new URL(photoUrl);

    if (url.hostname !== "raw.githubusercontent.com") {
        throw new Error("Invalid GitHub image URL");
    }

    const pathParts = url.pathname.split("/").filter(Boolean);

    if (pathParts.length < 4) {
        throw new Error("Invalid GitHub image path");
    }

    const [, , branch, ...fileParts] = pathParts;
    const path = fileParts.join("/");

    const fileResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        },
    );

    if (fileResponse.status === 404) {
        return;
    }

    if (!fileResponse.ok) {
        throw new Error(
            `Failed to find GitHub image: ${await fileResponse.text()}`,
        );
    }

    const fileData = await fileResponse.json();

    const deleteResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: `Delete image ${path}`,
                sha: fileData.sha,
                branch,
            }),
        },
    );

    if (!deleteResponse.ok) {
        throw new Error(
            `Failed to delete GitHub image: ${await deleteResponse.text()}`,
        );
    }
}

export async function GET(
    _request: NextRequest,
    { params }: Params,
) {
    try {
        const { id } = await params;

        const result = await sql`
            SELECT
                i.id,
                i.name,
                i.photo_url,
                i.category_id,
                i.expiry_date::text AS expiry_date,
                i.sticker_30_percent,
                i.paused,
                i.stickered_for_date::text AS stickered_for_date,
                i.created_at,
                i.updated_at,
                c.name AS category_name
            FROM items i
            LEFT JOIN categories c ON c.id = i.category_id
            WHERE i.id = ${id}
            LIMIT 1
        `;

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Item not found" },
                { status: 404 },
            );
        }

        return NextResponse.json(result[0]);
    } catch (error) {
        console.error("GET /api/items/[id] error:", error);

        return NextResponse.json(
            { error: "Failed to fetch item" },
            { status: 500 },
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: Params,
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const {
            name,
            photo_url,
            category_id,
            expiry_date,
            sticker_30_percent,
            paused,
        } = body;

        const currentItem = await sql`
            SELECT photo_url
            FROM items
            WHERE id = ${id}
            LIMIT 1
        `;

        if (currentItem.length === 0) {
            return NextResponse.json(
                { error: "Item not found" },
                { status: 404 },
            );
        }

        const oldPhotoUrl = currentItem[0].photo_url;

        const result = await sql`
            UPDATE items
            SET
                name = COALESCE(${name ?? null}, name),
                photo_url = CASE
                    WHEN ${photo_url !== undefined}
                    THEN ${photo_url}
                    ELSE photo_url
                END,
                category_id = COALESCE(${category_id ?? null}, category_id),
                expiry_date = COALESCE(
                    ${expiry_date ?? null}::date,
                    expiry_date
                ),
                sticker_30_percent = COALESCE(
                    ${sticker_30_percent ?? null},
                    sticker_30_percent
                ),
                paused = COALESCE(
                    ${paused ?? null},
                    paused
                ),
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING
                id,
                name,
                photo_url,
                category_id,
                expiry_date::text AS expiry_date,
                sticker_30_percent,
                paused,
                stickered_for_date::text AS stickered_for_date,
                created_at,
                updated_at
        `;

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Item not found" },
                { status: 404 },
            );
        }

        const newPhotoUrl = result[0].photo_url;

        if (
            oldPhotoUrl &&
            oldPhotoUrl !== newPhotoUrl &&
            typeof oldPhotoUrl === "string"
        ) {
            try {
                await deleteGitHubImage(oldPhotoUrl);
            } catch (githubError) {
                console.error(
                    "Failed to delete old GitHub item photo:",
                    githubError,
                );
            }
        }

        return NextResponse.json(result[0]);
    } catch (error) {
        console.error("PATCH /api/items/[id] error:", error);

        return NextResponse.json(
            { error: "Failed to update item" },
            { status: 500 },
        );
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: Params,
) {
    try {
        const { id } = await params;

        const item = await sql`
            SELECT photo_url
            FROM items
            WHERE id = ${id}
            LIMIT 1
        `;

        if (item.length === 0) {
            return NextResponse.json(
                { error: "Item not found" },
                { status: 404 },
            );
        }

        const photoUrl = item[0].photo_url;

        if (photoUrl && typeof photoUrl === "string") {
            try {
                await deleteGitHubImage(photoUrl);
            } catch (githubError) {
                console.error(
                    "Failed to delete item photo from GitHub:",
                    githubError,
                );

                return NextResponse.json(
                    { error: "Foto kon niet verwijderd worden." },
                    { status: 500 },
                );
            }
        }

        const result = await sql`
            DELETE FROM items
            WHERE id = ${id}
            RETURNING id
        `;

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Item not found" },
                { status: 404 },
            );
        }

        return NextResponse.json({
            message: "Item deleted successfully",
            id: result[0].id,
        });
    } catch (error) {
        console.error("DELETE /api/items/[id] error:", error);

        return NextResponse.json(
            { error: "Failed to delete item" },
            { status: 500 },
        );
    }
}