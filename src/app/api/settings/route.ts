import { Client } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

type CategoryInput = {
    id?: string;
    name: string;
    color?: string;
};

const DEFAULT_CATEGORY_COLOR = "#A3E635";

function isValidColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
}

export async function GET() {
    try {
        const settingsResult = await sql`
      SELECT month_check_days_before_end
      FROM settings
      WHERE id = 1
    `;

        if (settingsResult.length === 0) {
            return NextResponse.json(
                { error: "Instellingen niet gevonden." },
                { status: 404 },
            );
        }

        const categoriesResult = await sql`
      SELECT
        c.id,
        c.name,
        c.color,
        c.sort_order,
        COUNT(i.id)::int AS item_count
      FROM categories c
      LEFT JOIN items i ON i.category_id = c.id
      GROUP BY c.id, c.name, c.color, c.sort_order
      ORDER BY c.sort_order ASC, c.name ASC
    `;

        return NextResponse.json({
            monthCheckDaysBeforeEnd:
                settingsResult[0].month_check_days_before_end,
            categories: categoriesResult,
        });
    } catch (error) {
        console.error("Failed to fetch settings:", error);

        return NextResponse.json(
            { error: "Instellingen konden niet geladen worden." },
            { status: 500 },
        );
    }
}

export async function PATCH(request: Request) {
    let client: Client | undefined;
    let transactionOpen = false;
    try {
        const body = await request.json();
        const daysBeforeEnd = Number(body.monthCheckDaysBeforeEnd);

        const categories: CategoryInput[] = Array.isArray(body.categories)
            ? body.categories
            : [];

        if (
            !Number.isInteger(daysBeforeEnd) ||
            daysBeforeEnd < 0 ||
            daysBeforeEnd > 31
        ) {
            return NextResponse.json(
                { error: "Aantal dagen moet tussen 0 en 31 liggen." },
                { status: 400 },
            );
        }

        if (categories.length === 0) {
            return NextResponse.json(
                { error: "Er moeten categorieën aanwezig zijn." },
                { status: 400 },
            );
        }

        const cleanedCategories = categories.map((category) => ({
            ...category,
            name:
                typeof category.name === "string"
                    ? category.name.trim()
                    : "",
            color: category.color ?? DEFAULT_CATEGORY_COLOR,
        }));

        if (cleanedCategories.some((category) => !category.name)) {
            return NextResponse.json(
                { error: "Een categorienaam mag niet leeg zijn." },
                { status: 400 },
            );
        }

        if (
            cleanedCategories.some(
                (category) => !isValidColor(category.color),
            )
        ) {
            return NextResponse.json(
                {
                    error:
                        "Elke categorie moet een geldige hexkleur hebben (#RRGGBB).",
                },
                { status: 400 },
            );
        }

        const categoryNames = cleanedCategories.map((category) =>
            category.name.toLowerCase(),
        );

        if (new Set(categoryNames).size !== categoryNames.length) {
            return NextResponse.json(
                { error: "Elke categorie moet een unieke naam hebben." },
                { status: 400 },
            );
        }

        client = new Client({ connectionString: process.env.DATABASE_URL });
        await client.connect();
        await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
        transactionOpen = true;

        const settings = await client.query(`
            SELECT id
            FROM settings
            WHERE id = 1
            FOR UPDATE
        `);

        if (settings.rows.length === 0) {
            return NextResponse.json(
                { error: "Instellingen niet gevonden." },
                { status: 404 },
            );
        }

        const { rows: existingCategories } = await client.query<{
            id: string;
            name: string;
        }>(`
            SELECT id, name
            FROM categories
        `);

        const submittedIds = new Set(
            cleanedCategories.map((category) => category.id),
        );
        const categoriesToDelete = existingCategories.filter(
            (category) => !submittedIds.has(category.id),
        );

        for (const category of categoriesToDelete) {
            const { rows: items } = await client.query<{ item_count: number }>(
                `
                    SELECT COUNT(*)::int AS item_count
                    FROM items
                    WHERE category_id = $1
                `,
                [category.id],
            );
            const itemCount = items[0].item_count;

            if (itemCount > 0) {
                return NextResponse.json(
                    {
                        error:
                            `Categorie "${category.name}" kan niet verwijderd worden ` +
                            `omdat er nog ${itemCount} producten aan gekoppeld zijn. ` +
                            "Pas eerst de categorie van deze producten aan.",
                    },
                    { status: 400 },
                );
            }

            const { rows: linkedDeliveries } = await client.query<{ name: string }>(
                `
                    SELECT d.name
                    FROM public.datecheck_delivery_categories dc
                    INNER JOIN public.datecheck_deliveries d
                        ON d.id = dc.delivery_id
                    WHERE dc.category_id = $1
                        AND d.deleted_at IS NULL
                    ORDER BY d.name
                    LIMIT 1
                `,
                [category.id],
            );

            if (linkedDeliveries.length > 0) {
                return NextResponse.json(
                    {
                        error:
                            `Categorie "${category.name}" is gekoppeld aan levering ` +
                            `"${linkedDeliveries[0].name}". ` +
                            "Pas die levering eerst aan voordat je de categorie verwijdert.",
                    },
                    { status: 409 },
                );
            }
        }

        const { rows: updatedSettings } = await client.query<{
            month_check_days_before_end: number;
        }>(
            `
                UPDATE settings
                SET month_check_days_before_end = $1, updated_at = NOW()
                WHERE id = 1
                RETURNING month_check_days_before_end
            `,
            [daysBeforeEnd],
        );

        for (const [index, category] of cleanedCategories.entries()) {
            const sortOrder = index + 1;

            if (category.id) {
                const result = await client.query(
                    `
                        UPDATE categories
                        SET name = $1, color = $2, sort_order = $3
                        WHERE id = $4
                        RETURNING id
                    `,
                    [category.name, category.color, sortOrder, category.id],
                );

                if (result.rows.length === 0) {
                    return NextResponse.json(
                        { error: `Categorie ${category.id} werd niet gevonden.` },
                        { status: 404 },
                    );
                }
            } else {
                await client.query(
                    `
                        INSERT INTO categories (name, color, sort_order)
                        VALUES ($1, $2, $3)
                    `,
                    [category.name, category.color, sortOrder],
                );
            }
        }

        for (const category of categoriesToDelete) {
            await client.query(
                "DELETE FROM categories WHERE id = $1",
                [category.id],
            );
        }

        const { rows: updatedCategories } = await client.query(`
            SELECT
                c.id,
                c.name,
                c.color,
                c.sort_order,
                COUNT(i.id)::int AS item_count
            FROM categories c
            LEFT JOIN items i ON i.category_id = c.id
            GROUP BY c.id, c.name, c.color, c.sort_order
            ORDER BY c.sort_order ASC, c.name ASC
        `);

        await client.query("COMMIT");
        transactionOpen = false;

        return NextResponse.json({
            monthCheckDaysBeforeEnd:
                updatedSettings[0].month_check_days_before_end,
            categories: updatedCategories,
        });
    } catch (error) {
        console.error("Failed to update settings:", error);

        const code =
            error && typeof error === "object" && "code" in error
                ? error.code
                : undefined;

        if (code === "40001" || code === "40P01") {
            return NextResponse.json(
                { error: "De instellingen zijn intussen gewijzigd. Herlaad de pagina en probeer opnieuw." },
                { status: 409 },
            );
        }

        if (code === "23503") {
            return NextResponse.json(
                {
                    error:
                        "Een categorie wordt nog gebruikt door een product of levering. Vernieuw de instellingen.",
                },
                { status: 409 },
            );
        }

        return NextResponse.json(
            { error: "Instellingen konden niet opgeslagen worden." },
            { status: 500 },
        );
    } finally {
        if (client) {
            try {
                if (transactionOpen) await client.query("ROLLBACK");
            } catch (error) {
                console.error("Failed to roll back settings:", error);
            } finally {
                await client.end().catch((error) => {
                    console.error("Failed to close settings connection:", error);
                });
            }
        }
    }
}