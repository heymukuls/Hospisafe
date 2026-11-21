import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(request: NextRequest, context: { params: Promise<{ id: string; filename: string }> }) {
  const session = getSession(request);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const { id, filename } = await context.params;
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/i.test(filename)) return new NextResponse("Not found", { status: 404 });

  const task = await prisma.task.findFirst({ where: { id, hospitalId: session.hospitalId }, select: { id: true, hospitalId: true, assignedToId: true } });
  if (!task) return new NextResponse("Not found", { status: 404 });
  if (session.role === "STAFF" && task.assignedToId !== session.staffId) return new NextResponse("Forbidden", { status: 403 });

  const evidenceUrl = `/api/tasks/${id}/evidence/${filename}`;
  const activity = await prisma.taskActivity.findFirst({ where: { taskId: id, action: "EVIDENCE_UPLOADED", note: evidenceUrl }, select: { id: true } });
  if (!activity) return new NextResponse("Not found", { status: 404 });

  try {
    const extension = filename.split(".").pop() ?? "";
    const bytes = await readFile(path.join(process.cwd(), "data", "task-evidence", task.hospitalId, task.id, filename));
    return new NextResponse(bytes, { headers: { "Content-Type": MIME[extension], "Content-Length": String(bytes.byteLength), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
