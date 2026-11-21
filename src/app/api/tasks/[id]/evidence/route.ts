import { NextRequest, NextResponse } from "next/server";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MIME_TO_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function hasValidImageSignature(bytes: Buffer, extension: string) {
  if (extension === "jpg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (extension === "png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return extension === "webp" && bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (session.role !== "STAFF") return NextResponse.json({ error: "Only assigned staff can upload task evidence." }, { status: 403 });
  const { id } = await context.params;
  const task = await prisma.task.findFirst({ where: { id, hospitalId: session.hospitalId, assignedToId: session.staffId }, select: { id: true, hospitalId: true, status: true } });
  if (!task) return NextResponse.json({ error: "Task not found or not assigned to you." }, { status: 404 });
  if (task.status !== "IN_PROGRESS") return NextResponse.json({ error: "Start the task before uploading completion evidence." }, { status: 409 });

  const checklistCount = await prisma.checklistItem.count({ where: { taskId: id } });
  if (checklistCount === 0) return NextResponse.json({ error: "This task has no checklist items." }, { status: 409 });
  const incompleteCount = await prisma.checklistItem.count({ where: { taskId: id, isCompleted: false } });
  if (incompleteCount > 0) return NextResponse.json({ error: `Check every checklist item before uploading a completion photo. ${incompleteCount} remain.` }, { status: 409 });

  let savedPath = "";
  try {
    const form = await request.formData();
    const file = form.get("evidence");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a completion photo." }, { status: 400 });
    const extension = MIME_TO_EXT[file.type];
    if (!extension) return NextResponse.json({ error: "Use a JPG, PNG or WebP image." }, { status: 400 });
    if (file.size < 1 || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Completion photos must be 5 MB or smaller." }, { status: 400 });

    const bytes = Buffer.from(await file.arrayBuffer());
    if (!hasValidImageSignature(bytes, extension)) return NextResponse.json({ error: "The uploaded file does not match its image type." }, { status: 400 });
    const filename = `${randomUUID()}.${extension}`;
    const folder = path.join(process.cwd(), "data", "task-evidence", task.hospitalId, task.id);
    await mkdir(folder, { recursive: true });
    savedPath = path.join(folder, filename);
    await writeFile(savedPath, bytes, { flag: "wx" });

    const evidenceUrl = `/api/tasks/${task.id}/evidence/${filename}`;
    try {
      await prisma.taskActivity.create({ data: { taskId: task.id, actorId: session.staffId, action: "EVIDENCE_UPLOADED", note: evidenceUrl } });
    } catch (error) {
      await unlink(savedPath).catch(() => undefined);
      throw error;
    }
    return NextResponse.json({ ok: true, evidenceUrl });
  } catch (error) {
    console.error("Task evidence upload failed:", error);
    if (savedPath) await unlink(savedPath).catch(() => undefined);
    return NextResponse.json({ error: "Could not upload completion photo." }, { status: 500 });
  }
}
