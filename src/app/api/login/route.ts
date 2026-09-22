import { NextResponse } from "next/server";
import {
    COOKIE_NAME,
    SESSION_DURATION,
    createSession,
    verifyPin,
} from "@/lib/auth";

export async function POST(request: Request) {
    const body = await request.json();
    const pin = body.pin;

    if (typeof pin !== "string" || !/^\d{6}$/.test(pin)) {
        return NextResponse.json(
            { error: "Invalid PIN" },
            { status: 400 }
        );
    }

    const valid = await verifyPin(pin);

    if (!valid) {
        return NextResponse.json(
            { error: "Invalid PIN" },
            { status: 401 }
        );
    }

    const token = await createSession();

    const response = NextResponse.json({
        success: true,
    });

    response.cookies.set({
        name: COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_DURATION,
    });

    console.log("AUTH_PIN_HASH exists:", !!process.env.AUTH_PIN_HASH);
    console.log("AUTH_PIN_HASH length:", process.env.AUTH_PIN_HASH?.length);
    console.log("AUTH_PIN_HASH start:", process.env.AUTH_PIN_HASH?.slice(0, 10));
    console.log("AUTH_SECRET exists:", !!process.env.AUTH_SECRET);
    console.log("AUTH_SECRET length:", process.env.AUTH_SECRET?.length);

    return response;
}