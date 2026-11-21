import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const hospitalName = String(body.hospitalName ?? "").trim();
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || hospitalName.length < 2) {
      return NextResponse.json({ error: "Enter your name, a valid email, a hospital name and a password of at least 8 characters." }, { status: 400 });
    }
    if (await prisma.staff.findUnique({ where: { email } })) return NextResponse.json({ error: "An account already uses this email. Please sign in." }, { status: 409 });

    const created = await prisma.$transaction(async (tx) => {
      const hospital = await tx.hospital.create({ data: { name: hospitalName } });
      const floor = await tx.floor.create({ data: { name: "Ground Floor", hospitalId: hospital.id } });
      const department = await tx.department.create({ data: { name: "Housekeeping", hospitalId: hospital.id, floorId: floor.id } });
      const staff = await tx.staff.create({ data: {
        name, email, passwordHash: hashPassword(password), employeeId: `ADMIN-${Date.now()}`,
        role: "ADMIN", hospitalId: hospital.id, floorId: floor.id, departmentId: department.id,
      } });
      return { hospital, staff };
    });

    const response = NextResponse.json({ ok: true, redirect: "/dashboard", user: { name: created.staff.name, role: created.staff.role } });
    setSessionCookie(response, { staffId: created.staff.id, email, name, role: "ADMIN", hospitalId: created.hospital.id });
    return response;
  } catch (error) {
    console.error("Hospisafe signup failed:", error);
    return NextResponse.json({ error: "We could not create your workspace. Please try again." }, { status: 500 });
  }
}
