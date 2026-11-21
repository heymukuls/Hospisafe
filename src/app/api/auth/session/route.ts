import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const user = await prisma.staff.findFirst({
    where: { id: session.staffId, hospitalId: session.hospitalId, isActive: true },
    select: { id: true, name: true, email: true, employeeId: true, role: true, phone: true, photoUrl: true, hospital: { select: { name: true } }, floor: { select: { id: true, name: true } }, department: { select: { id: true, name: true } } },
  });
  if (!user) return NextResponse.json({ error: "Account is unavailable" }, { status: 401 });
  return NextResponse.json({ user });
}
