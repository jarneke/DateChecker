import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

const PAGE_SIZE = 10;

const SORT_OPTIONS = {
  name_asc: "name_asc",
  name_desc: "name_desc",
  expiry_asc: "expiry_asc",
  expiry_desc: "expiry_desc",
  category_asc: "category_asc",
  category_desc: "category_desc",
} as const;

type SortOption = keyof typeof SORT_OPTIONS;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const pageParam = Number(searchParams.get("page") ?? "1");
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

    const search = searchParams.get("search")?.trim() ?? "";
    const category = searchParams.get("category")?.trim() ?? "";
    const control = searchParams.get("control")?.trim() ?? "";

    const exactDate = searchParams.get("exactDate")?.trim() ?? "";
    const fromDate = searchParams.get("fromDate")?.trim() ?? "";
    const toDate = searchParams.get("toDate")?.trim() ?? "";

    const sortParam = searchParams.get("sort") ?? "name_asc";
    const sort: SortOption =
      sortParam in SORT_OPTIONS
        ? (sortParam as SortOption)
        : "name_asc";

    const offset = (page - 1) * PAGE_SIZE;

    let orderBy;

    switch (sort) {
      case "name_desc":
        orderBy = sql`i.name DESC`;
        break;

      case "expiry_asc":
        orderBy = sql`i.expiry_date ASC, i.name ASC`;
        break;

      case "expiry_desc":
        orderBy = sql`i.expiry_date DESC, i.name ASC`;
        break;

      case "category_asc":
        orderBy = sql`c.name ASC, i.name ASC`;
        break;

      case "category_desc":
        orderBy = sql`c.name DESC, i.name ASC`;
        break;

      case "name_asc":
      default:
        orderBy = sql`i.name ASC`;
        break;
    }

    const items = await sql`
      SELECT
        i.id,
        i.name,
        i.photo_url,
        i.category_id,
        c.name AS category_name,
        i.expiry_date,
        i.sticker_30_percent,
        i.created_at,
        i.updated_at
      FROM items i
      INNER JOIN categories c ON c.id = i.category_id
      WHERE
        (
          ${search} = ''
          OR i.name ILIKE ${"%" + search + "%"}
        )
        AND (
          ${category} = ''
          OR c.name = ${category}
        )
        AND (
          ${control} = ''
          OR (${control} = '30' AND i.sticker_30_percent = true)
          OR (${control} = 'month' AND i.sticker_30_percent = false)
        )
        AND (
          ${exactDate} = ''
          OR i.expiry_date = ${exactDate}::date
        )
        AND (
          ${fromDate} = ''
          OR i.expiry_date >= ${fromDate}::date
        )
        AND (
          ${toDate} = ''
          OR i.expiry_date <= ${toDate}::date
        )
      ORDER BY ${orderBy}
      LIMIT ${PAGE_SIZE}
      OFFSET ${offset}
    `;

    const countResult = await sql`
      SELECT COUNT(*)::int AS total
      FROM items i
      INNER JOIN categories c ON c.id = i.category_id
      WHERE
        (
          ${search} = ''
          OR i.name ILIKE ${"%" + search + "%"}
        )
        AND (
          ${category} = ''
          OR c.name = ${category}
        )
        AND (
          ${control} = ''
          OR (${control} = '30' AND i.sticker_30_percent = true)
          OR (${control} = 'month' AND i.sticker_30_percent = false)
        )
        AND (
          ${exactDate} = ''
          OR i.expiry_date = ${exactDate}::date
        )
        AND (
          ${fromDate} = ''
          OR i.expiry_date >= ${fromDate}::date
        )
        AND (
          ${toDate} = ''
          OR i.expiry_date <= ${toDate}::date
        )
    `;

    const total = countResult[0]?.total ?? 0;

    return NextResponse.json({
      items,
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (error) {
    console.error("Failed to fetch items:", error);

    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim().toUpperCase()
        : "";

    const photoUrl =
      typeof body.photo_url === "string" && body.photo_url.trim() !== ""
        ? body.photo_url.trim()
        : null;

    const expiryDate =
      typeof body.expiry_date === "string"
        ? body.expiry_date
        : "";

    const categoryId =
      typeof body.category_id === "string"
        ? body.category_id.trim()
        : "";

    const sticker30Percent =
      typeof body.sticker_30_percent === "boolean"
        ? body.sticker_30_percent
        : false;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!expiryDate) {
      return NextResponse.json(
        { error: "Expiry date is required" },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category is required" },
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
        ${name},
        ${photoUrl},
        ${expiryDate},
        ${categoryId},
        ${sticker30Percent}
      )
      RETURNING
        id,
        name,
        photo_url,
        expiry_date,
        category_id,
        sticker_30_percent,
        created_at,
        updated_at
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create item:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        { error: "Een item met deze naam bestaat al." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Item kon niet toegevoegd worden." },
      { status: 500 }
    );
  }
}