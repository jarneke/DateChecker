import { NextResponse } from "next/server";

export async function POST() {
    return NextResponse.json(
        {
            error:
                "Deze controle is vernieuwd. Herlaad de app om verder te gaan.",
        },
        { status: 410 },
    );
}