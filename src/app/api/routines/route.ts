import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { kolkataDateKey, kolkataMidnight, materializeDailyRoutine } from "@/lib/routines";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (session.role === "STAFF") return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  const routines = await prisma.routineSchedule.findMany({
    where: { hospitalId: session.hospitalId }, orderBy: { createdAt: "desc" },
    include: { area: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true, employeeId: true } } },
  });
  return NextResponse.json({ routines });
}

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (session.role === "STAFF") return NextResponse.json({ error: "Only administrators can create daily routines." }, { status: 403 });
  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const areaId = String(body.areaId ?? "");
    const assignedToId = String(body.assignedToId ?? "") || null;
    const priority = ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(body.priority) ? body.priority : "MEDIUM";
    const dueTime = String(body.dueTime ?? "09:00");
    const startDateKey = String(body.startDate ?? kolkataDateKey());
    const endDateKey = String(body.endDate ?? "").trim();
    if (title.length < 3 || !areaId || !/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime) || !/^\d{4}-\d{2}-\d{2}$/.test(startDateKey)) {
      return NextResponse.json({ error: "Enter a routine title, area, start date and valid daily due time." }, { status: 400 });
    }
    if (endDateKey && (!/^\d{4}-\d{2}-\d{2}$/.test(endDateKey) || endDateKey < startDateKey)) {
      return NextResponse.json({ error: "The end date must be on or after the start date." }, { status: 400 });
    }
    const area = await prisma.area.findFirst({ where: { id: areaId, hospitalId: session.hospitalId } });
    if (!area?.floorId || !area.departmentId) return NextResponse.json({ error: "Choose an area with a floor and department." }, { status: 400 });
    if (assignedToId) {
      const staff = await prisma.staff.findFirst({ where: { id: assignedToId, hospitalId: session.hospitalId, role: "STAFF", isActive: true } });
      if (!staff) return NextResponse.json({ error: "Choose active staff from this hospital." }, { status: 400 });
    }
    const creator = await prisma.staff.findFirst({ where: { id: session.staffId, hospitalId: session.hospitalId } });
    if (!creator) return NextResponse.json({ error: "Administrator account not found." }, { status: 401 });
    const schedule = await prisma.routineSchedule.create({
      data: {
        title, description: description || null, priority, frequency: "DAILY", dueTime,
        startDate: kolkataMidnight(startDateKey), endDate: endDateKey ? new Date(`${endDateKey}T23:59:59+05:30`) : null,
        hospitalId: session.hospitalId, floorId: area.floorId, departmentId: area.departmentId, areaId: area.id,
        assignedToId, createdById: creator.id,
      },
      include: { area: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true, employeeId: true } } },
    });
    const today = kolkataDateKey();
    if (startDateKey <= today && (!endDateKey || endDateKey >= today)) await materializeDailyRoutine(schedule, today);
    return NextResponse.json({ ok: true, routine: schedule }, { status: 201 });
  } catch (error) {
    console.error("Create daily routine failed:", error);
    return NextResponse.json({ error: "Could not create daily routine." }, { status: 500 });
  }
}
