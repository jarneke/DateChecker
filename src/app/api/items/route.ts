import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { sql } from "@/lib/db";

const PAGE_SIZE = 10;

const SORT_SQL = {
  name_asc: "i.name ASC",
  name_desc: "i.name DESC",
  expiry_asc: "i.expiry_date ASC NULLS LAST",
  expiry_desc: "i.expiry_date DESC NULLS LAST",
  category_asc: "c.name ASC",
  category_desc: "c.name DESC",
  category_order: "c.sort_order ASC NULLS LAST, c.name ASC",
  updated_desc: "i.updated_at DESC NULLS LAST",
  created_desc: "i.created_at DESC NULLS LAST",
  created_asc: "i.created_at ASC NULLS LAST",
  stickered_first: "i.stickered DESC",
  unstickered_first: "i.stickered ASC",
} as const;

const dateFilter = z.union([z.literal(""), z.iso.date()]).default("");

const filtersSchema = z.object({
  page: z.coerce.number().int().positive().max(2147483647).catch(1),
  search: z.string().trim().default(""),
  category: z.string().trim().default(""),
  control: z.enum(["", "all", "30", "month"]).default(""),
  stickered: z.enum(["all", "yes", "no"]).default("all"),
  stock: z.enum(["all", "dated", "undated"]).default("all"),
  status: z.enum(["all", "active", "paused"]).default("all"),
  photo: z.enum(["all", "yes", "no"]).default("all"),
  datePreset: z
    .enum(["all", "overdue", "today", "next7", "custom"])
    .default("custom"),
  exactDate: dateFilter,
  fromDate: dateFilter,
  toDate: dateFilter,
  sort: z.string().default("name_asc"),
});

export async function GET(request: NextRequest) {
  const parsed = filtersSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Een filter heeft een ongeldige waarde of datum." },
      { status: 400 },
    );
  }

  const filters = parsed.data;

  if (
    filters.datePreset === "custom" &&
    filters.fromDate &&
    filters.toDate &&
    filters.fromDate > filters.toDate
  ) {
    return NextResponse.json(
      { error: "De begindatum moet voor of op de einddatum liggen." },
      { status: 400 },
    );
  }

  const sort = Object.prototype.hasOwnProperty.call(SORT_SQL, filters.sort)
    ? (filters.sort as keyof typeof SORT_SQL)
    : "name_asc";

  const values: (string | number)[] = [];
  const conditions: string[] = [];

  function bind(value: string) {
    values.push(value);
    return "$" + values.length;
  }

  if (filters.search) {
    conditions.push("i.name ILIKE " + bind("%" + filters.search + "%"));
  }

  if (filters.category) {
    conditions.push("i.category_id::text = " + bind(filters.category));
  }

  if (filters.control === "30") {
    conditions.push("i.sticker_30_percent = TRUE");
  } else if (filters.control === "month") {
    conditions.push("i.sticker_30_percent = FALSE");
  }

  if (filters.stickered !== "all") {
    conditions.push(
      filters.stickered === "yes" ? "i.stickered = TRUE" : "i.stickered = FALSE",
    );
  }

  if (filters.stock !== "all") {
    conditions.push(
      filters.stock === "dated"
        ? "i.expiry_date IS NOT NULL"
        : "i.expiry_date IS NULL",
    );
  }

  if (filters.status !== "all") {
    conditions.push(
      filters.status === "paused" ? "i.paused = TRUE" : "i.paused = FALSE",
    );
  }

  if (filters.photo !== "all") {
    conditions.push(
      filters.photo === "yes"
        ? "NULLIF(BTRIM(i.photo_url), '') IS NOT NULL"
        : "NULLIF(BTRIM(i.photo_url), '') IS NULL",
    );
  }

  const today = "(CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Brussels')::date";

  if (filters.datePreset === "overdue") {
    conditions.push("i.expiry_date < " + today);
  } else if (filters.datePreset === "today") {
    conditions.push("i.expiry_date = " + today);
  } else if (filters.datePreset === "next7") {
    conditions.push("i.expiry_date BETWEEN " + today + " AND " + today + " + 7");
  } else if (filters.datePreset === "custom") {
    if (filters.exactDate) {
      conditions.push("i.expiry_date = " + bind(filters.exactDate) + "::date");
    }

    if (filters.fromDate) {
      conditions.push("i.expiry_date >= " + bind(filters.fromDate) + "::date");
    }

    if (filters.toDate) {
      conditions.push("i.expiry_date <= " + bind(filters.toDate) + "::date");
    }
  }

  const where = conditions.length > 0 ? conditions.join(" AND ") : "TRUE";
  const from =
    " FROM items i INNER JOIN categories c ON c.id = i.category_id WHERE " + where;
  const offset = (filters.page - 1) * PAGE_SIZE;

  try {
    const [items, countResult] = await sql.transaction(
      [
        sql.query(
          [
            "SELECT i.id, i.name, i.photo_url, i.category_id,",
            "c.name AS category_name, c.color AS category_color,",
            "i.expiry_date, i.sticker_30_percent, i.stickered, i.paused,",
            "i.stickered_for_date, i.created_at, i.updated_at",
            from,
            "ORDER BY " + SORT_SQL[sort] + ", i.name ASC, i.id ASC",
            "LIMIT $" + (values.length + 1),
            "OFFSET $" + (values.length + 2),
          ].join(" "),
          [...values, PAGE_SIZE, offset],
        ),
        sql.query("SELECT COUNT(*)::int AS total" + from, values),
      ],
      { readOnly: true, isolationLevel: "RepeatableRead" },
    );

    const total = Number(countResult[0]?.total ?? 0);

    return NextResponse.json(
      {
        items,
        page: filters.page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to fetch items:", error);

    return NextResponse.json(
      { error: "Producten konden niet geladen worden." },
      { status: 500 },
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
      typeof body.photo_url === "string" &&
        body.photo_url.trim() !== ""
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

    const paused =
      typeof body.paused === "boolean"
        ? body.paused
        : false;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }

    if (!expiryDate) {
      return NextResponse.json(
        { error: "Expiry date is required" },
        { status: 400 },
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 },
      );
    }

    const result = await sql`
      INSERT INTO items (
        name,
        photo_url,
        expiry_date,
        category_id,
        sticker_30_percent,
        paused
      )
      VALUES (
        ${name},
        ${photoUrl},
        ${expiryDate},
        ${categoryId},
        ${sticker30Percent},
        ${paused}
      )
      RETURNING
        id,
        name,
        photo_url,
        expiry_date,
        category_id,
        sticker_30_percent,
        stickered,
        paused,
        stickered_for_date,
        created_at,
        updated_at
    `;

    return NextResponse.json(result[0], {
      status: 201,
    });
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
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Item kon niet toegevoegd worden." },
      { status: 500 },
    );
  }
}