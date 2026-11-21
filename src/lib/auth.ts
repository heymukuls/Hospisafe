import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export const AUTH_COOKIE = "hospisafe_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export type AuthSession = {
  staffId: string;
  email: string;
  name: string;
  role: "ADMIN" | "SUPERVISOR" | "STAFF";
  hospitalId: string;
  exp: number;
};

type StaffForSession = Omit<AuthSession, "exp">;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET is not configured. Run the Hospisafe patch setup again.");
  return value;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function setSessionCookie(response: NextResponse, staff: StaffForSession) {
  const payload: AuthSession = { ...staff, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  response.cookies.set(AUTH_COOKIE, `${encoded}.${sign(encoded)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export function getSession(request: NextRequest): AuthSession | null {
  try {
    const token = request.cookies.get(AUTH_COOKIE)?.value;
    if (!token) return null;
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return null;
    const expected = Buffer.from(sign(encoded));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as AuthSession;
    if (!payload.staffId || !payload.hospitalId || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!["ADMIN", "SUPERVISOR", "STAFF"].includes(payload.role)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function authError(message = "Please sign in to continue.", status = 401) {
  return Response.json({ error: message }, { status });
}
