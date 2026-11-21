import { prisma } from "@/lib/prisma";

export function kolkataDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

export function kolkataMidnight(dateKey: string) {
  return new Date(`${dateKey}T00:00:00+05:30`);
}

export async function materializeDailyRoutine(schedule: {
  id: string; title: string; description: string | null; priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  dueTime: string; startDate: Date; endDate: Date | null; hospitalId: string; floorId: string;
  departmentId: string; areaId: string; assignedToId: string | null; createdById: string;
}, dateKey = kolkataDateKey()) {
  if (kolkataDateKey(schedule.startDate) > dateKey) return;
  if (schedule.endDate && kolkataDateKey(schedule.endDate) < dateKey) return;
  const occurrenceDate = kolkataMidnight(dateKey);
  const [hour, minute] = schedule.dueTime.split(":").map(Number);
  const dueAt = new Date(`${dateKey}T${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00+05:30`);
  try {
    await prisma.task.create({
      data: {
        title: schedule.title, description: schedule.description, priority: schedule.priority,
        status: "ASSIGNED", taskType: "ROUTINE", dueAt, routineScheduleId: schedule.id,
        routineOccurrenceDate: occurrenceDate, hospitalId: schedule.hospitalId, floorId: schedule.floorId,
        departmentId: schedule.departmentId, areaId: schedule.areaId, assignedToId: schedule.assignedToId,
        createdById: schedule.createdById,
        checklist: { create: [
          "Wear gloves and required protective equipment",
          "Place wet-floor warning sign",
          "Clean and disinfect toilet surfaces",
          "Clean washbasin and taps",
          "Disinfect door handles and touch points",
          "Mop and disinfect the floor",
          "Replenish soap and paper supplies",
          "Check cleanliness and remove warning sign",
        ].map((title, index) => ({ title, position: index + 1 })) },
        activities: { create: { action: "ROUTINE_GENERATED", note: `Daily routine generated for ${dateKey}.`, actorId: schedule.createdById } },
      },
    });
    return true;
  } catch (error) {
    if ((error as { code?: string })?.code === "P2002") return false;
    throw error;
  }
}

export async function materializeTodayRoutines(hospitalId: string) {
  const schedules = await prisma.routineSchedule.findMany({ where: { hospitalId, isActive: true } });
  const today = kolkataDateKey();
  for (const schedule of schedules) await materializeDailyRoutine(schedule, today);
}
