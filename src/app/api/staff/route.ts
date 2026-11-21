import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (session.role === "STAFF") return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  const staff = await prisma.staff.findMany({
    where: { hospitalId: session.hospitalId, isActive: true }, orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, employeeId: true, role: true, phone: true, photoUrl: true, floorId: true, departmentId: true, floor: { select: { id: true, name: true } }, department: { select: { id: true, name: true, floorId: true } } },
  });
  return NextResponse.json({ staff });
}

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (session.role === "STAFF") return NextResponse.json({ error: "Only administrators can add staff." }, { status: 403 });
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const employeeId = String(body.employeeId ?? "").trim();
    const password = String(body.password ?? "");
    const phone = String(body.phone ?? "").trim();
    const floorId = String(body.floorId ?? "");
    const departmentId = String(body.departmentId ?? "");
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || employeeId.length < 2 || password.length < 8) return NextResponse.json({ error: "Enter name, valid email, employee ID and a password of at least 8 characters." }, { status: 400 });
    if (await prisma.staff.findUnique({ where: { email } })) return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
    const [floor, department] = await Promise.all([
      prisma.floor.findFirst({ where: { id: floorId, hospitalId: session.hospitalId } }),
      prisma.department.findFirst({ where: { id: departmentId, hospitalId: session.hospitalId, floorId } }),
    ]);
    if (!floor || !department) return NextResponse.json({ error: "Select a department belonging to the selected floor." }, { status: 400 });
    const staff = await prisma.staff.create({
      data: { name, email, employeeId, phone: phone || null, passwordHash: hashPassword(password), role: "STAFF", hospitalId: session.hospitalId, floorId, departmentId },
      select: { id: true, name: true, email: true, employeeId: true, role: true, phone: true, photoUrl: true, floor: { select: { id: true, name: true } }, department: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ ok: true, staff }, { status: 201 });
  } catch (error) {
    console.error("Add staff failed:", error);
    return NextResponse.json({ error: "Could not add staff." }, { status: 500 });
  }
}
