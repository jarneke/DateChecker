
import { NextResponse } from "next/server";
import {
    COOKIE_NAME,
    SESSION_DURATION,
    createSession,
    verifyPin,
} from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const pin = body?.pin;

        if (
            typeof pin !== "string" ||
            !/^\d{6}$/.test(pin)
        ) {
            return NextResponse.json(
                { error: "Invalid PIN" },
                { status: 400 },
            );
        }

        const valid = await verifyPin(pin);

        if (!valid) {
            return NextResponse.json(
                { error: "Invalid PIN" },
                { status: 401 },
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

        return response;
    } catch (error) {
        console.error("Login error:", error);

        return NextResponse.json(
            { error: "Login failed" },
            { status: 500 },
        );
    }
}
