"use client";

import { ChangeEvent, FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertCircle, CalendarClock, Camera, CheckCircle2, ChevronDown, ClipboardList, Clock3, Layers3, LogOut, MapPin, Plus, ShieldCheck, Users, X, UserPlus, Pencil, Trash2, Upload, Building2, ListChecks, BedDouble, Stethoscope } from "lucide-react";

type Floor = { id: string; name: string };
type Department = { id: string; name: string; floorId: string | null };
type Area = { id: string; name: string; type: string; gender?: string; floorId: string | null; departmentId: string | null; floor: Floor | null; department: Department | null };
type Layout = { floors: Floor[]; departments: Department[]; areas: Area[]; ready: boolean };
type User = { id: string; name: string; email: string | null; employeeId: string; role: string; photoUrl?: string | null; hospital: { name: string } };
type Staff = { id: string; name: string; email: string | null; employeeId: string; role: string; phone?: string | null; photoUrl?: string | null; floorId?: string | null; departmentId?: string | null; floor?: Floor | null; department?: Department | null };
type Task = { id: string; taskType?: string; title: string; description: string | null; priority: string; status: string; dueAt: string | null; area: { id?: string; name: string } | null; assignedTo: { id: string; name: string; employeeId: string } | null; checklist: { id: string; title: string; isCompleted: boolean }[]; activities: { action: string; note: string | null; createdAt: string; actor: { name: string } | null }[]; evidenceUrl?: string | null; createdAt: string };

const FIELD = "h-11 w-full rounded-xl border border-[#dcebe7] bg-white px-3 text-sm text-[#244b4f] outline-none transition focus:border-[#159b82] focus:ring-4 focus:ring-[#159b82]/10";
const FLOOR_SUGGESTIONS = ["Ground Floor", "First Floor", "Second Floor", "Third Floor", "Fourth Floor", "Fifth Floor", "Sixth Floor", "Seventh Floor", "Eighth Floor", "Ninth Floor"];
const DEPARTMENT_GROUPS = [
  { group: "Clinical departments", names: ["Emergency Department (ER)", "Intensive Care Unit (ICU)", "General Medicine", "General Surgery", "Orthopaedics", "Paediatrics", "Obstetrics & Gynaecology", "Cardiology", "Neurology", "Oncology", "Nephrology", "Urology", "Dermatology", "ENT", "Ophthalmology", "Pulmonology", "Gastroenterology", "Psychiatry", "Dentistry", "Rehabilitation & Physiotherapy"] },
  { group: "Diagnostic and support departments", names: ["Radiology & Imaging", "Pathology Laboratory", "Microbiology Laboratory", "Blood Bank", "Pharmacy", "Dialysis Centre", "Operation Theatre (OT)", "CSSD"] },
];
const CHECKLISTS_BY_TYPE: Record<string, string[]> = {
  WASHROOM: ["Wear gloves and required protective equipment", "Place wet-floor warning sign", "Clean and disinfect toilet surfaces", "Clean washbasin and taps", "Disinfect door handles and touch points", "Mop and disinfect the floor", "Replenish soap and paper supplies", "Check cleanliness and remove warning sign"],
  ROOM: ["Wear required protective equipment", "Remove waste safely", "Change or arrange linen as required", "Clean and disinfect bed and bedside surfaces", "Disinfect door handles and high-touch points", "Clean furniture and visible surfaces", "Mop and disinfect the floor", "Complete final room-readiness inspection"],
  BED: ["Wear required protective equipment", "Remove used linen safely", "Clean and disinfect mattress and bed frame", "Disinfect rails and bed controls", "Clean bedside table and touch points", "Fit clean linen", "Dispose of waste safely", "Complete final bed-readiness check"],
  LOBBY: ["Wear required protective equipment", "Place caution sign if floor cleaning is required", "Collect and dispose of waste", "Clean seating and tables", "Disinfect door handles and high-touch points", "Clean glass and visible surfaces", "Mop and dry the floor", "Complete final visual inspection"],
  COMMON_AREA: ["Wear required protective equipment", "Collect and segregate waste", "Clean shared surfaces and furniture", "Disinfect frequently touched points", "Clean fixtures and visible surfaces", "Mop and dry the floor", "Restore supplies and furniture", "Complete final visual inspection"],
  WAITING_AREA: ["Wear required protective equipment", "Collect and dispose of waste", "Clean chairs and seating", "Disinfect armrests and high-touch points", "Clean counters and tables", "Mop and dry the floor", "Arrange seating and restore supplies", "Complete final visual inspection"],
  NURSE_STATION: ["Wear required protective equipment", "Clear waste without disturbing clinical materials", "Clean desk and non-clinical surfaces", "Disinfect high-touch points", "Clean shared equipment exteriors as permitted", "Mop the floor", "Restore the workspace", "Complete final visual inspection"],
  TREATMENT_ROOM: ["Wear required protective equipment", "Follow the area's approved clinical cleaning protocol", "Remove waste into designated containers", "Clean and disinfect work surfaces", "Disinfect high-touch points", "Clean equipment exteriors as permitted", "Mop and disinfect the floor", "Complete final room-readiness check"],
  LABORATORY: ["Wear required protective equipment", "Follow laboratory biosafety and cleaning protocol", "Do not handle or move samples", "Clean approved work surfaces", "Disinfect high-touch points", "Dispose of waste in designated streams", "Clean the floor using approved procedure", "Complete final area inspection"],
  OPERATION_THEATRE: ["Wear required protective equipment", "Follow the hospital's OT terminal-cleaning protocol", "Do not handle sterile instruments", "Clean and disinfect approved surfaces", "Disinfect high-touch points and equipment exteriors", "Dispose of clinical waste using designated streams", "Clean floor according to OT protocol", "Request authorised OT readiness inspection"],
  OTHER: ["Wear required protective equipment", "Collect and dispose of waste safely", "Clean assigned surfaces", "Disinfect high-touch points", "Clean fixtures and visible surfaces", "Clean the floor", "Restore supplies and furniture", "Complete final visual inspection"],
};
const WASHROOM_CHECKLIST = CHECKLISTS_BY_TYPE.WASHROOM.join("\n");
function checklistForAreaType(type: string) { return (CHECKLISTS_BY_TYPE[type] ?? CHECKLISTS_BY_TYPE.OTHER).join("\n"); }
const TASK_TYPES = [{ value: "ROOM", label: "Room" }, { value: "WASHROOM", label: "Washroom" }, { value: "LOBBY", label: "Lobby" }, { value: "BED", label: "Bed" }, { value: "COMMON_AREA", label: "Common area" }, { value: "WAITING_AREA", label: "Waiting area" }, { value: "NURSE_STATION", label: "Nurse station" }, { value: "TREATMENT_ROOM", label: "Treatment room" }, { value: "LABORATORY", label: "Laboratory" }, { value: "OPERATION_THEATRE", label: "Operation theatre" }, { value: "OTHER", label: "Other" }];
const STATUS: Record<string, string> = { ASSIGNED: "Assigned", IN_PROGRESS: "In progress", COMPLETED: "Awaiting review", VERIFIED: "Verified", CANCELLED: "Cancelled" };
const STATUS_CSS: Record<string, string> = { ASSIGNED: "bg-blue-50 text-blue-700", IN_PROGRESS: "bg-amber-50 text-amber-700", COMPLETED: "bg-emerald-50 text-emerald-700", VERIFIED: "bg-teal-50 text-teal-700", CANCELLED: "bg-slate-100 text-slate-600" };

function Logo() { return <div className="flex items-center gap-2.5"><img src="/icon.svg" alt="Hospisafe logo" className="h-10 w-10 rounded-xl object-cover"/><span className="text-lg font-bold tracking-tight text-[#153a40]">Hospisafe</span></div>; }
function Avatar({ name, photoUrl, size = "h-10 w-10" }: { name: string; photoUrl?: string | null; size?: string }) { const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); return photoUrl ? <img src={photoUrl} alt={`${name} profile`} className={`${size} rounded-full border-2 border-white object-cover shadow-sm`}/> : <span className={`${size} grid place-items-center rounded-full bg-gradient-to-br from-[#24b99a] to-[#123b43] text-xs font-bold text-white shadow-sm`}>{initials || "HS"}</span>; }
function Modal({ title, subtitle, icon, onClose, children, width = "max-w-2xl" }: { title: string; subtitle: string; icon: ReactNode; onClose: () => void; children: ReactNode; width?: string }) { return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#102f32]/40 p-3 backdrop-blur-md" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className={`my-auto w-full ${width} rounded-3xl border border-white/70 bg-white p-5 shadow-2xl sm:p-7`}><div className="mb-5 flex items-start justify-between gap-3"><div><div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#e6f5ef] text-[#117d6b]">{icon}</div><h2 className="text-2xl font-bold text-[#153a40]">{title}</h2><p className="mt-1 text-sm text-[#829792]">{subtitle}</p></div><button type="button" onClick={onClose} className="rounded-full p-2 text-[#829792] hover:bg-[#f1f7f4]" aria-label="Close"><X size={20}/></button></div>{children}</section></div>; }

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [layout, setLayout] = useState<Layout>({ floors: [], departments: [], areas: [], ready: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [showStaff, setShowStaff] = useState(false);
  const [showLayout, setShowLayout] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [showRoutine, setShowRoutine] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [floorToAdd, setFloorToAdd] = useState("Ground Floor");
  const [customFloorName, setCustomFloorName] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [areaForm, setAreaForm] = useState({ name: "", type: "WASHROOM", gender: "ANY", departmentId: "" });
  const [staffForm, setStaffForm] = useState({ name: "", email: "", employeeId: "", password: "", phone: "", floorId: "", departmentId: "" });
  const [taskForm, setTaskForm] = useState({ title: "", areaId: "", priority: "HIGH", description: "", assignedToId: "", dueAt: "", checklistText: WASHROOM_CHECKLIST });
  const [routineForm, setRoutineForm] = useState({ title: "", areaId: "", assignedToId: "", priority: "MEDIUM", description: "", dueTime: "09:00", startDate: new Date().toISOString().slice(0, 10), endDate: "" });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [staffPhotoBusyId, setStaffPhotoBusyId] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPhrase, setResetPhrase] = useState("");
  const [pendingTaskDelete, setPendingTaskDelete] = useState<Task | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
      if (!sessionResponse.ok) { router.replace("/login"); return; }
      const sessionData = await sessionResponse.json();
      if (sessionData.user.role === "STAFF") { router.replace("/staff"); return; }
      setUser(sessionData.user);
      const [taskResponse, staffResponse, layoutResponse] = await Promise.all([fetch("/api/tasks", { cache: "no-store" }), fetch("/api/staff", { cache: "no-store" }), fetch("/api/layout", { cache: "no-store" })]);
      if (taskResponse.ok) setTasks((await taskResponse.json()).tasks);
      if (staffResponse.ok) setStaff((await staffResponse.json()).staff);
      if (layoutResponse.ok) {
        const next: Layout = await layoutResponse.json();
        setLayout(next);
        setSelectedFloorId((old) => old || next.floors[0]?.id || "");
        setAreaForm((old) => ({ ...old, departmentId: old.departmentId || next.departments[0]?.id || "" }));
        setStaffForm((old) => ({ ...old, floorId: old.floorId || next.floors[0]?.id || "", departmentId: old.departmentId || next.departments[0]?.id || "" }));
      }
    } catch { setNotice("Could not load workspace. Please refresh."); }
    finally { setLoading(false); }
  }, [router]);
  useEffect(() => { void refresh(); }, [refresh]);
  // Close the profile menu when the user clicks outside it or presses Escape.
  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const root = profileMenuRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) setProfileOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileOpen]);


  const selectedFloorDepartments = useMemo(() => layout.departments.filter((department) => department.floorId === selectedFloorId), [layout.departments, selectedFloorId]);
  const staffDepartments = useMemo(() => layout.departments.filter((department) => department.floorId === staffForm.floorId), [layout.departments, staffForm.floorId]);
  const selectedTaskArea = layout.areas.find((area) => area.id === taskForm.areaId);
  const taskEligibleStaff = staff.filter((member) => member.role === "STAFF");
  const taskCounts = { total: tasks.filter((task) => task.status !== "CANCELLED").length, active: tasks.filter((task) => ["ASSIGNED", "IN_PROGRESS"].includes(task.status)).length, review: tasks.filter((task) => task.status === "COMPLETED").length, verified: tasks.filter((task) => task.status === "VERIFIED").length };

  async function apiPost(url: string, body: unknown, method = "POST") {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "The request could not be completed.");
    return data;
  }

  async function addFloor() {
    const name = floorToAdd === "Custom floor…" ? customFloorName.trim() : floorToAdd;
    if (!name) { setNotice("Enter a custom floor name."); return; }
    setBusy(true); setNotice("");
    try {
      const data = await apiPost("/api/layout", { kind: "floor", name });
      setLayout(data); const added = data.floors.find((floor: Floor) => floor.name === name); if (added) setSelectedFloorId(added.id);
      setCustomFloorName(""); setNotice(`Floor ${name} added successfully.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not add floor."); }
    finally { setBusy(false); }
  }

  async function addDepartments() {
    if (!selectedFloorId || !selectedDepartments.length) { setNotice("Select a floor and at least one department."); return; }
    setBusy(true); setNotice("");
    try {
      const data = await apiPost("/api/layout", { kind: "departments", floorId: selectedFloorId, names: selectedDepartments });
      setLayout(data); setSelectedDepartments([]);
      setNotice(`${data.added} department(s) added${data.skipped ? `; ${data.skipped} already existed on this floor` : ""}.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not add departments."); }
    finally { setBusy(false); }
  }

  async function addArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const data = await apiPost("/api/layout", { kind: "area", ...areaForm, floorId: selectedFloorId, gender: areaForm.type === "WASHROOM" ? areaForm.gender : "ANY" });
      setLayout(data); setAreaForm((old) => ({ ...old, name: "" })); setNotice("Hospital area saved. It is now available for task assignment.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save area."); }
    finally { setBusy(false); }
  }

  async function saveStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const editing = Boolean(editingStaffId);
      const data = await apiPost(editing ? `/api/staff/${editingStaffId}` : "/api/staff", staffForm, editing ? "PATCH" : "POST");
      setShowStaff(false); setEditingStaffId(null); setStaffForm((old) => ({ ...old, name: "", email: "", employeeId: "", password: "", phone: "" }));
      await refresh(); setNotice(editing ? `Updated ${data.staff.name}.` : `Created staff login for ${data.staff.name}. Share the initial password securely.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save staff member."); }
    finally { setBusy(false); }
  }

  function editStaff(member: Staff) {
    setEditingStaffId(member.id);
    setStaffForm({ name: member.name, email: member.email ?? "", employeeId: member.employeeId, password: "", phone: member.phone ?? "", floorId: member.floorId ?? "", departmentId: member.departmentId ?? "" });
    setShowStaff(true);
  }

  function assignTaskTo(member: Staff) {
    setEditingTaskId(null);
    setTaskForm({ title: "", areaId: "", priority: "HIGH", description: "", assignedToId: member.id, dueAt: "", checklistText: WASHROOM_CHECKLIST });
    setShowTask(true);
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const checklist = taskForm.checklistText.split("\n").map((item) => item.trim()).filter(Boolean);
      if (!checklist.length) throw new Error("Add at least one checklist item.");
      const payload = { ...taskForm, checklist, dueAt: taskForm.dueAt ? new Date(taskForm.dueAt).toISOString() : "" };
      const editing = Boolean(editingTaskId);
      const data = await apiPost(editing ? `/api/tasks/${editingTaskId}` : "/api/tasks", payload, editing ? "PATCH" : "POST");
      setShowTask(false); setEditingTaskId(null); setTaskForm({ title: "", areaId: "", priority: "HIGH", description: "", assignedToId: "", dueAt: "", checklistText: WASHROOM_CHECKLIST });
      await refresh(); setNotice(editing ? "Task and checklist updated." : "Special task saved and assigned.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save task."); }
    finally { setBusy(false); }
  }

  async function saveRoutine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice("");
    try { await apiPost("/api/routines", routineForm); setShowRoutine(false); await refresh(); setNotice("Daily routine saved. Dated occurrences are generated when the task list is requested."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not save routine."); }
    finally { setBusy(false); }
  }

  function beginEditTask(task: Task) {
    if (task.status !== "ASSIGNED" || task.taskType === "ROUTINE") return;
    const date = task.dueAt ? new Date(task.dueAt) : null;
    const local = date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
    setEditingTaskId(task.id);
    setTaskForm({ title: task.title, areaId: task.area?.id ?? "", priority: task.priority, description: task.description ?? "", assignedToId: task.assignedTo?.id ?? "", dueAt: local, checklistText: task.checklist.map((item) => item.title).join("\n") || WASHROOM_CHECKLIST });
    setShowTask(true);
  }

  function deleteTask(task: Task) {
    if (task.status !== "ASSIGNED") { setNotice("Started or submitted tasks are retained for the audit trail and cannot be deleted."); return; }
    setPendingTaskDelete(task);
  }

  async function confirmDeleteTask() {
    if (!pendingTaskDelete) return;
    setBusy(true);
    try {
      await apiPost(`/api/tasks/${pendingTaskDelete.id}`, {}, "DELETE");
      const title = pendingTaskDelete.title;
      setPendingTaskDelete(null);
      await refresh();
      setNotice(`Deleted task: ${title}.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not delete task."); }
    finally { setBusy(false); }
  }

  async function resetWorkspace() {
    if (resetPhrase !== "DELETE ALL") return;
    setBusy(true); setNotice("");
    try {
      const data = await apiPost("/api/admin/reset-workspace", { confirmation: resetPhrase });
      setResetOpen(false); setResetPhrase("");
      await refresh();
      const d = data.deleted;
      setNotice(`Workspace cleared: ${d.floors} floors, ${d.departments} departments, ${d.areas} areas, ${d.staff} staff, ${d.routines} routines and ${d.tasks} tasks removed. Your hospital and administrator account(s) were preserved.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not reset workspace data."); }
    finally { setBusy(false); }
  }

  async function taskAction(id: string, action: string) {
    setBusy(true);
    try { await apiPost(`/api/tasks/${id}`, { action }); await refresh(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Task action failed."); }
    finally { setBusy(false); }
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) { setNotice("Choose a JPG, PNG or WebP image up to 3 MB."); return; }
    setUploadingPhoto(true);
    try { const form = new FormData(); form.set("photo", file); const response = await fetch("/api/profile/photo", { method: "POST", body: form }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Upload failed."); setUser((old) => old ? { ...old, photoUrl: data.photoUrl } : old); setNotice("Profile picture updated."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not upload image."); }
    finally { setUploadingPhoto(false); event.target.value = ""; }
  }


  async function uploadStaffPhoto(member: Staff, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setNotice("Choose a JPG, PNG or WebP image up to 3 MB.");
      event.target.value = "";
      return;
    }
    setStaffPhotoBusyId(member.id);
    try {
      const form = new FormData();
      form.set("photo", file);
      form.set("staffId", member.id);
      const response = await fetch("/api/profile/photo", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Profile photo upload failed.");
      setStaff((current) => current.map((item) => item.id === member.id ? { ...item, photoUrl: data.photoUrl } : item));
      setNotice(`Updated ${member.name}'s profile picture.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update staff photo.");
    } finally {
      setStaffPhotoBusyId(null);
      event.target.value = "";
    }
  }


  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); }

  const counts = [
    { label: "Total tasks", value: taskCounts.total, icon: <ClipboardList size={20}/> },
    { label: "Open / active", value: taskCounts.active, icon: <Activity size={20}/> },
    { label: "Awaiting review", value: taskCounts.review, icon: <Clock3 size={20}/> },
    { label: "Verified", value: taskCounts.verified, icon: <CheckCircle2 size={20}/> },
  ];

  return <main className="min-h-screen bg-[#f5faf8] pb-12">
    <header className="sticky top-0 z-30 border-b border-[#e1eeeb] bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-4"><Logo/><span className="hidden h-8 w-px bg-[#e3eeea] sm:block"/><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#244b4f]">{user?.hospital.name ?? "Hospital"}</p><p className="text-[10px] uppercase tracking-[.13em] text-[#8aa09b]">Hospital workspace</p></div></div>
      <div className="relative" ref={profileMenuRef}><button onClick={() => setProfileOpen((value) => !value)} className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-[#f2f8f5]"><Avatar name={user?.name ?? "Admin"} photoUrl={user?.photoUrl}/><span className="hidden text-left sm:block"><span className="block max-w-36 truncate text-sm font-semibold text-[#244b4f]">{user?.name ?? "Administrator"}</span><span className="block text-[10px] text-[#8aa09b]">Administrator</span></span><ChevronDown size={15}/></button>
        {profileOpen && <div className="absolute right-0 z-40 mt-2 w-64 rounded-2xl border border-[#e1eeeb] bg-white p-3 shadow-xl"><div className="flex items-center gap-3 border-b border-[#edf3f1] px-2 pb-3"><Avatar name={user?.name ?? "Admin"} photoUrl={user?.photoUrl} size="h-11 w-11"/><div className="min-w-0"><p className="truncate text-sm font-bold text-[#153a40]">{user?.name}</p><p className="truncate text-xs text-[#829792]">{user?.email}</p></div></div><label className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#176e60] hover:bg-[#eff8f4]"><Upload size={16}/>{uploadingPhoto ? "Uploading…" : "Change profile picture"}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={uploadPhoto} disabled={uploadingPhoto}/></label><p className="px-3 pb-2 text-[10px] text-[#829792]">JPG, PNG or WebP · max 3 MB</p><button onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"><LogOut size={16}/> Sign out</button></div>}
      </div>
    </div></header>

    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#159b82]">Operations overview</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[#153a40]">Good day, {user?.name?.split(" ")[0] ?? "Admin"}</h1><p className="mt-1 text-sm text-[#718986]">Manage hospital locations, staff profiles, checklists and scheduled cleaning work.</p></div><div className="flex flex-wrap gap-2">{user?.role === "ADMIN" && <button onClick={() => { setResetPhrase(""); setResetOpen(true); }} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"><Trash2 size={15}/> Reset workspace</button>}<button onClick={() => setShowLayout(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#cfe5de] bg-white px-4 py-2.5 text-sm font-semibold text-[#176e60]"><Building2 size={17}/> Hospital layout</button><button disabled={!layout.floors.length || !layout.departments.length} onClick={() => { setEditingStaffId(null); setStaffForm({ name: "", email: "", employeeId: "", password: "", phone: "", floorId: selectedFloorId, departmentId: "" }); setShowStaff(true); }} className="inline-flex items-center gap-2 rounded-xl border border-[#cfe5de] bg-white px-4 py-2.5 text-sm font-semibold text-[#176e60] disabled:opacity-45"><UserPlus size={17}/> Add staff</button><button disabled={!layout.ready} onClick={() => { setEditingTaskId(null); setTaskForm({ title: "", areaId: "", priority: "HIGH", description: "", assignedToId: "", dueAt: "", checklistText: WASHROOM_CHECKLIST }); setShowTask(true); }} className="inline-flex items-center gap-2 rounded-xl bg-[#117d6b] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-45"><Plus size={17}/> Create task</button><button disabled={!layout.areas.length} onClick={() => setShowRoutine(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#bfe5d7] bg-[#eaf7f1] px-4 py-2.5 text-sm font-semibold text-[#176e60] disabled:opacity-45"><CalendarClock size={17}/> Daily routine</button></div></div>
      {notice && <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#d7ebe4] bg-white px-4 py-3 text-sm text-[#176e60]"><AlertCircle size={17}/><span>{notice}</span><button className="ml-auto" onClick={() => setNotice("")}><X size={16}/></button></div>}

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{counts.map((item) => <div key={item.label} className="rounded-2xl border border-[#dcebe7] bg-white p-5"><div className="flex items-center justify-between text-[#829792]"><span className="text-sm">{item.label}</span>{item.icon}</div><p className="mt-3 text-3xl font-bold text-[#153a40]">{item.value}</p></div>)}</div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dcebe7] bg-white px-5 py-3"><div><p className="text-sm font-semibold text-[#244b4f]">Hospital layout</p><p className="text-xs text-[#829792]">{layout.floors.length} floors · {layout.departments.length} floor departments · {layout.areas.length} configured areas</p></div><button onClick={() => setShowLayout(true)} className="rounded-xl bg-[#e6f5ef] px-4 py-2 text-xs font-semibold text-[#117d6b]">Open layout setup</button></div>

      {showLayout && <Modal title="Hospital layout setup" subtitle="Choose a floor, add multiple departments, then configure rooms, washrooms, beds and shared spaces." icon={<Building2 size={20}/>} onClose={() => setShowLayout(false)} width="max-w-6xl"><section className="overflow-hidden rounded-2xl border border-[#dcebe7] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf3f1] px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e6f5ef] text-[#117d6b]"><Building2 size={20}/></div><div><h2 className="font-bold text-[#153a40]">Hospital layout</h2><p className="text-xs text-[#829792]">Select a floor, add multiple departments, then add rooms, washrooms and shared spaces.</p></div></div><span className={`rounded-full px-3 py-1 text-[10px] font-bold ${layout.ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{layout.ready ? "READY FOR TASKS" : "SETUP REQUIRED"}</span></div>
        <div className="grid gap-5 p-5 xl:grid-cols-[.9fr_1.1fr]">
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#f6faf8] p-4"><div className="flex items-center gap-2 text-sm font-bold text-[#244b4f]"><Layers3 size={17}/> 1. Floors</div><p className="mt-1 text-xs text-[#829792]">Choose from the standard 10-floor list, or enter a custom floor.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><select value={floorToAdd} onChange={(event) => setFloorToAdd(event.target.value)} className={FIELD}>{FLOOR_SUGGESTIONS.map((name) => <option key={name}>{name}</option>)}<option value="Custom floor…">Custom floor…</option></select><button onClick={addFloor} disabled={busy} className="rounded-xl bg-[#123b43] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Add floor</button></div>{floorToAdd === "Custom floor…" && <input value={customFloorName} onChange={(event) => setCustomFloorName(event.target.value)} placeholder="Enter custom floor name" className={`${FIELD} mt-2`}/>}<label className="mt-4 block"><select aria-label="Select floor to configure" value={selectedFloorId} onChange={(event) => { setSelectedFloorId(event.target.value); setSelectedDepartments([]); setAreaForm((old) => ({ ...old, departmentId: "" })); }} className={FIELD}><option value="">Select an added floor</option>{layout.floors.map((floor) => <option key={floor.id} value={floor.id}>{floor.name}</option>)}</select></label><div className="mt-3 flex flex-wrap gap-2">{layout.floors.map((floor) => <button key={floor.id} onClick={() => setSelectedFloorId(floor.id)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${selectedFloorId === floor.id ? "bg-[#dff3eb] text-[#117d6b]" : "bg-white text-[#55736e]"}`}>{floor.name}</button>)}</div></div>
            <div className="rounded-2xl bg-[#f6faf8] p-4"><div className="flex items-center gap-2 text-sm font-bold text-[#244b4f]"><Stethoscope size={17}/> 2. Departments on {layout.floors.find((floor) => floor.id === selectedFloorId)?.name ?? "selected floor"}</div><p className="mt-1 text-xs text-[#829792]">Tick several departments and add them together. The same department can exist on different floors.</p><div className="mt-3 space-y-3">{DEPARTMENT_GROUPS.map((group) => <div key={group.group}><p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#159b82]">{group.group}</p><div className="grid gap-2 sm:grid-cols-2">{group.names.map((name) => { const existing = layout.departments.some((department) => department.floorId === selectedFloorId && department.name === name); const checked = existing || selectedDepartments.includes(name); return <label key={name} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs ${existing ? "border-emerald-100 bg-emerald-50/70 text-[#55736e]" : "border-[#e1eeeb] bg-white text-[#365a55]"}`}><input type="checkbox" checked={checked} disabled={!selectedFloorId || existing} onChange={(event) => setSelectedDepartments((old) => event.target.checked ? [...old, name] : old.filter((item) => item !== name))} className="h-4 w-4 accent-[#117d6b]"/><span className="flex-1">{name}</span>{existing && <span className="text-[9px] font-bold text-emerald-700">ADDED</span>}</label>; })}</div></div>)}</div><button onClick={addDepartments} disabled={busy || !selectedFloorId || selectedDepartments.length === 0} className="mt-4 w-full rounded-xl bg-[#123b43] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Add selected departments ({selectedDepartments.length})</button></div>
          </div>

          <div className="space-y-4">
            <form onSubmit={addArea} className="rounded-2xl border border-[#e1eeeb] bg-white p-4"><div className="flex items-center gap-2 text-sm font-bold text-[#244b4f]"><MapPin size={17}/> 3. Areas, rooms, washrooms and beds</div><p className="mt-1 text-xs text-[#829792]">Create individual numbered rooms, beds, male/female washrooms, common spaces and waiting areas.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-[#46645f]">Area / room / washroom / bed name or number</span><input required minLength={2} value={areaForm.name} onChange={(event) => setAreaForm({ ...areaForm, name: event.target.value })} placeholder="e.g. Washroom 01, Bed 204, OPD Waiting Area" className={FIELD}/></label><label><span className="mb-1.5 block text-xs font-semibold text-[#46645f]">Area type</span><select value={areaForm.type} onChange={(event) => setAreaForm({ ...areaForm, type: event.target.value, gender: "ANY" })} className={FIELD}>{TASK_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label><span className="mb-1.5 block text-xs font-semibold text-[#46645f]">Department</span><select required value={areaForm.departmentId} onChange={(event) => setAreaForm({ ...areaForm, departmentId: event.target.value })} className={FIELD}><option value="">Select department</option>{selectedFloorDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>{areaForm.type === "WASHROOM" && <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-[#46645f]">Washroom designation</span><select value={areaForm.gender} onChange={(event) => setAreaForm({ ...areaForm, gender: event.target.value })} className={FIELD}><option value="ANY">Common / all users</option><option value="MALE">Male washroom</option><option value="FEMALE">Female washroom</option></select></label>}</div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setAreaForm((old) => ({ ...old, name: "Common Area", type: "COMMON_AREA", gender: "ANY" }))} className="rounded-lg border border-[#dcebe7] px-3 py-2 text-xs font-semibold text-[#176e60]">+ Common area</button><button type="button" onClick={() => setAreaForm((old) => ({ ...old, name: "Waiting Area", type: "WAITING_AREA", gender: "ANY" }))} className="rounded-lg border border-[#dcebe7] px-3 py-2 text-xs font-semibold text-[#176e60]">+ Waiting area</button><button type="button" onClick={() => setAreaForm((old) => ({ ...old, name: "Bed ", type: "BED", gender: "ANY" }))} className="rounded-lg border border-[#dcebe7] px-3 py-2 text-xs font-semibold text-[#176e60]">+ Bed</button></div><button disabled={busy || !selectedFloorId || !selectedFloorDepartments.length} className="mt-4 w-full rounded-xl bg-[#117d6b] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">Save area</button></form>
            <div className="rounded-2xl bg-[#f6faf8] p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-[#244b4f]">Configured locations</h3><span className="text-xs text-[#829792]">{layout.areas.length} areas</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{layout.areas.length === 0 ? <p className="text-xs text-[#829792]">No areas yet. Add a washroom, room, bed, common area or waiting area.</p> : layout.areas.map((area) => <div key={area.id} className="flex items-start gap-2 rounded-xl border border-[#e6efec] bg-white p-3"><MapPin size={15} className="mt-0.5 text-[#159b82]"/><div className="min-w-0"><p className="text-sm font-semibold text-[#244b4f]">{area.name}{area.gender && area.gender !== "ANY" ? ` · ${area.gender.toLowerCase()}` : ""}</p><p className="text-[10px] text-[#829792]">{area.floor?.name ?? "Floor"} · {area.department?.name ?? "Department"} · {TASK_TYPES.find((type) => type.value === area.type)?.label ?? area.type}</p></div></div>)}</div></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-[#edf3f1] bg-[#fbfdfc] px-5 py-4 text-xs text-[#718986]"><span className="rounded-lg bg-[#f0f7f4] px-3 py-2"><b className="text-[#153a40]">{layout.floors.length}</b> floors</span><span className="rounded-lg bg-[#f0f7f4] px-3 py-2"><b className="text-[#153a40]">{layout.departments.length}</b> floor departments</span><span className="rounded-lg bg-[#f0f7f4] px-3 py-2"><b className="text-[#153a40]">{layout.areas.length}</b> areas</span></div>
      </section></Modal>}

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.55fr_.85fr]">
        <section className="overflow-hidden rounded-2xl border border-[#dcebe7] bg-white"><div className="flex items-center justify-between border-b border-[#edf3f1] px-5 py-4"><div><h2 className="font-bold text-[#153a40]">Task register</h2><p className="text-xs text-[#829792]">Checklists, multiple assignments per employee and dated work records.</p></div><ListChecks className="text-[#159b82]"/></div><div className="divide-y divide-[#edf3f1]">{loading ? <p className="p-5 text-sm text-[#829792]">Loading tasks…</p> : tasks.length === 0 ? <div className="p-8 text-center"><ClipboardList className="mx-auto text-[#159b82]"/><p className="mt-2 font-semibold text-[#244b4f]">No tasks created yet</p><p className="text-xs text-[#829792]">Create a special task or daily routine after configuring areas.</p></div> : tasks.map((task) => <article key={task.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-[#153a40]">{task.title}</h3><span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">{task.taskType === "ROUTINE" ? "DAILY ROUTINE" : "SPECIAL TASK"}</span></div><p className="mt-1 text-xs text-[#829792]">{task.area?.name ?? "No area"} · {task.assignedTo?.name ?? "Unassigned"} · {task.priority} priority</p><p className="mt-1 text-[11px] text-[#9aaba7]">{task.dueAt ? `Due ${new Date(task.dueAt).toLocaleString()}` : "No due date"}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-bold ${STATUS_CSS[task.status] ?? "bg-slate-100 text-slate-600"}`}>{STATUS[task.status] ?? task.status}</span></div>{task.description && <p className="mt-2 text-xs leading-5 text-[#718986]">{task.description}</p>}<div className="mt-3 rounded-xl bg-[#f7faf9] p-3"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold text-[#46645f]">Checklist · {task.checklist.filter((item) => item.isCompleted).length}/{task.checklist.length} complete</p><span className="text-[10px] text-[#829792]">{task.checklist.length} steps</span></div>{task.checklist.map((item, index) => <p key={item.id} className={`py-1 text-xs ${item.isCompleted ? "text-emerald-700 line-through" : "text-[#718986]"}`}>{index + 1}. {item.title}</p>)}</div>{task.evidenceUrl && <div className="mt-3 rounded-xl border border-[#d7ebe4] bg-[#f7fbf9] p-3"><div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#176e60]"><Camera size={15}/> Staff completion evidence</div><a href={task.evidenceUrl} target="_blank" rel="noreferrer" className="block"><img src={task.evidenceUrl} alt={`Staff completion evidence for ${task.title}`} className="max-h-72 w-full rounded-lg border border-[#dcebe7] bg-white object-contain"/><span className="mt-1 block text-[10px] font-semibold text-[#117d6b]">Open full-size evidence photo</span></a></div>}{task.status === "COMPLETED" && !task.evidenceUrl && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">No completion photo is attached to this task.</p>}<div className="mt-3 flex flex-wrap gap-2">{task.status === "COMPLETED" && <button onClick={() => taskAction(task.id, "verify")} disabled={busy} className="rounded-lg bg-[#117d6b] px-3 py-2 text-xs font-semibold text-white">Verify completion</button>}{task.status === "ASSIGNED" && task.taskType !== "ROUTINE" && <><button onClick={() => beginEditTask(task)} className="inline-flex items-center gap-1 rounded-lg border border-[#dcebe7] px-3 py-2 text-xs font-semibold text-[#176e60]"><Pencil size={13}/> Edit</button><button onClick={() => deleteTask(task)} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-rose-100 px-3 py-2 text-xs font-semibold text-rose-600"><Trash2 size={13}/> Delete</button></>}</div>{task.activities[0] && <p className="mt-3 text-[10px] text-[#9aaba7]">Latest: {task.activities[0].action} · {task.activities[0].actor?.name ?? "Team"}</p>}</article>)}</div></section>

        <aside className="space-y-5"><section className="rounded-2xl border border-[#dcebe7] bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-bold text-[#153a40]">Housekeeping team</h2><button onClick={() => { setEditingStaffId(null); setStaffForm({ name: "", email: "", employeeId: "", password: "", phone: "", floorId: selectedFloorId, departmentId: "" }); setShowStaff(true); }} className="rounded-lg bg-[#e6f5ef] px-3 py-1.5 text-xs font-semibold text-[#117d6b]">+ Add staff</button></div><p className="mt-1 text-xs text-[#829792]">{staff.filter((member) => member.role === "STAFF").length} active people</p><div className="mt-4 space-y-4">{staff.filter((member) => member.role === "STAFF").map((member) => <div key={member.id} className="flex items-center gap-3 border-b border-[#f0f5f3] pb-3 last:border-0"><Avatar name={member.name} photoUrl={member.photoUrl} size="h-9 w-9"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#244b4f]">{member.name}</p><p className="truncate text-[10px] text-[#829792]">{member.employeeId} · {member.floor?.name} · {member.department?.name}</p></div><div className="flex shrink-0 flex-col gap-1"><button onClick={() => editStaff(member)} className="text-[10px] font-semibold text-[#176e60]">Edit</button><label className="cursor-pointer text-[10px] font-semibold text-[#176e60]">{staffPhotoBusyId === member.id ? "Uploading…" : "Change photo"}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={staffPhotoBusyId === member.id} onChange={(event) => uploadStaffPhoto(member, event)}/></label><button onClick={() => assignTaskTo(member)} disabled={!layout.ready} className="text-[10px] font-semibold text-[#176e60] disabled:opacity-40">Assign task</button></div></div>)}{staff.filter((member) => member.role === "STAFF").length === 0 && <p className="text-sm text-[#829792]">No staff accounts yet. Add an employee after selecting a floor and department.</p>}</div></section><section className="rounded-2xl bg-[#123b43] p-5 text-white"><div className="flex items-center gap-2 text-emerald-300"><ShieldCheck size={19}/><span className="text-xs font-bold uppercase tracking-wider">Operational integrity</span></div><p className="mt-3 text-sm leading-6 text-teal-50/80">Every cleaning record is connected to a hospital floor, department, area, assigned employee and checklist. Submitted work remains available for administrator review.</p></section></aside>
      </div>
      <p className="mt-8 text-center text-[11px] text-[#a1b2ae]">Hospisafe · Every space. Every clean. Every record.</p>
    </div>

    {showStaff && <Modal title={editingStaffId ? "Edit housekeeping staff" : "Add housekeeping staff"} subtitle="Create or update a staff login and assign the employee to the correct floor and department." icon={<UserPlus size={20}/>} onClose={() => { setShowStaff(false); setEditingStaffId(null); }}><form onSubmit={saveStaff} className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-[#46645f]">Full name</span><input required minLength={2} value={staffForm.name} onChange={(event) => setStaffForm({ ...staffForm, name: event.target.value })} className={FIELD} placeholder="Employee full name"/></label><label><span className="mb-1 block text-xs font-semibold text-[#46645f]">Work email</span><input required type="email" value={staffForm.email} onChange={(event) => setStaffForm({ ...staffForm, email: event.target.value })} className={FIELD} placeholder="staff@hospital.com"/></label><label><span className="mb-1 block text-xs font-semibold text-[#46645f]">Employee ID</span><input required disabled={Boolean(editingStaffId)} value={staffForm.employeeId} onChange={(event) => setStaffForm({ ...staffForm, employeeId: event.target.value })} className={`${FIELD} disabled:bg-slate-50`} placeholder="HS-001"/></label><label><span className="mb-1 block text-xs font-semibold text-[#46645f]">{editingStaffId ? "New password (optional)" : "Initial password"}</span><input required={!editingStaffId} minLength={8} type="password" value={staffForm.password} onChange={(event) => setStaffForm({ ...staffForm, password: event.target.value })} className={FIELD} placeholder="At least 8 characters"/></label><label><span className="mb-1 block text-xs font-semibold text-[#46645f]">Phone (optional)</span><input value={staffForm.phone} onChange={(event) => setStaffForm({ ...staffForm, phone: event.target.value })} className={FIELD} placeholder="Contact number"/></label><label><span className="mb-1 block text-xs font-semibold text-[#46645f]">Floor</span><select required value={staffForm.floorId} onChange={(event) => setStaffForm({ ...staffForm, floorId: event.target.value, departmentId: "" })} className={FIELD}><option value="">Select floor</option>{layout.floors.map((floor) => <option key={floor.id} value={floor.id}>{floor.name}</option>)}</select></label><label><span className="mb-1 block text-xs font-semibold text-[#46645f]">Department</span><select required value={staffForm.departmentId} onChange={(event) => setStaffForm({ ...staffForm, departmentId: event.target.value })} className={FIELD}><option value="">Select department</option>{staffDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label></div><div className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => { setShowStaff(false); setEditingStaffId(null); }} className="rounded-xl border border-[#dcebe7] px-5 py-3 text-sm font-semibold text-[#55736e]">Cancel</button><button disabled={busy} className="rounded-xl bg-[#117d6b] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : editingStaffId ? "Save staff changes" : "Create staff account"}</button></div></form></Modal>}

    {showTask && <Modal title={editingTaskId ? "Edit special task" : "Create special task"} subtitle="Choose the location, assign an employee, set the due date and define the cleaning checklist." icon={<CalendarClock size={20}/>} onClose={() => { setShowTask(false); setEditingTaskId(null); }}><form onSubmit={saveTask} className="space-y-3"><label className="block"><span className="mb-1 block text-xs font-semibold text-[#46645f]">Task title</span><input required minLength={3} value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} className={FIELD} placeholder="e.g. Disinfect ICU washroom"/></label><label className="block"><span className="mb-1 block text-xs font-semibold text-[#46645f]">Hospital area</span><select required value={taskForm.areaId} onChange={(event) => { const area = layout.areas.find((item) => item.id === event.target.value); setTaskForm((old) => ({ ...old, areaId: event.target.value, checklistText: area ? checklistForAreaType(area.type) : WASHROOM_CHECKLIST })); }} className={FIELD}><option value="">Select room / washroom / area</option>{layout.areas.map((area) => <option key={area.id} value={area.id}>{area.name} · {area.floor?.name} · {area.department?.name}</option>)}</select></label><label className="block"><span className="mb-1 block text-xs font-semibold text-[#46645f]">Instructions</span><textarea rows={2} value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} className="w-full rounded-xl border border-[#dcebe7] bg-white px-3 py-2.5 text-sm" placeholder="Cleaning instructions and precautions"/></label><label className="block"><span className="mb-1 block text-xs font-semibold text-[#46645f]">Cleaning checklist · one action per line</span><textarea required rows={8} value={taskForm.checklistText} onChange={(event) => setTaskForm({ ...taskForm, checklistText: event.target.value })} className="w-full rounded-xl border border-[#dcebe7] bg-white px-3 py-2.5 text-sm leading-6" placeholder={WASHROOM_CHECKLIST}/><span className="mt-1 block text-[10px] text-[#829792]">Each line becomes an individual checkbox in the Staff task screen. Staff must complete every item before submission.</span></label><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block text-xs font-semibold text-[#46645f]">Priority</span><select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })} className={FIELD}><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></label><label><span className="mb-1 block text-xs font-semibold text-[#46645f]">Assign to staff</span><select value={taskForm.assignedToId} onChange={(event) => setTaskForm({ ...taskForm, assignedToId: event.target.value })} className={FIELD}><option value="">Unassigned</option>{taskEligibleStaff.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.employeeId}</option>)}</select></label></div><label className="block"><span className="mb-1 block text-xs font-semibold text-[#46645f]">Due date & time</span><input type="datetime-local" value={taskForm.dueAt} onChange={(event) => setTaskForm({ ...taskForm, dueAt: event.target.value })} className={FIELD}/></label><div className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => { setShowTask(false); setEditingTaskId(null); }} className="rounded-xl border border-[#dcebe7] px-5 py-3 text-sm font-semibold text-[#55736e]">Cancel</button><button disabled={busy} className="rounded-xl bg-[#117d6b] px-5 py-3 text-sm font-semibold text-white">{busy ? "Saving…" : editingTaskId ? "Save changes" : "Save special task"}</button></div></form></Modal>}

    {showRoutine && <Modal title="Create daily routine" subtitle="Set a recurring task template. Each date gets its own task record." icon={<CalendarClock size={20}/>} onClose={() => setShowRoutine(false)}><form onSubmit={saveRoutine} className="space-y-3"><label className="block"><span className="mb-1 block text-xs font-semibold text-[#46645f]">Routine name</span><input required value={routineForm.title} onChange={(event) => setRoutineForm({ ...routineForm, title: event.target.value })} className={FIELD} placeholder="Morning washroom cleaning"/></label><label className="block"><span className="mb-1 block text-xs font-semibold text-[#46645f]">Area</span><select required value={routineForm.areaId} onChange={(event) => setRoutineForm({ ...routineForm, areaId: event.target.value })} className={FIELD}><option value="">Select area</option>{layout.areas.map((area) => <option key={area.id} value={area.id}>{area.name} · {area.floor?.name}</option>)}</select></label><label className="block"><span className="mb-1 block text-xs font-semibold text-[#46645f]">Assign to staff</span><select value={routineForm.assignedToId} onChange={(event) => setRoutineForm({ ...routineForm, assignedToId: event.target.value })} className={FIELD}><option value="">Unassigned</option>{staff.filter((member) => member.role === "STAFF").map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block text-xs font-semibold text-[#46645f]">Due time</span><input type="time" required value={routineForm.dueTime} onChange={(event) => setRoutineForm({ ...routineForm, dueTime: event.target.value })} className={FIELD}/></label><label><span className="mb-1 block text-xs font-semibold text-[#46645f]">Priority</span><select value={routineForm.priority} onChange={(event) => setRoutineForm({ ...routineForm, priority: event.target.value })} className={FIELD}><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></label><label><span className="mb-1 block text-xs font-semibold text-[#46645f]">Start date</span><input type="date" required value={routineForm.startDate} onChange={(event) => setRoutineForm({ ...routineForm, startDate: event.target.value })} className={FIELD}/></label><label><span className="mb-1 block text-xs font-semibold text-[#46645f]">End date (optional)</span><input type="date" value={routineForm.endDate} onChange={(event) => setRoutineForm({ ...routineForm, endDate: event.target.value })} className={FIELD}/></label></div><label className="block"><span className="mb-1 block text-xs font-semibold text-[#46645f]">Instructions</span><textarea rows={2} value={routineForm.description} onChange={(event) => setRoutineForm({ ...routineForm, description: event.target.value })} className="w-full rounded-xl border border-[#dcebe7] bg-white px-3 py-2.5 text-sm"/></label><div className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowRoutine(false)} className="rounded-xl border border-[#dcebe7] px-5 py-3 text-sm font-semibold text-[#55736e]">Cancel</button><button disabled={busy} className="rounded-xl bg-[#117d6b] px-5 py-3 text-sm font-semibold text-white">Save daily routine</button></div></form></Modal>}

    {pendingTaskDelete && <Modal title="Delete this task?" subtitle="This task has not been started. Deleting it also removes its checklist and activity entries." icon={<Trash2 size={20}/>} onClose={() => setPendingTaskDelete(null)} width="max-w-lg"><div className="rounded-xl bg-[#f7faf9] p-4"><p className="text-sm font-bold text-[#244b4f]">{pendingTaskDelete.title}</p><p className="mt-1 text-xs text-[#829792]">Assigned to {pendingTaskDelete.assignedTo?.name ?? "Unassigned"}</p></div><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setPendingTaskDelete(null)} className="rounded-xl border border-[#dcebe7] px-5 py-3 text-sm font-semibold text-[#55736e]">Keep task</button><button type="button" disabled={busy} onClick={confirmDeleteTask} className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Deleting…" : "Delete task"}</button></div></Modal>}

    {resetOpen && <Modal title="Reset hospital workspace?" subtitle="This permanently removes operational records so you can configure the hospital from the beginning." icon={<AlertCircle size={20}/>} onClose={() => { if (!busy) { setResetOpen(false); setResetPhrase(""); } }} width="max-w-xl"><div className="rounded-2xl border border-rose-200 bg-rose-50 p-4"><p className="text-sm font-bold text-rose-800">This action cannot be undone.</p><p className="mt-2 text-xs leading-6 text-rose-700">It deletes all tasks, daily routine schedules, checklists, task activity history, non-admin staff accounts, areas, departments and floors in <strong>{user?.hospital.name ?? "this hospital"}</strong>. Your hospital account and all administrator login accounts are preserved.</p></div><label className="mt-5 block"><span className="mb-2 block text-xs font-bold text-[#46645f]">Type DELETE ALL to confirm</span><input value={resetPhrase} onChange={(event) => setResetPhrase(event.target.value)} className={FIELD} placeholder="DELETE ALL" autoComplete="off"/></label><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => { setResetOpen(false); setResetPhrase(""); }} disabled={busy} className="rounded-xl border border-[#dcebe7] px-5 py-3 text-sm font-semibold text-[#55736e]">Cancel</button><button type="button" disabled={busy || resetPhrase !== "DELETE ALL"} onClick={resetWorkspace} className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Resetting…" : "Delete workspace data"}</button></div></Modal>}

  </main>;
}
