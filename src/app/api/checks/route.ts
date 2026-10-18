import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const CHECK_TYPES = [
    "sticker",
    "overdue",
    "monthly",
    "evening",
    "stock",
] as const;

const ACTIONS = [
    "sticker-yes",
    "sticker-no",
    "open-date",
    "draft-date",
    "back",
    "save-date",
    "no-stock",
    "evening-done",
] as const;

function isCheckType(value: unknown): value is string {
    return (
        typeof value === "string" &&
        CHECK_TYPES.some((type) => type === value)
    );
}

function isAction(value: unknown): value is string {
    return (
        typeof value === "string" &&
        ACTIONS.some((action) => action === value)
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

function errorResponse(error: unknown) {
    if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P0001" &&
        "message" in error &&
        typeof error.message === "string"
    ) {
        return NextResponse.json(
            { error: error.message },
            { status: 409 },
        );
    }

    console.error("Check API failed:", error);

    return NextResponse.json(
        { error: "De controle kon niet bijgewerkt worden." },
        { status: 500 },
    );
}

export async function GET(request: NextRequest) {
    const type = request.nextUrl.searchParams.get("type");
    const categoryId =
        request.nextUrl.searchParams.get("categoryId") || "all";

    if (type !== null && !isCheckType(type)) {
        return NextResponse.json(
            { error: "Ongeldige controle." },
            { status: 400 },
        );
    }

    try {
        const prepared = await sql`
      SELECT datecheck_prepare_checks(${type})::text AS check_date
    `;

        const day = prepared[0].check_date as string;

        const [dayRows, itemRows, progressRows, categoryRows] =
            await sql.transaction([
                sql`
          SELECT
            d.check_date::text AS check_date,
            d.morning_completed_at IS NOT NULL AS morning_completed,
            d.evening_completed_at IS NOT NULL AS evening_completed,
            (
              SELECT COUNT(*)::int
              FROM datecheck_check_items ci
              WHERE ci.check_date = d.check_date
                AND ci.check_type = 'sticker'
                AND ci.completed_at IS NULL
            ) AS morning_remaining,
            (
              SELECT COUNT(*)::int
              FROM datecheck_check_items ci
              WHERE ci.check_date = d.check_date
                AND ci.check_type = 'evening'
                AND ci.completed_at IS NULL
            ) AS evening_remaining
          FROM datecheck_check_days d
          WHERE d.check_date = ${day}::date
        `,
                sql`
          SELECT
            i.id,
            i.name,
            i.photo_url,
            i.expiry_date::text AS expiry_date,
            i.sticker_30_percent,
            i.category_id,
            i.paused,
            i.stickered_for_date::text AS stickered_for_date,
            c.name AS category_name,
            ci.stage,
            ci.draft_expiry_date::text AS draft_expiry_date,
            ci.version
          FROM datecheck_check_items ci
          INNER JOIN items i ON i.id::text = ci.item_id
          INNER JOIN categories c ON c.id = i.category_id
          WHERE ci.check_date = ${day}::date
            AND ci.check_type = ${type}
            AND ci.completed_at IS NULL
            AND i.paused = FALSE
            AND (
              ${type}::text <> 'stock'
              OR ${categoryId} = 'all'
              OR i.category_id::text = ${categoryId}
            )
          ORDER BY
            c.sort_order ASC,
            i.expiry_date ASC NULLS LAST,
            i.name ASC,
            i.id ASC
        `,
                sql`
          SELECT
            COUNT(*)::int AS initial_count,
            COUNT(*) FILTER (
              WHERE completed_at IS NOT NULL
            )::int AS completed_count
          FROM datecheck_check_items
          WHERE check_date = ${day}::date
            AND check_type = ${type}
            AND (
              ${type}::text <> 'stock'
              OR ${categoryId} = 'all'
              OR category_id = ${categoryId}
            )
        `,
                sql`
          SELECT
            c.id,
            c.name,
            c.color,
            COUNT(ci.item_id) FILTER (
              WHERE ci.completed_at IS NULL
            )::int AS remaining_count
          FROM categories c
          LEFT JOIN datecheck_check_items ci
            ON ci.category_id = c.id::text
            AND ci.check_date = ${day}::date
            AND ci.check_type = 'stock'
          GROUP BY c.id, c.name, c.color, c.sort_order
          ORDER BY c.sort_order ASC, c.name ASC
        `,
            ]);

        const state = dayRows[0];

        const blocked =
            type === "sticker"
                ? state.morning_completed
                    ? "De ochtendcontrole is al afgerond."
                    : null
                : type === "evening"
                    ? !state.morning_completed
                        ? "Rond eerst de ochtendcontrole af."
                        : state.evening_completed
                            ? "De avondcontrole is al afgerond."
                            : null
                    : null;

        return NextResponse.json(
            {
                date: day,
                morningCompleted: state.morning_completed,
                eveningCompleted: state.evening_completed,
                morningRemaining: state.morning_remaining,
                eveningRemaining: state.evening_remaining,
                blocked,
                items: blocked ? [] : itemRows,
                initialCount: progressRows[0]?.initial_count ?? 0,
                completedCount: progressRows[0]?.completed_count ?? 0,
                categories: categoryRows,
            },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            },
        );
    } catch (error) {
        return errorResponse(error);
    }
}

export async function POST(request: NextRequest) {
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Ongeldige aanvraag." },
            { status: 400 },
        );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return NextResponse.json(
            { error: "Ongeldige aanvraag." },
            { status: 400 },
        );
    }

    const data = body as Record<string, unknown>;

    if (
        !isCheckType(data.type) ||
        !isAction(data.action) ||
        !isDate(data.date) ||
        typeof data.itemId !== "string" ||
        data.itemId.length === 0 ||
        data.itemId.length > 100 ||
        typeof data.version !== "number" ||
        !Number.isSafeInteger(data.version) ||
        data.version < 0 ||
        data.version > 2147483647 ||
        (
            data.expiryDate !== undefined &&
            data.expiryDate !== null &&
            !isDate(data.expiryDate)
        )
    ) {
        return NextResponse.json(
            { error: "Ongeldige controlegegevens." },
            { status: 400 },
        );
    }

    const expiryDate =
        typeof data.expiryDate === "string" ? data.expiryDate : null;

    try {
        const result = await sql`
      SELECT datecheck_apply_action(
        ${data.date}::date,
        ${data.type}::text,
        ${data.itemId}::text,
        ${data.version}::integer,
        ${data.action}::text,
        ${expiryDate}::date
      ) AS task
    `;

        return NextResponse.json(
            { task: result[0].task },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            },
        );
    } catch (error) {
        return errorResponse(error);
    }
}