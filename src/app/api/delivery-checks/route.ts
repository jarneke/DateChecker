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

function isVersion(value: unknown): value is number {
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
    const runId = request.nextUrl.searchParams.get("runId");

    if (runId !== null && !isUuid(runId)) {
        return NextResponse.json(
            { error: "Ongeldige leveringscheck." },
            { status: 400 },
        );
    }

    try {
        if (runId) {
            const rows = await sql`
        SELECT public.datecheck_delivery_snapshot(
          ${runId}::uuid
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
            if (!isUuid(body.deliveryId) || !isDate(body.deliveryDate)) {
                return NextResponse.json(
                    { error: "Ongeldige levering of leveringsdatum." },
                    { status: 400 },
                );
            }

            const rows = await sql`
        SELECT public.datecheck_delivery_start(
          ${body.deliveryId}::uuid,
          ${body.deliveryDate}::date
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
            !isUuid(body.runId) ||
            !isVersion(body.version)
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
                !isVersion(body.itemVersion) ||
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
      SELECT public.datecheck_delivery_action(
        ${body.runId}::uuid,
        ${body.version}::integer,
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