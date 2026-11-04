import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

function isUuid(value: unknown): value is string {
    return (
        typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    );
}

function isIds(value: unknown): value is string[] {
    return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.length <= 100 &&
        value.every(isUuid)
    );
}

function normalizeIds(values: string[]) {
    return [...new Set(values.map((value) => value.toLowerCase()))].sort();
}

function isDate(value: unknown): value is string {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00Z`);

    return (
        Number.isFinite(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
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

type RequestedOffer = {
    deliveryId: string;
    deliveryDate: string;
};

function isOffer(value: unknown): value is RequestedOffer {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }

    const offer = value as Record<string, unknown>;
    return isUuid(offer.deliveryId) && isDate(offer.deliveryDate);
}

function json(data: unknown, status = 200) {
    return NextResponse.json(data, {
        status,
        headers: { "Cache-Control": "no-store" },
    });
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
        return json({ error: error.message }, 409);
    }

    console.error("Delivery selection API failed:", error);
    return json({ error: "De leveringsselectie kon niet verwerkt worden." }, 500);
}

export async function GET(request: NextRequest) {
    try {
        const rawRunIds =
            request.nextUrl.searchParams.get("runIds") ??
            request.nextUrl.searchParams.get("runId");

        if (rawRunIds !== null) {
            const requestedRunIds = rawRunIds.split(",");
            const rawCategoryIds = request.nextUrl.searchParams.get("categoryIds");
            const requestedCategoryIds =
                rawCategoryIds === null ? null : rawCategoryIds.split(",");

            if (
                !isIds(requestedRunIds) ||
                (requestedCategoryIds !== null && !isIds(requestedCategoryIds))
            ) {
                return json({ error: "Ongeldige leveringsselectie." }, 400);
            }

            const runIds = normalizeIds(requestedRunIds);
            const categoryIds =
                requestedCategoryIds === null
                    ? null
                    : normalizeIds(requestedCategoryIds);

            const rows = await sql`
        SELECT public.datecheck_delivery_selection_snapshot(
          ARRAY(
            SELECT value::uuid
            FROM jsonb_array_elements_text(${JSON.stringify(runIds)}::jsonb)
          ),
          CASE
            WHEN ${categoryIds === null}::boolean THEN NULL::uuid[]
            ELSE ARRAY(
              SELECT value::uuid
              FROM jsonb_array_elements_text(
                ${JSON.stringify(categoryIds ?? [])}::jsonb
              )
            )
          END
        ) AS snapshot
      `;

            return json({ snapshot: rows[0].snapshot });
        }

        const rows = await sql`
      SELECT COALESCE(
        jsonb_agg(
          offer.value || jsonb_build_object(
            'categories', COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object('id', c.id, 'name', c.name)
                  ORDER BY c.sort_order, c.name, c.id
                )
                FROM public.categories c
                WHERE CASE
                  WHEN offer.value ->> 'runId' IS NOT NULL THEN
                    EXISTS (
                      SELECT 1
                      FROM public.datecheck_delivery_runs r
                      WHERE r.id = (offer.value ->> 'runId')::uuid
                        AND c.id = ANY(r.category_ids)
                    )
                  ELSE
                    EXISTS (
                      SELECT 1
                      FROM public.datecheck_delivery_categories dc
                      WHERE dc.delivery_id =
                        (offer.value ->> 'deliveryId')::uuid
                        AND dc.category_id = c.id
                    )
                END
              ),
              '[]'::jsonb
            )
          )
          ORDER BY offer.ordinality
        ),
        '[]'::jsonb
      ) AS offers
      FROM jsonb_array_elements(public.datecheck_delivery_offers())
        WITH ORDINALITY AS offer(value, ordinality)
    `;

        return json({ offers: rows[0].offers });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function POST(request: NextRequest) {
    let parsed: unknown;

    try {
        parsed = await request.json();
    } catch {
        return json({ error: "Ongeldige aanvraag." }, 400);
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return json({ error: "Ongeldige aanvraag." }, 400);
    }

    const body = parsed as Record<string, unknown>;

    try {
        if (body.action === "start") {
            if (
                !Array.isArray(body.offers) ||
                body.offers.length === 0 ||
                body.offers.length > 100 ||
                !body.offers.every(isOffer) ||
                !isIds(body.categoryIds) ||
                (
                    body.restartCompleted !== undefined &&
                    typeof body.restartCompleted !== "boolean"
                )
            ) {
                return json({ error: "Kies leveringen en minstens één categorie." }, 400);
            }

            const offers = body.offers.map((offer) => ({
                deliveryId: offer.deliveryId.toLowerCase(),
                deliveryDate: offer.deliveryDate,
            }));

            const categoryIds = normalizeIds(body.categoryIds);

            const rows = await sql`
        SELECT public.datecheck_delivery_selection_start(
          ${JSON.stringify(offers)}::jsonb,
          ARRAY(
            SELECT value::uuid
            FROM jsonb_array_elements_text(
              ${JSON.stringify(categoryIds)}::jsonb
            )
          ),
          ${body.restartCompleted === true}::boolean
        ) AS snapshot
      `;

            return json({ snapshot: rows[0].snapshot });
        }

        const actions = ["answer", "previous", "finish", "restart"];

        if (
            typeof body.action !== "string" ||
            !actions.includes(body.action) ||
            !isIds(body.runIds) ||
            (
                body.categoryIds !== null &&
                body.categoryIds !== undefined &&
                !isIds(body.categoryIds)
            ) ||
            typeof body.version !== "string" ||
            body.version.length === 0 ||
            body.version.length > 10000
        ) {
            return json({ error: "Ongeldige controlegegevens." }, 400);
        }

        if (
            body.action === "answer" &&
            (
                !isUuid(body.itemId) ||
                !isItemVersion(body.itemVersion) ||
                (body.expiryDate !== null && !isDate(body.expiryDate))
            )
        ) {
            return json({ error: "Ongeldig product of ongeldige vervaldatum." }, 400);
        }

        if (body.action === "previous" && !isUuid(body.historyId)) {
            return json({ error: "Ongeldig vorig antwoord." }, 400);
        }

        const runIds = normalizeIds(body.runIds);
        const categoryIds = isIds(body.categoryIds)
            ? normalizeIds(body.categoryIds)
            : null;

        const itemId = body.action === "answer" ? body.itemId as string : null;
        const itemVersion =
            body.action === "answer" ? body.itemVersion as number : null;
        const expiryDate =
            body.action === "answer" && typeof body.expiryDate === "string"
                ? body.expiryDate
                : null;
        const historyId =
            body.action === "previous" ? body.historyId as string : null;

        const rows = await sql`
      SELECT public.datecheck_delivery_selection_action(
        ARRAY(
          SELECT value::uuid
          FROM jsonb_array_elements_text(${JSON.stringify(runIds)}::jsonb)
        ),
        CASE
          WHEN ${categoryIds === null}::boolean THEN NULL::uuid[]
          ELSE ARRAY(
            SELECT value::uuid
            FROM jsonb_array_elements_text(
              ${JSON.stringify(categoryIds ?? [])}::jsonb
            )
          )
        END,
        ${body.version}::text,
        ${body.action}::text,
        ${itemId}::uuid,
        ${itemVersion}::integer,
        ${expiryDate}::date,
        ${historyId}::uuid
      ) AS snapshot
    `;

        return json({ snapshot: rows[0].snapshot });
    } catch (error) {
        return errorResponse(error);
    }
}