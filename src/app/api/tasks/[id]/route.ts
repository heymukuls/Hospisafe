import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const task = await prisma.task.findFirst({ where: { id, hospitalId: session.hospitalId } });
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  if (session.role === "STAFF" && task.assignedToId !== session.staffId) return NextResponse.json({ error: "This task is assigned to another staff member." }, { status: 403 });

  if (body.action === "start") {
    if (session.role !== "STAFF") return NextResponse.json({ error: "Only assigned staff can start a task." }, { status: 403 });
    if (task.status !== "ASSIGNED") return NextResponse.json({ error: "This task is not waiting to be started." }, { status: 409 });
    await prisma.$transaction([
      prisma.task.update({ where: { id }, data: { status: "IN_PROGRESS", startedAt: new Date() } }),
      prisma.taskActivity.create({ data: { taskId: id, actorId: session.staffId, action: "STARTED", note: "Staff started the task." } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "checklist") {
    if (session.role !== "STAFF") return NextResponse.json({ error: "Only assigned staff can update checklist items." }, { status: 403 });
    if (task.status !== "IN_PROGRESS") return NextResponse.json({ error: "Start the task before updating its checklist." }, { status: 409 });
    const itemId = String(body.itemId ?? "");
    const isCompleted = body.isCompleted === true;
    const item = await prisma.checklistItem.findFirst({ where: { id: itemId, taskId: id } });
    if (!item) return NextResponse.json({ error: "Checklist item not found." }, { status: 404 });
    await prisma.$transaction([
      prisma.checklistItem.update({ where: { id: itemId }, data: { isCompleted, completedAt: isCompleted ? new Date() : null, completedById: isCompleted ? session.staffId : null } }),
      prisma.taskActivity.create({ data: { taskId: id, actorId: session.staffId, action: isCompleted ? "CHECKLIST_ITEM_COMPLETED" : "CHECKLIST_ITEM_REOPENED", note: item.title } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "complete") {
    if (session.role !== "STAFF") return NextResponse.json({ error: "Only staff can submit task completion." }, { status: 403 });
    if (task.status !== "IN_PROGRESS") return NextResponse.json({ error: "Start the task before submitting it." }, { status: 409 });
    const incompleteCount = await prisma.checklistItem.count({ where: { taskId: id, isCompleted: false } });
    if (incompleteCount > 0) return NextResponse.json({ error: `Complete all checklist items before submitting. ${incompleteCount} remain.` }, { status: 409 });
    await prisma.$transaction([
      prisma.task.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date() } }),
      prisma.taskActivity.create({ data: { taskId: id, actorId: session.staffId, action: "COMPLETED", note: "All checklist items completed and submitted by staff." } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "verify") {
    if (session.role === "STAFF") return NextResponse.json({ error: "Only an administrator can verify a task." }, { status: 403 });
    if (task.status !== "COMPLETED") return NextResponse.json({ error: "Only completed tasks can be verified." }, { status: 409 });
    await prisma.$transaction([
      prisma.task.update({ where: { id }, data: { status: "VERIFIED", verifiedAt: new Date(), verifiedById: session.staffId } }),
      prisma.taskActivity.create({ data: { taskId: id, actorId: session.staffId, action: "VERIFIED", note: "Completion verified by administrator." } }),
    ]);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown task action." }, { status: 400 });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (session.role === "STAFF") return NextResponse.json({ error: "Only administrators can edit task assignments." }, { status: 403 });
  const { id } = await context.params;
  const task = await prisma.task.findFirst({ where: { id, hospitalId: session.hospitalId } });
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  if (task.status !== "ASSIGNED" || task.taskType === "ROUTINE") return NextResponse.json({ error: "Only unstarted special tasks can be edited. Edit the routine schedule for recurring work." }, { status: 409 });
  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const priority = ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(body.priority) ? body.priority : "MEDIUM";
    const areaId = String(body.areaId ?? "");
    const assignedToId = String(body.assignedToId ?? "") || null;
    const dueAtValue = String(body.dueAt ?? "").trim();
    const dueAt = dueAtValue ? new Date(dueAtValue) : null;
    const checklistTitles: string[] = Array.isArray(body.checklist) ? body.checklist.map((item: unknown) => String(item).trim()).filter((item: string) => item.length > 0).slice(0, 20) : [];
    if (title.length < 3 || !areaId || checklistTitles.length === 0) return NextResponse.json({ error: "Enter a title, select an area and keep at least one checklist item." }, { status: 400 });
    if (dueAt && Number.isNaN(dueAt.getTime())) return NextResponse.json({ error: "Choose a valid due date and time." }, { status: 400 });
    const area = await prisma.area.findFirst({ where: { id: areaId, hospitalId: session.hospitalId } });
    if (!area || !area.floorId || !area.departmentId) return NextResponse.json({ error: "Choose a configured area in this hospital." }, { status: 400 });
    if (assignedToId) {
      const assignee = await prisma.staff.findFirst({ where: { id: assignedToId, hospitalId: session.hospitalId, role: "STAFF", isActive: true } });
      if (!assignee) return NextResponse.json({ error: "Choose an active staff member from this hospital." }, { status: 400 });
    }
    const updated = await prisma.$transaction(async (tx) => {
      await tx.checklistItem.deleteMany({ where: { taskId: id } });
      const result = await tx.task.update({ where: { id }, data: { title, description: description || null, priority, dueAt, floorId: area.floorId, departmentId: area.departmentId, areaId: area.id, assignedToId } });
      await tx.checklistItem.createMany({ data: checklistTitles.map((item, index) => ({ taskId: id, title: item, position: index + 1 })) });
      await tx.taskActivity.create({ data: { taskId: id, actorId: session.staffId, action: "EDITED", note: "Task details and checklist updated by administrator." } });
      return result;
    });
    return NextResponse.json({ ok: true, task: updated });
  } catch (error) {
    console.error("Edit task failed:", error);
    return NextResponse.json({ error: "Could not update task." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (session.role === "STAFF") return NextResponse.json({ error: "Only administrators can delete task assignments." }, { status: 403 });
  const { id } = await context.params;
  const task = await prisma.task.findFirst({ where: { id, hospitalId: session.hospitalId } });
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  if (task.status !== "ASSIGNED") return NextResponse.json({ error: "Started or submitted tasks are retained for audit history and cannot be deleted." }, { status: 409 });
  try {
    if (task.taskType === "ROUTINE") {
      await prisma.$transaction([
        prisma.task.update({ where: { id }, data: { status: "CANCELLED" } }),
        prisma.taskActivity.create({ data: { taskId: id, actorId: session.staffId, action: "ROUTINE_OCCURRENCE_CANCELLED", note: "This dated occurrence was cancelled; the recurring schedule remains active." } }),
      ]);
      return NextResponse.json({ ok: true, cancelled: true });
    }
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete task failed:", error);
    return NextResponse.json({ error: "Could not delete task." }, { status: 500 });
  }
}

