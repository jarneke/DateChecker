import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

function isUuid(value: unknown): value is string {
    return (
        typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            value,
        )
    );
}

function isItemVersion(value: unknown): value is number {
    return (
        typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value >= 0 &&
        value < 2147483647
    );
}

function isDate(value: unknown): value is string {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return false;
    }

    const date = new Date(`${value}T00:00:00Z`);

    return (
        Number.isFinite(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}

function isRunIds(value: unknown): value is string[] {
    return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.length <= 100 &&
        value.every(isUuid)
    );
}

function normalizeRunIds(values: string[]): string[] {
    return [...new Set(values.map((value) => value.toLowerCase()))].sort();
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

    console.error("Delivery check API failed:", error);

    return NextResponse.json(
        { error: "De leveringscheck kon niet verwerkt worden." },
        { status: 500 },
    );
}

export async function GET(request: NextRequest) {
    const rawRunIds =
        request.nextUrl.searchParams.get("runIds") ??
        request.nextUrl.searchParams.get("runId");

    try {
        if (rawRunIds !== null) {
            const requestedIds = rawRunIds.split(",");

            if (!isRunIds(requestedIds)) {
                return NextResponse.json(
                    { error: "Ongeldige leveringscheck." },
                    { status: 400 },
                );
            }

            const runIds = normalizeRunIds(requestedIds);

            const rows = await sql`
        SELECT public.datecheck_delivery_group_snapshot(
          ARRAY(
            SELECT value::uuid
            FROM jsonb_array_elements_text(
              ${JSON.stringify(runIds)}::jsonb
            )
          )
        ) AS snapshot
      `;

            if (!rows[0].snapshot) {
                return NextResponse.json(
                    { error: "Deze leveringscheck bestaat niet." },
                    { status: 404 },
                );
            }

            return NextResponse.json(
                { snapshot: rows[0].snapshot },
                { headers: { "Cache-Control": "no-store" } },
            );
        }

        const rows = await sql`
      SELECT public.datecheck_delivery_offers() AS offers
    `;

        return NextResponse.json(
            { offers: rows[0].offers },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        return errorResponse(error);
    }
}

export async function POST(request: NextRequest) {
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
            { error: "Ongeldige aanvraag." },
            { status: 400 },
        );
    }

    const body = parsed as Record<string, unknown>;

    try {
        if (body.action === "start") {
            if (
                body.restartCompleted !== undefined &&
                typeof body.restartCompleted !== "boolean"
            ) {
                return NextResponse.json(
                    { error: "Ongeldige startactie." },
                    { status: 400 },
                );
            }

            const restartCompleted = body.restartCompleted === true;

            const rows = await sql`
        SELECT public.datecheck_delivery_group_start(
          ${restartCompleted}::boolean
        ) AS snapshot
      `;

            return NextResponse.json(
                { snapshot: rows[0].snapshot },
                { headers: { "Cache-Control": "no-store" } },
            );
        }

        const actions = ["answer", "previous", "finish", "restart"];

        if (
            typeof body.action !== "string" ||
            !actions.includes(body.action) ||
            !isRunIds(body.runIds) ||
            typeof body.version !== "string" ||
            body.version.length === 0 ||
            body.version.length > 10000
        ) {
            return NextResponse.json(
                { error: "Ongeldige controlegegevens." },
                { status: 400 },
            );
        }

        if (
            body.action === "answer" &&
            (
                !isUuid(body.itemId) ||
                !isItemVersion(body.itemVersion) ||
                (
                    body.expiryDate !== null &&
                    !isDate(body.expiryDate)
                )
            )
        ) {
            return NextResponse.json(
                { error: "Ongeldige productgegevens of vervaldatum." },
                { status: 400 },
            );
        }

        if (body.action === "previous" && !isUuid(body.historyId)) {
            return NextResponse.json(
                { error: "Ongeldig vorig antwoord." },
                { status: 400 },
            );
        }

        const runIds = normalizeRunIds(body.runIds);

        const itemId =
            body.action === "answer" ? (body.itemId as string) : null;

        const itemVersion =
            body.action === "answer" ? (body.itemVersion as number) : null;

        const expiryDate =
            body.action === "answer" && typeof body.expiryDate === "string"
                ? body.expiryDate
                : null;

        const historyId =
            body.action === "previous" ? (body.historyId as string) : null;

        const rows = await sql`
      SELECT public.datecheck_delivery_group_action(
        ARRAY(
          SELECT value::uuid
          FROM jsonb_array_elements_text(
            ${JSON.stringify(runIds)}::jsonb
          )
        ),
        ${body.version}::text,
        ${body.action}::text,
        ${itemId}::uuid,
        ${itemVersion}::integer,
        ${expiryDate}::date,
        ${historyId}::uuid
      ) AS snapshot
    `;

        return NextResponse.json(
            { snapshot: rows[0].snapshot },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        return errorResponse(error);
    }
}