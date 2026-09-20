import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const COOKIE_NAME = "site_session";
const SESSION_DURATION = 60 * 60 * 24 * 30; // 30 days

function getSecret() {
    const secret = process.env.AUTH_SECRET;

    if (!secret) {
        throw new Error("AUTH_SECRET is not configured");
    }

    return new TextEncoder().encode(secret);
}

export async function verifyPin(pin: string) {
    const hash = process.env.AUTH_PIN_HASH;

    if (!hash) {
        throw new Error("AUTH_PIN_HASH is not configured");
    }

    return bcrypt.compare(pin, hash);
}

export async function createSession() {
    return new SignJWT({
        authenticated: true,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${SESSION_DURATION}s`)
        .sign(getSecret());
}

export async function verifySession(token: string) {
    try {
        const { payload } = await jwtVerify(token, getSecret());

        return payload.authenticated === true;
    } catch {
        return false;
    }
}

export { COOKIE_NAME, SESSION_DURATION };