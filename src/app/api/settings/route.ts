import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

type CategoryInput = {
    id?: string;
    name: string;
};

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
                c.sort_order,
                COUNT(i.id)::int AS item_count
            FROM categories c
            LEFT JOIN items i ON i.category_id = c.id
            GROUP BY c.id, c.name, c.sort_order
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
            name: category.name.trim(),
        }));

        if (cleanedCategories.some((category) => !category.name)) {
            return NextResponse.json(
                { error: "Een categorienaam mag niet leeg zijn." },
                { status: 400 },
            );
        }

        const categoryNames = cleanedCategories.map((category) =>
            category.name.toLowerCase(),
        );

        const hasDuplicateNames =
            new Set(categoryNames).size !== categoryNames.length;

        if (hasDuplicateNames) {
            return NextResponse.json(
                { error: "Elke categorie moet een unieke naam hebben." },
                { status: 400 },
            );
        }

        const existingCategories = await sql`
            SELECT id, name
            FROM categories
        `;

        const submittedIds = cleanedCategories
            .filter((category) => category.id)
            .map((category) => category.id);

        const categoriesToDelete = existingCategories.filter(
            (category) => !submittedIds.includes(category.id),
        );

        for (const category of categoriesToDelete) {
            const itemsResult = await sql`
                SELECT COUNT(*)::int AS item_count
                FROM items
                WHERE category_id = ${category.id}
            `;

            const itemCount = Number(itemsResult[0].item_count);

            if (itemCount > 0) {
                return NextResponse.json(
                    {
                        error: `Categorie "${category.name}" kan niet verwijderd worden omdat er nog ${itemCount} ${itemCount === 1 ? "item" : "items"} aan gekoppeld ${itemCount === 1 ? "is" : "zijn"}. Pas eerst de categorie van deze ${itemCount === 1 ? "item" : "items"} aan.`,
                    },
                    { status: 400 },
                );
            }
        }

        await sql`
            UPDATE settings
            SET
                month_check_days_before_end = ${daysBeforeEnd},
                updated_at = NOW()
            WHERE id = 1
        `;

        for (let index = 0; index < cleanedCategories.length; index++) {
            const category = cleanedCategories[index];
            const sortOrder = index + 1;

            if (category.id) {
                const result = await sql`
                    UPDATE categories
                    SET
                        name = ${category.name},
                        sort_order = ${sortOrder}
                    WHERE id = ${category.id}
                    RETURNING id
                `;

                if (result.length === 0) {
                    return NextResponse.json(
                        {
                            error: `Categorie ${category.id} werd niet gevonden.`,
                        },
                        { status: 404 },
                    );
                }
            } else {
                await sql`
                    INSERT INTO categories (
                        name,
                        sort_order
                    )
                    VALUES (
                        ${category.name},
                        ${sortOrder}
                    )
                `;
            }
        }

        for (const category of categoriesToDelete) {
            await sql`
                DELETE FROM categories
                WHERE id = ${category.id}
            `;
        }

        const updatedCategories = await sql`
            SELECT
                c.id,
                c.name,
                c.sort_order,
                COUNT(i.id)::int AS item_count
            FROM categories c
            LEFT JOIN items i ON i.category_id = c.id
            GROUP BY c.id, c.name, c.sort_order
            ORDER BY c.sort_order ASC, c.name ASC
        `;

        const updatedSettings = await sql`
            SELECT month_check_days_before_end
            FROM settings
            WHERE id = 1
        `;

        return NextResponse.json({
            monthCheckDaysBeforeEnd:
                updatedSettings[0].month_check_days_before_end,
            categories: updatedCategories,
        });
    } catch (error) {
        console.error("Failed to update settings:", error);

        return NextResponse.json(
            { error: "Instellingen konden niet opgeslagen worden." },
            { status: 500 },
        );
    }
}