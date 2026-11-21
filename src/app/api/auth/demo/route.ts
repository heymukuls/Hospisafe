import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (process.env.HOSPISAFE_DEMO_MODE !== "true") return NextResponse.json({ error: "Demo access is disabled." }, { status: 404 });
  try {
    const body = await request.json().catch(() => ({}));
    const role = body.role === "STAFF" ? "STAFF" : "ADMIN";
    const result = await prisma.$transaction(async (tx) => {
      let hospital = await tx.hospital.findFirst({ where: { name: "Hospisafe Demo Hospital" } });
      if (!hospital) hospital = await tx.hospital.create({ data: { name: "Hospisafe Demo Hospital" } });
      let floor = await tx.floor.findFirst({ where: { hospitalId: hospital.id, name: "Ground Floor" } });
      if (!floor) floor = await tx.floor.create({ data: { hospitalId: hospital.id, name: "Ground Floor" } });
      let department = await tx.department.findFirst({ where: { hospitalId: hospital.id, name: "Housekeeping" } });
      if (!department) department = await tx.department.create({ data: { hospitalId: hospital.id, floorId: floor.id, name: "Housekeeping" } });
      let area = await tx.area.findFirst({ where: { hospitalId: hospital.id, name: "North Wing Washroom" } });
      if (!area) area = await tx.area.create({ data: { hospitalId: hospital.id, floorId: floor.id, departmentId: department.id, name: "North Wing Washroom", type: "WASHROOM" } });
      let admin = await tx.staff.findUnique({ where: { email: "admin@demo.hospisafe.online" } });
      if (!admin) admin = await tx.staff.create({ data: { hospitalId: hospital.id, floorId: floor.id, departmentId: department.id, employeeId: "DEMO-ADMIN", name: "Demo Administrator", email: "admin@demo.hospisafe.online", role: "ADMIN" } });
      let staff = await tx.staff.findUnique({ where: { email: "staff@demo.hospisafe.online" } });
      if (!staff) staff = await tx.staff.create({ data: { hospitalId: hospital.id, floorId: floor.id, departmentId: department.id, employeeId: "DEMO-STAFF", name: "Aarav Demo", email: "staff@demo.hospisafe.online", role: "STAFF" } });
      const taskCount = await tx.task.count({ where: { hospitalId: hospital.id } });
      if (taskCount === 0) {
        await tx.task.create({ data: { title: "Sanitise North Wing Washroom", description: "Routine high-touch surface cleaning and disinfection.", priority: "HIGH", status: "ASSIGNED", hospitalId: hospital.id, floorId: floor.id, departmentId: department.id, areaId: area.id, assignedToId: staff.id, createdById: admin.id, checklist: { create: [{ title: "Wear required protective equipment", position: 1 }, { title: "Clean and disinfect touch points", position: 2 }, { title: "Mop floor and replenish supplies", position: 3 }] }, activities: { create: { action: "CREATED", note: "Sample task created for the public demo.", actorId: admin.id } } } });
        await tx.task.create({ data: { title: "Prepare Room 204 for next patient", description: "Terminal cleaning and room-readiness check.", priority: "MEDIUM", status: "ASSIGNED", hospitalId: hospital.id, floorId: floor.id, departmentId: department.id, areaId: area.id, assignedToId: staff.id, createdById: admin.id, checklist: { create: [{ title: "Remove waste safely", position: 1 }, { title: "Disinfect bed and high-touch surfaces", position: 2 }, { title: "Confirm room is ready", position: 3 }] }, activities: { create: { action: "CREATED", note: "Sample task created for the public demo.", actorId: admin.id } } } });
      }
      return { hospital, admin, staff };
    });
    const selected = role === "STAFF" ? result.staff : result.admin;
    const response = NextResponse.json({ ok: true, redirect: role === "STAFF" ? "/staff" : "/dashboard" });
    setSessionCookie(response, { staffId: selected.id, email: selected.email ?? "demo@hospisafe.online", name: selected.name, role, hospitalId: result.hospital.id });
    return response;
  } catch (error) {
    console.error("Hospisafe demo login failed:", error);
    return NextResponse.json({ error: "Demo workspace could not be opened." }, { status: 500 });
  }
}
