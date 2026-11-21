import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
const AREA_TYPES = ["ROOM", "WASHROOM", "LOBBY", "BED", "COMMON_AREA", "WAITING_AREA", "NURSE_STATION", "TREATMENT_ROOM", "LABORATORY", "OPERATION_THEATRE", "OTHER"] as const;
const AREA_GENDERS = ["ANY", "MALE", "FEMALE"] as const;

async function layoutData(hospitalId: string) {
  const [floors, departments, areas] = await Promise.all([
    prisma.floor.findMany({ where: { hospitalId }, orderBy: { createdAt: "asc" } }),
    prisma.department.findMany({ where: { hospitalId }, orderBy: [{ floorId: "asc" }, { name: "asc" }] }),
    prisma.area.findMany({ where: { hospitalId }, orderBy: [{ floorId: "asc" }, { departmentId: "asc" }, { name: "asc" }], include: { floor: { select: { id: true, name: true } }, department: { select: { id: true, name: true, floorId: true } } } }),
  ]);
  return { floors, departments, areas, ready: floors.length > 0 && departments.length > 0 && areas.length > 0 };
}

export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  return NextResponse.json(await layoutData(session.hospitalId));
}

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (session.role === "STAFF") return NextResponse.json({ error: "Only administrators can edit the hospital layout." }, { status: 403 });
  try {
    const body = await request.json();
    const kind = String(body.kind ?? "");
    if (kind === "floor") {
      const name = String(body.name ?? "").trim();
      if (name.length < 2 || name.length > 80) return NextResponse.json({ error: "Enter a floor name between 2 and 80 characters." }, { status: 400 });
      const existing = await prisma.floor.findFirst({ where: { hospitalId: session.hospitalId, name: { equals: name } } });
      if (existing) return NextResponse.json({ error: "This floor already exists. Select it from the floor list instead." }, { status: 409 });
      await prisma.floor.create({ data: { name, hospitalId: session.hospitalId } });
    } else if (kind === "departments") {
      const floorId = String(body.floorId ?? "");
      const floor = await prisma.floor.findFirst({ where: { id: floorId, hospitalId: session.hospitalId } });
      if (!floor) return NextResponse.json({ error: "Select a valid floor first." }, { status: 400 });
      const names: string[] = Array.isArray(body.names)
        ? body.names
            .map((value: unknown): string => String(value).trim())
            .filter((value: string) => value.length >= 2 && value.length <= 100)
        : [];
      if (!names.length) return NextResponse.json({ error: "Select one or more departments to add." }, { status: 400 });
      const uniqueNames: string[] = Array.from(new Set<string>(names));
      const existing = await prisma.department.findMany({ where: { hospitalId: session.hospitalId, floorId, name: { in: uniqueNames } }, select: { name: true } });
      const existingNames = new Set(existing.map((item) => item.name));
      const toCreate = uniqueNames.filter((name) => !existingNames.has(name));
      if (toCreate.length) await prisma.department.createMany({ data: toCreate.map((name) => ({ name, hospitalId: session.hospitalId, floorId })), skipDuplicates: true });
      const data = await layoutData(session.hospitalId);
      return NextResponse.json({ ok: true, added: toCreate.length, skipped: uniqueNames.length - toCreate.length, ...data }, { status: 201 });
    } else if (kind === "area") {
      const name = String(body.name ?? "").trim();
      const floorId = String(body.floorId ?? "");
      const departmentId = String(body.departmentId ?? "");
      const type = AREA_TYPES.includes(body.type) ? body.type : "OTHER";
      const gender = AREA_GENDERS.includes(body.gender) ? body.gender : "ANY";
      if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "Enter an area name between 2 and 120 characters." }, { status: 400 });
      if (type !== "WASHROOM" && gender !== "ANY") return NextResponse.json({ error: "Gender classification is available for washrooms only." }, { status: 400 });
      const [floor, department] = await Promise.all([
        prisma.floor.findFirst({ where: { id: floorId, hospitalId: session.hospitalId } }),
        prisma.department.findFirst({ where: { id: departmentId, hospitalId: session.hospitalId, floorId } }),
      ]);
      if (!floor || !department) return NextResponse.json({ error: "Select a department belonging to the selected floor." }, { status: 400 });
      const duplicate = await prisma.area.findFirst({ where: { hospitalId: session.hospitalId, floorId, departmentId, name } });
      if (duplicate) return NextResponse.json({ error: "This area already exists in the selected department and floor." }, { status: 409 });
      await prisma.area.create({ data: { name, type, gender, hospitalId: session.hospitalId, floorId, departmentId } });
    } else {
      return NextResponse.json({ error: "Unknown layout action." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ...(await layoutData(session.hospitalId)) }, { status: 201 });
  } catch (error) {
    console.error("Hospital layout update failed:", error);
    return NextResponse.json({ error: "Could not save this hospital layout item." }, { status: 500 });
  }
}
