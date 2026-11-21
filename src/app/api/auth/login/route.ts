import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
    const staff = await prisma.staff.findUnique({ where: { email }, include: { hospital: true } });
    if (!staff?.passwordHash || !staff.isActive || !verifyPassword(password, staff.passwordHash)) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true, redirect: staff.role === "STAFF" ? "/staff" : "/dashboard", user: { name: staff.name, role: staff.role } });
    setSessionCookie(response, { staffId: staff.id, email: staff.email ?? email, name: staff.name, role: staff.role, hospitalId: staff.hospitalId });
    return response;
  } catch (error) {
    console.error("Hospisafe login failed:", error);
    return NextResponse.json({ error: "Sign in is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
