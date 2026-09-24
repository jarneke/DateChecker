import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;

        const pageParam = Number(searchParams.get("page") || "1");

        const page =
            Number.isFinite(pageParam) && pageParam > 0
                ? Math.floor(pageParam)
                : 1;

        const search = searchParams.get("search")?.trim() || "";
        const control = searchParams.get("control") || "all";
        const exactDate = searchParams.get("exactDate") || "";
        const fromDate = searchParams.get("fromDate") || "";
        const toDate = searchParams.get("toDate") || "";

        const offset = (page - 1) * PAGE_SIZE;

        let itemsResult;
        let countResult;

        if (search && control === "30" && exactDate) {
            itemsResult = await sql`
        SELECT
          i.id,
          i.name,
          i.photo_url,
          i.expiry_date,
          i.sticker_30_percent,
          i.category_id,
          c.name AS category_name
        FROM items i
        LEFT JOIN categories c
          ON c.id = i.category_id
        WHERE
          LOWER(i.name) LIKE ${`%${search.toLowerCase()}%`}
          AND i.sticker_30_percent = true
          AND i.expiry_date = ${exactDate}::date
        ORDER BY i.expiry_date ASC, i.name ASC
        LIMIT ${PAGE_SIZE}
        OFFSET ${offset}
      `;

            countResult = await sql`
        SELECT COUNT(*)::int AS total
        FROM items i
        WHERE
          LOWER(i.name) LIKE ${`%${search.toLowerCase()}%`}
          AND i.sticker_30_percent = true
          AND i.expiry_date = ${exactDate}::date
      `;
        } else if (search && control === "30") {
            itemsResult = await sql`
        SELECT
          i.id,
          i.name,
          i.photo_url,
          i.expiry_date,
          i.sticker_30_percent,
          i.category_id,
          c.name AS category_name
        FROM items i
        LEFT JOIN categories c
          ON c.id = i.category_id
        WHERE
          LOWER(i.name) LIKE ${`%${search.toLowerCase()}%`}
          AND i.sticker_30_percent = true
        ORDER BY i.expiry_date ASC, i.name ASC
        LIMIT ${PAGE_SIZE}
        OFFSET ${offset}
      `;

            countResult = await sql`
        SELECT COUNT(*)::int AS total
        FROM items i
        WHERE
          LOWER(i.name) LIKE ${`%${search.toLowerCase()}%`}
          AND i.sticker_30_percent = true
      `;
        } else if (search && control === "month") {
            itemsResult = await sql`
        SELECT
          i.id,
          i.name,
          i.photo_url,
          i.expiry_date,
          i.sticker_30_percent,
          i.category_id,
          c.name AS category_name
        FROM items i
        LEFT JOIN categories c
          ON c.id = i.category_id
        WHERE
          LOWER(i.name) LIKE ${`%${search.toLowerCase()}%`}
          AND i.sticker_30_percent = false
        ORDER BY i.expiry_date ASC, i.name ASC
        LIMIT ${PAGE_SIZE}
        OFFSET ${offset}
      `;

            countResult = await sql`
        SELECT COUNT(*)::int AS total
        FROM items i
        WHERE
          LOWER(i.name) LIKE ${`%${search.toLowerCase()}%`}
          AND i.sticker_30_percent = false
      `;
        } else if (search && exactDate) {
            itemsResult = await sql`
        SELECT
          i.id,
          i.name,
          i.photo_url,
          i.expiry_date,
          i.sticker_30_percent,
          i.category_id,
          c.name AS category_name
        FROM items i
        LEFT JOIN categories c
          ON c.id = i.category_id
        WHERE
          LOWER(i.name) LIKE ${`%${search.toLowerCase()}%`}
          AND i.expiry_date = ${exactDate}::date
        ORDER BY i.expiry_date ASC, i.name ASC
        LIMIT ${PAGE_SIZE}
        OFFSET ${offset}
      `;

            countResult = await sql`
        SELECT COUNT(*)::int AS total
        FROM items i
        WHERE
          LOWER(i.name) LIKE ${`%${search.toLowerCase()}%`}
          AND i.expiry_date = ${exactDate}::date
      `;
        } else if (search) {
            itemsResult = await sql`
        SELECT
          i.id,
          i.name,
          i.photo_url,
          i.expiry_date,
          i.sticker_30_percent,
          i.category_id,
          c.name AS category_name
        FROM items i
        LEFT JOIN categories c
          ON c.id = i.category_id
        WHERE LOWER(i.name) LIKE ${`%${search.toLowerCase()}%`}
        ORDER BY i.expiry_date ASC, i.name ASC
        LIMIT ${PAGE_SIZE}
        OFFSET ${offset}
      `;

            countResult = await sql`
        SELECT COUNT(*)::int AS total
        FROM items i
        WHERE LOWER(i.name) LIKE ${`%${search.toLowerCase()}%`}
      `;
        } else if (control === "30") {
            itemsResult = await sql`
        SELECT
          i.id,
          i.name,
          i.photo_url,
          i.expiry_date,
          i.sticker_30_percent,
          i.category_id,
          c.name AS category_name
        FROM items i
        LEFT JOIN categories c
          ON c.id = i.category_id
        WHERE i.sticker_30_percent = true
        ORDER BY i.expiry_date ASC, i.name ASC
        LIMIT ${PAGE_SIZE}
        OFFSET ${offset}
      `;

            countResult = await sql`
        SELECT COUNT(*)::int AS total
        FROM items i
        WHERE i.sticker_30_percent = true
      `;
        } else if (control === "month") {
            itemsResult = await sql`
        SELECT
          i.id,
          i.name,
          i.photo_url,
          i.expiry_date,
          i.sticker_30_percent,
          i.category_id,
          c.name AS category_name
        FROM items i
        LEFT JOIN categories c
          ON c.id = i.category_id
        WHERE i.sticker_30_percent = false
        ORDER BY i.expiry_date ASC, i.name ASC
        LIMIT ${PAGE_SIZE}
        OFFSET ${offset}
      `;

            countResult = await sql`
        SELECT COUNT(*)::int AS total
        FROM items i
        WHERE i.sticker_30_percent = false
      `;
        } else if (exactDate) {
            itemsResult = await sql`
        SELECT
          i.id,
          i.name,
          i.photo_url,
          i.expiry_date,
          i.sticker_30_percent,
          i.category_id,
          c.name AS category_name
        FROM items i
        LEFT JOIN categories c
          ON c.id = i.category_id
        WHERE i.expiry_date = ${exactDate}::date
        ORDER BY i.expiry_date ASC, i.name ASC
        LIMIT ${PAGE_SIZE}
        OFFSET ${offset}
      `;

            countResult = await sql`
        SELECT COUNT(*)::int AS total
        FROM items i
        WHERE i.expiry_date = ${exactDate}::date
      `;
        } else if (fromDate && toDate) {
            itemsResult = await sql`
        SELECT
          i.id,
          i.name,
          i.photo_url,
          i.expiry_date,
          i.sticker_30_percent,
          i.category_id,
          c.name AS category_name
        FROM items i
        LEFT JOIN categories c
          ON c.id = i.category_id
        WHERE
          i.expiry_date >= ${fromDate}::date
          AND i.expiry_date <= ${toDate}::date
        ORDER BY i.expiry_date ASC, i.name ASC
        LIMIT ${PAGE_SIZE}
        OFFSET ${offset}
      `;

            countResult = await sql`
        SELECT COUNT(*)::int AS total
        FROM items i
        WHERE
          i.expiry_date >= ${fromDate}::date
          AND i.expiry_date <= ${toDate}::date
      `;
        } else if (fromDate) {
            itemsResult = await sql`
        SELECT
          i.id,
          i.name,
          i.photo_url,
          i.expiry_date,
          i.sticker_30_percent,
          i.category_id,
          c.name AS category_name
        FROM items i
        LEFT JOIN categories c
          ON c.id = i.category_id
        WHERE i.expiry_date >= ${fromDate}::date
        ORDER BY i.expiry_date ASC, i.name ASC
        LIMIT ${PAGE_SIZE}
        OFFSET ${offset}
      `;

            countResult = await sql`
        SELECT COUNT(*)::int AS total
        FROM items i
        WHERE i.expiry_date >= ${fromDate}::date
      `;
        } else if (toDate) {
            itemsResult = await sql`
        SELECT
          i.id,
          i.name,
          i.photo_url,
          i.expiry_date,
          i.sticker_30_percent,
          i.category_id,
          c.name AS category_name
        FROM items i
        LEFT JOIN categories c
          ON c.id = i.category_id
        WHERE i.expiry_date <= ${toDate}::date
        ORDER BY i.expiry_date ASC, i.name ASC
        LIMIT ${PAGE_SIZE}
        OFFSET ${offset}
      `;

            countResult = await sql`
        SELECT COUNT(*)::int AS total
        FROM items i
        WHERE i.expiry_date <= ${toDate}::date
      `;
        } else {
            itemsResult = await sql`
        SELECT
          i.id,
          i.name,
          i.photo_url,
          i.expiry_date,
          i.sticker_30_percent,
          i.category_id,
          c.name AS category_name
        FROM items i
        LEFT JOIN categories c
          ON c.id = i.category_id
        ORDER BY i.expiry_date ASC, i.name ASC
        LIMIT ${PAGE_SIZE}
        OFFSET ${offset}
      `;

            countResult = await sql`
        SELECT COUNT(*)::int AS total
        FROM items i
      `;
        }

        const total = countResult[0]?.total ?? 0;
        const totalPages = Math.max(
            1,
            Math.ceil(total / PAGE_SIZE),
        );

        return NextResponse.json({
            items: itemsResult,
            total,
            page,
            pageSize: PAGE_SIZE,
            totalPages,
        });
    } catch (error) {
        console.error("GET /api/items error:", error);

        return NextResponse.json(
            {
                error: "Items konden niet geladen worden.",
            },
            {
                status: 500,
            },
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            name,
            photo_url,
            expiry_date,
            category_id,
            sticker_30_percent,
        } = body;

        if (!name || !expiry_date || !category_id) {
            return NextResponse.json(
                {
                    error: "name, expiry_date and category_id are required",
                },
                { status: 400 }
            );
        }

        const result = await sql`
            INSERT INTO items (
                name,
                photo_url,
                expiry_date,
                category_id,
                sticker_30_percent
            )
            VALUES (
                ${name.trim()},
                ${photo_url || null},
                ${expiry_date},
                ${category_id},
                ${sticker_30_percent ?? false}
            )
            RETURNING
                id,
                name,
                photo_url,
                expiry_date,
                sticker_30_percent,
                category_id;
        `;

        return NextResponse.json(result[0], { status: 201 });
    } catch (error) {
        console.error("Failed to create item:", error);

        return NextResponse.json(
            { error: "Failed to create item" },
            { status: 500 }
        );
    }
}
