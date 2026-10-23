import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySession } from "@/lib/auth";

export async function proxy(request: NextRequest) {
    if (request.nextUrl.pathname === "/apple-icon.png") {
        return NextResponse.next();
    }

    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token || !(await verifySession(token))) {
        const loginUrl = new URL("/login", request.url);

        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!login|api/login|_next/static|_next/image|favicon.ico).*)",
    ],
};