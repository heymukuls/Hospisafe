import { NextRequest, NextResponse } from "next/server";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
const MIME_TO_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  let filename = "";
  try {
    const form = await request.formData();
    const file = form.get("photo");
    const requestedStaffId = String(form.get("staffId") ?? "").trim();
    const targetStaffId = requestedStaffId || session.staffId;

    if (targetStaffId !== session.staffId && session.role === "STAFF") {
      return NextResponse.json({ error: "Staff can only change their own profile picture." }, { status: 403 });
    }
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a profile image." }, { status: 400 });
    const extension = MIME_TO_EXT[file.type];
    if (!extension) return NextResponse.json({ error: "Use a JPG, PNG or WebP image." }, { status: 400 });
    if (file.size < 1 || file.size > 3 * 1024 * 1024) return NextResponse.json({ error: "Profile images must be 3 MB or smaller." }, { status: 400 });

    const where = { id: targetStaffId, hospitalId: session.hospitalId, ...(targetStaffId !== session.staffId ? { role: "STAFF" as const } : {}) };
    const current = await prisma.staff.findFirst({ where, select: { id: true, photoUrl: true } });
    if (!current) return NextResponse.json({ error: "Staff account not found in this hospital." }, { status: 404 });

    const folder = path.join(process.cwd(), "data", "profile-photos");
    await mkdir(folder, { recursive: true });
    filename = `${randomUUID()}.${extension}`;
    await writeFile(path.join(folder, filename), Buffer.from(await file.arrayBuffer()), { flag: "wx" });
    const photoUrl = `/api/profile/photo/${filename}`;

    try {
      await prisma.staff.update({ where: { id: targetStaffId }, data: { photoUrl } });
    } catch (error) {
      await unlink(path.join(folder, filename)).catch(() => undefined);
      throw error;
    }

    if (current.photoUrl?.startsWith("/api/profile/photo/")) {
      const previousName = path.basename(current.photoUrl);
      if (/^[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(previousName)) {
        await unlink(path.join(folder, previousName)).catch(() => undefined);
      }
    }
    return NextResponse.json({ ok: true, photoUrl, staffId: targetStaffId });
  } catch (error) {
    console.error("Profile image upload failed:", error);
    return NextResponse.json({ error: "Could not update profile image." }, { status: 500 });
  }
}
