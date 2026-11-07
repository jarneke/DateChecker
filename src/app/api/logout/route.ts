import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

export function POST(request: NextRequest) {
    if (request.headers.get("sec-fetch-site") === "cross-site") {
        return NextResponse.json(
            { error: "Ongeldige aanvraag." },
            { status: 403 },
        );
    }

    const response = NextResponse.redirect(
        new URL("/login", request.url),
        303,
    );

    response.cookies.set({
        name: COOKIE_NAME,
        value: "",
        path: "/",
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
    });

    return response;
}