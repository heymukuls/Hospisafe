import { NextRequest, NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Only a hospital administrator can reset workspace data." }, { status: 403 });

  let body: { confirmation?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Confirm the reset in the dialog." }, { status: 400 }); }
  if (body.confirmation !== "DELETE ALL") return NextResponse.json({ error: "Type DELETE ALL exactly to confirm." }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const where = { hospitalId: session.hospitalId };
      const photoRows = await tx.staff.findMany({
        where: { ...where, role: { not: "ADMIN" }, photoUrl: { not: null } },
        select: { photoUrl: true },
      });
      const [tasks, routines, areas, departments, floors, staff] = await Promise.all([
        tx.task.count({ where }),
        tx.routineSchedule.count({ where }),
        tx.area.count({ where }),
        tx.department.count({ where }),
        tx.floor.count({ where }),
        tx.staff.count({ where: { ...where, role: { not: "ADMIN" } } }),
      ]);

      // Task deletion cascades checklist and activity rows. Remove routines before staff/areas.
      await tx.task.deleteMany({ where });
      await tx.routineSchedule.deleteMany({ where });
      await tx.area.deleteMany({ where });
      await tx.staff.deleteMany({ where: { ...where, role: { not: "ADMIN" } } });
      await tx.department.deleteMany({ where });
      await tx.floor.deleteMany({ where });

      return {
        deleted: { tasks, routines, areas, departments, floors, staff },
        photoUrls: photoRows.map((row) => row.photoUrl).filter((value): value is string => Boolean(value)),
      };
    });

    // Remove only photo files that were referenced by staff records in this tenant.
    for (const photoUrl of result.photoUrls) {
      if (!photoUrl.startsWith("/api/profile/photo/")) continue;
      const filename = path.basename(photoUrl);
      if (/^[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(filename)) {
        await unlink(path.join(process.cwd(), "data", "profile-photos", filename)).catch(() => undefined);
      }
    }

    return NextResponse.json({
      ok: true,
      deleted: result.deleted,
      preserved: ["Hospital account", "Administrator login accounts"],
      message: "Workspace records cleared. You can now add floors, departments, areas, staff and tasks manually.",
    });
  } catch (error) {
    console.error("Hospital workspace reset failed:", error);
    return NextResponse.json({ error: "Could not reset workspace. The database transaction was rolled back." }, { status: 500 });
  }
}
