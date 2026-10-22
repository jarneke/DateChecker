import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { isCheckType } from "@/app/check/types";

export const dynamic = "force-dynamic";

const ACTIONS = [
    "sticker-yes",
    "sticker-no",
    "open-date",
    "draft-date",
    "back",
    "save-date",
    "no-stock",
    "evening-done",
    "previous",
] as const;

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

function isUuid(value: unknown): value is string {
    return (
        typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            value,
        )
    );
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
        typeof data.type !== "string" ||
        !isCheckType(data.type) ||
        typeof data.action !== "string" ||
        !ACTIONS.some((action) => action === data.action) ||
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
        ) ||
        (
            data.action === "previous" &&
            !isUuid(data.historyId)
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
        const result =
            data.action === "previous"
                ? await sql`
            SELECT public.datecheck_reopen_completion(
              ${data.date}::date,
              ${data.type}::text,
              ${data.itemId}::text,
              ${data.version}::integer,
              ${data.historyId as string}::uuid
            ) AS result
          `
                : await sql`
            SELECT public.datecheck_apply_recorded_action(
              ${data.date}::date,
              ${data.type}::text,
              ${data.itemId}::text,
              ${data.version}::integer,
              ${data.action}::text,
              ${expiryDate}::date
            ) AS result
          `;

        return NextResponse.json(result[0].result, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
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

        console.error("Check action failed:", error);

        return NextResponse.json(
            { error: "De controle kon niet bijgewerkt worden." },
            { status: 500 },
        );
    }
}