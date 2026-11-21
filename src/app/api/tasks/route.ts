import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { materializeTodayRoutines } from "@/lib/routines";

export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  await materializeTodayRoutines(session.hospitalId);
  const where = { hospitalId: session.hospitalId, ...(session.role === "STAFF" ? { assignedToId: session.staffId, status: { not: "CANCELLED" as const } } : {}) };
  const tasks = await prisma.task.findMany({
    where, orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    include: { routineSchedule: { select: { id: true, title: true, frequency: true } }, area: true, floor: true, department: true, assignedTo: { select: { id: true, name: true, employeeId: true } }, checklist: { orderBy: { position: "asc" } }, activities: { orderBy: { createdAt: "desc" }, take: 5, include: { actor: { select: { name: true } } } } },
  });
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (session.role === "STAFF") return NextResponse.json({ error: "Only administrators can create tasks." }, { status: 403 });
  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const priority = ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(body.priority) ? body.priority : "MEDIUM";
    const areaId = String(body.areaId ?? "");
    const assignedToId = String(body.assignedToId ?? "") || null;
    const dueAtValue = String(body.dueAt ?? "").trim();
    const dueAt = dueAtValue ? new Date(dueAtValue) : null;
    if (title.length < 3 || !areaId) return NextResponse.json({ error: "Enter a task title and choose an area from the hospital layout." }, { status: 400 });
    if (dueAt && Number.isNaN(dueAt.getTime())) return NextResponse.json({ error: "Choose a valid due date and time." }, { status: 400 });
    const area = await prisma.area.findFirst({ where: { id: areaId, hospitalId: session.hospitalId }, include: { floor: true, department: true } });
    if (!area) return NextResponse.json({ error: "Choose an area belonging to this hospital." }, { status: 400 });
    if (!area.floorId || !area.departmentId) return NextResponse.json({ error: "Complete the floor and department setup for this area first." }, { status: 400 });
    if (assignedToId) {
      const assignee = await prisma.staff.findFirst({ where: { id: assignedToId, hospitalId: session.hospitalId, role: "STAFF", isActive: true } });
      if (!assignee) return NextResponse.json({ error: "Choose an active staff member from this hospital." }, { status: 400 });
    }
    const defaultChecklist = [
      "Wear gloves and required protective equipment",
      "Place wet-floor warning sign",
      "Clean and disinfect toilet surfaces",
      "Clean washbasin and taps",
      "Disinfect door handles and touch points",
      "Mop and disinfect the floor",
      "Replenish soap and paper supplies",
      "Check cleanliness and remove warning sign",
    ];
    const checklistTitles: string[] = Array.isArray(body.checklist)
      ? body.checklist.map((item: unknown) => String(item).trim()).filter((item: string) => item.length > 0).slice(0, 20)
      : defaultChecklist;
    if (checklistTitles.length === 0) checklistTitles.push(...defaultChecklist);

    const task = await prisma.task.create({
      data: {
        title, description: description || null, priority, status: "ASSIGNED", dueAt,
        hospitalId: session.hospitalId, floorId: area.floorId, departmentId: area.departmentId, areaId: area.id,
        assignedToId, createdById: session.staffId,
        checklist: { create: checklistTitles.map((title, index) => ({ title, position: index + 1 })) },
        activities: { create: { action: "CREATED", note: dueAt ? `Task created with due date ${dueAt.toISOString()}.` : "Task created by administrator.", actorId: session.staffId } },
      },
      include: { area: true, assignedTo: { select: { id: true, name: true } }, checklist: true },
    });
    return NextResponse.json({ ok: true, task }, { status: 201 });
  } catch (error) {
    console.error("Create task failed:", error);
    return NextResponse.json({ error: "Could not create task." }, { status: 500 });
  }
}
