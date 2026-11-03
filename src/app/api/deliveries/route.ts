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

async function readBody(
    request: NextRequest,
): Promise<Record<string, unknown> | null> {
    try {
        const body: unknown = await request.json();

        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return null;
        }

        return body as Record<string, unknown>;
    } catch {
        return null;
    }
}

function errorResponse(error: unknown) {
    if (error && typeof error === "object" && "code" in error) {
        if (
            error.code === "P0001" &&
            "message" in error &&
            typeof error.message === "string"
        ) {
            return NextResponse.json(
                { error: error.message },
                { status: 409 },
            );
        }

        if (error.code === "23505") {
            return NextResponse.json(
                { error: "Er bestaat al een levering met deze naam." },
                { status: 409 },
            );
        }

        if (error.code === "23503") {
            return NextResponse.json(
                {
                    error:
                        "Een gekoppelde categorie is intussen gewijzigd. Vernieuw de instellingen.",
                },
                { status: 409 },
            );
        }
    }

    console.error("Delivery API failed:", error);

    return NextResponse.json(
        { error: "De leveringsplanning kon niet bijgewerkt worden." },
        { status: 500 },
    );
}

export async function GET() {
    try {
        const rows = await sql`
      SELECT jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'active', d.active,
        'version', d.version,
        'weekdays', COALESCE(
          (
            SELECT jsonb_agg(w.weekday ORDER BY w.weekday)
            FROM public.datecheck_delivery_weekdays w
            WHERE w.delivery_id = d.id
          ),
          '[]'::jsonb
        ),
        'categoryIds', COALESCE(
          (
            SELECT jsonb_agg(
              dc.category_id ORDER BY dc.category_id
            )
            FROM public.datecheck_delivery_categories dc
            WHERE dc.delivery_id = d.id
          ),
          '[]'::jsonb
        )
      ) AS delivery
      FROM public.datecheck_deliveries d
      WHERE d.deleted_at IS NULL
      ORDER BY lower(d.name), d.id
    `;

        return NextResponse.json(
            { deliveries: rows.map((row) => row.delivery) },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        return errorResponse(error);
    }
}

async function saveDelivery(
    request: NextRequest,
    editing: boolean,
) {
    const body = await readBody(request);

    if (!body) {
        return NextResponse.json(
            { error: "Ongeldige aanvraag." },
            { status: 400 },
        );
    }

    if (
        typeof body.name !== "string" ||
        body.name.trim().length === 0 ||
        body.name.trim().length > 120 ||
        typeof body.active !== "boolean" ||
        !Array.isArray(body.weekdays) ||
        body.weekdays.length === 0 ||
        !body.weekdays.every(
            (day: unknown) =>
                typeof day === "number" &&
                Number.isInteger(day) &&
                day >= 1 &&
                day <= 7,
        ) ||
        !Array.isArray(body.categoryIds) ||
        body.categoryIds.length === 0 ||
        !body.categoryIds.every(isUuid) ||
        (editing && (!isUuid(body.id) || !isVersion(body.version)))
    ) {
        return NextResponse.json(
            {
                error:
                    "Vul een naam in en kies minstens één weekdag en categorie.",
            },
            { status: 400 },
        );
    }

    const id = editing ? (body.id as string) : null;
    const version = editing ? (body.version as number) : null;

    try {
        const rows = await sql`
      SELECT public.datecheck_save_delivery(
        ${id}::uuid,
        ${body.name.trim()}::text,
        ${body.active}::boolean,
        ARRAY(
          SELECT value::integer
          FROM jsonb_array_elements_text(
            ${JSON.stringify(body.weekdays)}::jsonb
          )
        ),
        ARRAY(
          SELECT value::uuid
          FROM jsonb_array_elements_text(
            ${JSON.stringify(body.categoryIds)}::jsonb
          )
        ),
        ${version}::integer
      ) AS delivery
    `;

        return NextResponse.json(
            { delivery: rows[0].delivery },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        return errorResponse(error);
    }
}

export async function POST(request: NextRequest) {
    return saveDelivery(request, false);
}

export async function PATCH(request: NextRequest) {
    return saveDelivery(request, true);
}

export async function DELETE(request: NextRequest) {
    const body = await readBody(request);

    if (!body || !isUuid(body.id) || !isVersion(body.version)) {
        return NextResponse.json(
            { error: "Ongeldige levering." },
            { status: 400 },
        );
    }

    try {
        const rows = await sql`
      SELECT public.datecheck_delete_delivery(
        ${body.id}::uuid,
        ${body.version}::integer
      ) AS id
    `;

        return NextResponse.json(
            { id: rows[0].id },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        return errorResponse(error);
    }
}