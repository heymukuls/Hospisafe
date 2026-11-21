import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (session.role === "STAFF") return NextResponse.json({ error: "Only administrators can edit staff accounts." }, { status: 403 });
  const { id } = await context.params;
  try {
    const current = await prisma.staff.findFirst({ where: { id, hospitalId: session.hospitalId, role: "STAFF" } });
    if (!current) return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const floorId = String(body.floorId ?? "");
    const departmentId = String(body.departmentId ?? "");
    const password = String(body.password ?? "");
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid name and email." }, { status: 400 });
    if (password && password.length < 8) return NextResponse.json({ error: "A new password must contain at least 8 characters." }, { status: 400 });
    const duplicate = await prisma.staff.findFirst({ where: { email, NOT: { id } } });
    if (duplicate) return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
    const [floor, department] = await Promise.all([
      prisma.floor.findFirst({ where: { id: floorId, hospitalId: session.hospitalId } }),
      prisma.department.findFirst({ where: { id: departmentId, hospitalId: session.hospitalId, floorId } }),
    ]);
    if (!floor || !department) return NextResponse.json({ error: "Select a department belonging to the selected floor." }, { status: 400 });
    const updated = await prisma.staff.update({
      where: { id },
      data: { name, email, phone: phone || null, floorId, departmentId, ...(password ? { passwordHash: hashPassword(password) } : {}) },
      select: { id: true, name: true, email: true, employeeId: true, role: true, phone: true, photoUrl: true, floor: { select: { id: true, name: true } }, department: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ ok: true, staff: updated });
  } catch (error) {
    console.error("Edit staff failed:", error);
    return NextResponse.json({ error: "Could not update staff account." }, { status: 500 });
  }
}
