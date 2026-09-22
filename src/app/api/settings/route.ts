import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
    try {
        const result = await sql`
      SELECT month_check_days_before_end
      FROM settings
      WHERE id = 1
    `;

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Instellingen niet gevonden." },
                { status: 404 },
            );
        }

        return NextResponse.json({
            monthCheckDaysBeforeEnd:
                result[0].month_check_days_before_end,
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

        const result = await sql`
      UPDATE settings
      SET
        month_check_days_before_end = ${daysBeforeEnd},
        updated_at = NOW()
      WHERE id = 1
      RETURNING month_check_days_before_end
    `;

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Instellingen niet gevonden." },
                { status: 404 },
            );
        }

        return NextResponse.json({
            monthCheckDaysBeforeEnd:
                result[0].month_check_days_before_end,
        });
    } catch (error) {
        console.error("Failed to update settings:", error);

        return NextResponse.json(
            { error: "Instellingen konden niet opgeslagen worden." },
            { status: 500 },
        );
    }
}