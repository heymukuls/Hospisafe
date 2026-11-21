import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(request: NextRequest, context: { params: Promise<{ filename: string }> }) {
  const session = getSession(request);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const { filename } = await context.params;
  if (!/^[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(filename)) return new NextResponse("Not found", { status: 404 });
  try {
    const photoUrl = `/api/profile/photo/${filename}`;
    const belongsToHospital = await prisma.staff.findFirst({
      where: { hospitalId: session.hospitalId, photoUrl },
      select: { id: true },
    });
    if (!belongsToHospital) return new NextResponse("Not found", { status: 404 });
    const bytes = await readFile(path.join(process.cwd(), "data", "profile-photos", filename));
    const extension = filename.split(".").pop() ?? "";
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": MIME[extension],
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
