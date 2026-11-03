import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

type Params = {
    params: Promise<{ id: string }>;
};

function isUuid(value: unknown): value is string {
    return (
        typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            value,
        )
    );
}

function isDate(value: unknown): value is string {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return false;
    }

    const parsed = new Date(`${value}T00:00:00Z`);

    return (
        Number.isFinite(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === value
    );
}

function isPhotoUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
}

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

        if (!isUuid(id)) {
            return NextResponse.json(
                { error: "Ongeldig product." },
                { status: 400 },
            );
        }

        const result = await sql`
      SELECT
        i.id,
        i.name,
        i.photo_url,
        i.category_id,
        i.expiry_date::text AS expiry_date,
        i.sticker_30_percent,
        i.stickered,
        i.paused,
        i.stickered_for_date::text AS stickered_for_date,
        i.check_revision,
        i.created_at,
        i.updated_at,
        i.updated_at::text AS edit_version,
        c.name AS category_name
      FROM items i
      LEFT JOIN categories c ON c.id = i.category_id
      WHERE i.id = ${id}
      LIMIT 1
    `;

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Product niet gevonden." },
                { status: 404 },
            );
        }

        return NextResponse.json(result[0], {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("GET /api/items/[id] error:", error);

        return NextResponse.json(
            { error: "Product kon niet geladen worden." },
            { status: 500 },
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: Params,
) {
    const { id } = await params;

    if (!isUuid(id)) {
        return NextResponse.json(
            { error: "Ongeldig product." },
            { status: 400 },
        );
    }

    let parsed: unknown;

    try {
        parsed = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Ongeldige aanvraag." },
            { status: 400 },
        );
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return NextResponse.json(
            { error: "Ongeldige productgegevens." },
            { status: 400 },
        );
    }

    const body = parsed as Record<string, unknown>;
    const has = (key: string) =>
        Object.prototype.hasOwnProperty.call(body, key);

    if (
        has("name") &&
        (typeof body.name !== "string" || !body.name.trim())
    ) {
        return NextResponse.json(
            { error: "Vul een productnaam in." },
            { status: 400 },
        );
    }

    if (has("category_id") && !isUuid(body.category_id)) {
        return NextResponse.json(
            { error: "Selecteer een geldige categorie." },
            { status: 400 },
        );
    }

    if (
        has("expiry_date") &&
        body.expiry_date !== null &&
        !isDate(body.expiry_date)
    ) {
        return NextResponse.json(
            { error: "Vul een geldige vervaldatum in." },
            { status: 400 },
        );
    }

    if (
        has("photo_url") &&
        body.photo_url !== null &&
        (
            typeof body.photo_url !== "string" ||
            !isPhotoUrl(body.photo_url)
        )
    ) {
        return NextResponse.json(
            { error: "De foto heeft geen geldige URL." },
            { status: 400 },
        );
    }

    for (const field of ["sticker_30_percent", "stickered", "paused"]) {
        if (has(field) && typeof body[field] !== "boolean") {
            return NextResponse.json(
                { error: "Ongeldige controle-instellingen." },
                { status: 400 },
            );
        }
    }

    if (
        has("expected_edit_version") &&
        (
            typeof body.expected_edit_version !== "string" ||
            !Number.isFinite(Date.parse(body.expected_edit_version))
        )
    ) {
        return NextResponse.json(
            { error: "Herlaad het product en probeer opnieuw." },
            { status: 400 },
        );
    }

    try {
        const currentRows = await sql`
      SELECT
        id,
        name,
        photo_url,
        category_id,
        expiry_date::text AS expiry_date,
        sticker_30_percent,
        stickered,
        paused,
        check_revision,
        updated_at::text AS edit_version
      FROM items
      WHERE id = ${id}
      LIMIT 1
    `;

        if (currentRows.length === 0) {
            return NextResponse.json(
                { error: "Product niet gevonden." },
                { status: 404 },
            );
        }

        const current = currentRows[0];

        const nextName = has("name")
            ? (body.name as string).trim()
            : current.name;

        const nextPhotoUrl = has("photo_url")
            ? (body.photo_url as string | null)
            : current.photo_url;

        const nextCategoryId = has("category_id")
            ? (body.category_id as string)
            : current.category_id;

        const nextExpiryDate = has("expiry_date")
            ? (body.expiry_date as string | null)
            : current.expiry_date;

        const nextSticker30 = has("sticker_30_percent")
            ? (body.sticker_30_percent as boolean)
            : current.sticker_30_percent;

        const nextStickered = has("stickered")
            ? (body.stickered as boolean)
            : current.stickered;

        const nextPaused = has("paused")
            ? (body.paused as boolean)
            : current.paused;

        const expectedEditVersion = has("expected_edit_version")
            ? (body.expected_edit_version as string)
            : current.edit_version;

        if (!nextSticker30 && nextStickered && nextExpiryDate === null) {
            return NextResponse.json(
                {
                    error:
                        "Een vooruit gestickerd product heeft een vervaldatum nodig. Vul de datum in of zet Gestickerd uit.",
                },
                { status: 400 },
            );
        }

        if (
            current.stickered &&
            nextSticker30 !== current.sticker_30_percent &&
            nextStickered
        ) {
            return NextResponse.json(
                {
                    error:
                        "Dit product is nog gestickerd. Zet Gestickerd uit wanneer de bestaande stickers afgehandeld zijn voordat je de stickersoort wijzigt.",
                },
                { status: 400 },
            );
        }

        const result = await sql`
      UPDATE items
      SET
        name = ${nextName},
        photo_url = ${nextPhotoUrl},
        category_id = ${nextCategoryId}::uuid,
        expiry_date = ${nextExpiryDate}::date,
        sticker_30_percent = ${nextSticker30},
        stickered = ${nextStickered},
        paused = ${nextPaused},
        stickered_for_date = CASE
          WHEN ${nextStickered} = FALSE THEN NULL
          WHEN stickered = FALSE THEN
            CASE
              WHEN ${nextSticker30} = TRUE
              THEN (
                CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Brussels'
              )::date
              ELSE ${nextExpiryDate}::date
            END
          ELSE stickered_for_date
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
        AND check_revision = ${current.check_revision}
        AND updated_at = ${current.edit_version}::timestamptz
        AND updated_at = ${expectedEditVersion}::timestamptz
      RETURNING
        id,
        name,
        photo_url,
        category_id,
        expiry_date::text AS expiry_date,
        sticker_30_percent,
        stickered,
        paused,
        stickered_for_date::text AS stickered_for_date,
        check_revision,
        created_at,
        updated_at,
        updated_at::text AS edit_version
    `;

        if (result.length === 0) {
            return NextResponse.json(
                {
                    error:
                        "Dit product is intussen gewijzigd. Herlaad de pagina voordat je opnieuw opslaat.",
                },
                { status: 409 },
            );
        }

        const newPhotoUrl = result[0].photo_url;

        if (
            typeof current.photo_url === "string" &&
            current.photo_url &&
            current.photo_url !== newPhotoUrl
        ) {
            try {
                await deleteGitHubImage(current.photo_url);
            } catch (githubError) {
                console.error(
                    "Failed to delete old GitHub item photo:",
                    githubError,
                );
            }
        }

        return NextResponse.json(result[0], {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("PATCH /api/items/[id] error:", error);

        if (error && typeof error === "object" && "code" in error) {
            if (error.code === "23505") {
                return NextResponse.json(
                    { error: "Er bestaat al een product met deze naam." },
                    { status: 409 },
                );
            }

            if (error.code === "23503") {
                return NextResponse.json(
                    { error: "Deze categorie bestaat niet meer." },
                    { status: 400 },
                );
            }
        }

        return NextResponse.json(
            { error: "Product kon niet opgeslagen worden." },
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

        if (!isUuid(id)) {
            return NextResponse.json(
                { error: "Ongeldig product." },
                { status: 400 },
            );
        }

        const item = await sql`
      SELECT photo_url
      FROM items
      WHERE id = ${id}
      LIMIT 1
    `;

        if (item.length === 0) {
            return NextResponse.json(
                { error: "Product niet gevonden." },
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
                { error: "Product niet gevonden." },
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
            { error: "Product kon niet verwijderd worden." },
            { status: 500 },
        );
    }
}