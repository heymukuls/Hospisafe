"use client";

import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Camera, CheckCircle2, Clock3, ClipboardCheck, ChevronDown, LogOut, Play, ShieldCheck, Upload, Users } from "lucide-react";

type Task = { id: string; taskType?: string; title: string; description: string | null; priority: string; status: string; dueAt?: string | null; area: { name: string } | null; checklist: { id: string; title: string; isCompleted: boolean }[]; evidenceUrl?: string | null };
type User = { id: string; name: string; email?: string | null; employeeId: string; role: string; photoUrl?: string | null; hospital: { name: string }; department: { name: string } | null; floor?: { name: string } | null };
const STATUS: Record<string, string> = { ASSIGNED: "Ready to start", IN_PROGRESS: "In progress", COMPLETED: "Submitted for review", VERIFIED: "Verified", CANCELLED: "Cancelled" };

export default function StaffPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [evidenceBusy, setEvidenceBusy] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
      if (!sessionResponse.ok) { router.replace("/login"); return; }
      const sessionData = await sessionResponse.json();
      if (sessionData.user.role !== "STAFF") { router.replace("/dashboard"); return; }
      setUser(sessionData.user);
      const response = await fetch("/api/tasks", { cache: "no-store" });
      if (response.ok) setTasks((await response.json()).tasks);
    } catch { setNotice("Could not load your tasks. Please refresh."); }
    finally { setLoading(false); }
  }, [router]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function action(taskId: string, actionName: string) {
    setBusy(taskId); setNotice("");
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionName }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Task update failed.");
      setNotice(actionName === "start" ? "Task started. Complete each checklist action." : "Task submitted. Your administrator can now review it.");
      await refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Task update failed."); }
    finally { setBusy(""); }
  }

  async function toggleChecklist(taskId: string, itemId: string, isCompleted: boolean) {
    setBusy(taskId); setNotice("");
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "checklist", itemId, isCompleted }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not update checklist.");
      await refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not update checklist."); }
    finally { setBusy(""); }
  }

  async function uploadTaskEvidence(taskId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size < 1 || file.size > 5 * 1024 * 1024) {
      setNotice("Choose a JPG, PNG or WebP completion photo up to 5 MB.");
      event.target.value = "";
      return;
    }
    setEvidenceBusy(taskId);
    setNotice("");
    try {
      const form = new FormData();
      form.set("evidence", file);
      const response = await fetch(`/api/tasks/${taskId}/evidence`, { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not upload completion photo.");
      setNotice("Completion photo uploaded. Your task is ready to submit for administrator verification.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not upload completion photo.");
    } finally {
      setEvidenceBusy("");
      event.target.value = "";
    }
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) { setNotice("Choose a JPG, PNG or WebP image up to 3 MB."); return; }
    setUploading(true);
    try {
      const form = new FormData(); form.set("photo", file);
      const response = await fetch("/api/profile/photo", { method: "POST", body: form });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Upload failed.");
      setUser((old) => old ? { ...old, photoUrl: data.photoUrl } : old); setNotice("Profile picture updated.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not upload profile picture."); }
    finally { setUploading(false); event.target.value = ""; }
  }

  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); }
  const active = tasks.filter((task) => ["ASSIGNED", "IN_PROGRESS"].includes(task.status)).length;
  const completed = tasks.filter((task) => ["COMPLETED", "VERIFIED"].includes(task.status)).length;
  const initials = user?.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() ?? "ST";

  return <main className="min-h-screen bg-[#f5faf8] pb-24"><header className="sticky top-0 z-30 border-b border-[#e1eeeb] bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3"><div className="flex items-center gap-3"><img src="/icon.svg" alt="Hospisafe logo" className="h-10 w-10 rounded-xl object-cover"/><div><p className="font-bold text-[#153a40]">Hospisafe</p><p className="text-[11px] text-[#829792]">{user?.hospital.name ?? "Hospital workspace"}</p></div></div><div className="relative"><button onClick={() => setProfileOpen((value) => !value)} className="flex items-center gap-2 rounded-full p-1 hover:bg-[#f2f8f5]" aria-label="Open staff profile"><span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#24b99a] to-[#123b43] text-xs font-bold text-white">{user?.photoUrl ? <img src={user.photoUrl} alt="Profile" className="h-full w-full object-cover"/> : initials}</span><ChevronDown size={15}/></button>{profileOpen && <><button className="fixed inset-0 z-30" aria-label="Close profile menu" onClick={() => setProfileOpen(false)}/><div className="absolute right-0 z-40 mt-2 w-64 rounded-2xl border border-[#e1eeeb] bg-white p-3 shadow-xl"><div className="flex items-center gap-3 border-b border-[#edf3f1] px-2 pb-3"><span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-[#e6f5ef] text-sm font-bold text-[#117d6b]">{user?.photoUrl ? <img src={user.photoUrl} alt="" className="h-full w-full object-cover"/> : initials}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-[#153a40]">{user?.name}</p><p className="truncate text-xs text-[#829792]">{user?.email}</p></div></div><label className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#176e60] hover:bg-[#eff8f4]"><Upload size={16}/>{uploading ? "Uploading…" : "Change profile picture"}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={uploadPhoto} disabled={uploading}/></label><button onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"><LogOut size={16}/> Sign out</button></div></>}</div></div></header>
    <div className="mx-auto max-w-3xl px-4 py-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#159b82]">My shift</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[#153a40]">Hello, {user?.name?.split(" ")[0] ?? "there"}</h1><p className="mt-1 text-sm text-[#718986]">{user?.hospital.name} · {user?.department?.name ?? "Housekeeping"} · {user?.floor?.name ?? "Floor not set"} · {user?.employeeId}</p>
      <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-[#e1eeeb] bg-white p-4"><div className="flex items-center gap-2 text-[#718986]"><Clock3 size={17}/><span className="text-xs">Tasks to do</span></div><p className="mt-2 text-3xl font-bold text-[#153a40]">{active}</p></div><div className="rounded-2xl border border-[#e1eeeb] bg-white p-4"><div className="flex items-center gap-2 text-[#718986]"><CheckCircle2 size={17}/><span className="text-xs">Submitted</span></div><p className="mt-2 text-3xl font-bold text-[#153a40]">{completed}</p></div></div>
      {notice && <div className="mt-5 rounded-xl border border-[#d7ebe4] bg-white px-4 py-3 text-sm text-[#176e60]">{notice}</div>}
      <div className="mt-7 flex items-center justify-between"><div><h2 className="text-lg font-bold text-[#153a40]">Assigned tasks</h2><p className="text-xs text-[#8aa09b]">Start each task and tick all checklist actions before submission.</p></div><button onClick={refresh} className="text-sm font-semibold text-[#13866f]">Refresh</button></div>
      <div className="mt-4 space-y-4">{loading ? <p className="rounded-xl bg-white p-6 text-sm text-[#8aa09b]">Loading assigned tasks…</p> : tasks.length === 0 ? <div className="rounded-2xl border border-dashed border-[#cfe1db] bg-white p-8 text-center"><ClipboardCheck className="mx-auto text-[#159b82]" size={30}/><p className="mt-3 font-semibold text-[#244b4f]">No tasks assigned yet</p><p className="mt-1 text-sm text-[#8aa09b]">Your administrator will assign work here.</p></div> : tasks.map((task) => <article key={task.id} className="rounded-2xl border border-[#e1eeeb] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-bold uppercase tracking-wider text-[#159b82]">{task.priority} priority · {task.taskType === "ROUTINE" ? "Daily routine" : "Special task"}</span><h3 className="mt-1 text-lg font-bold text-[#153a40]">{task.title}</h3><p className="mt-1 text-xs text-[#829792]">{task.area?.name ?? "Assigned area"}{task.dueAt ? ` · Due ${new Date(task.dueAt).toLocaleString()}` : ""}</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-700">{STATUS[task.status] ?? task.status}</span></div>{task.description && <p className="mt-3 text-sm leading-6 text-[#718986]">{task.description}</p>}<div className="mt-4 rounded-xl bg-[#f6faf8] p-3"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold text-[#46645f]">Cleaning checklist</p><span className="text-[10px] text-[#829792]">{task.checklist.filter((item) => item.isCompleted).length}/{task.checklist.length} completed</span></div>{task.checklist.map((item, index) => <label key={item.id} className={`flex items-start gap-2 border-t border-[#eaf1ee] py-2 text-sm ${item.isCompleted ? "text-emerald-800" : "text-[#55736e]"}`}><input type="checkbox" checked={item.isCompleted} disabled={task.status !== "IN_PROGRESS" || busy === task.id} onChange={(event) => toggleChecklist(task.id, item.id, event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#117d6b] disabled:opacity-60"/><span className={item.isCompleted ? "line-through opacity-70" : ""}>{index + 1}. {item.title}</span></label>)}</div>{task.status === "IN_PROGRESS" && task.checklist.length > 0 && task.checklist.every((item) => item.isCompleted) && <section className="mt-4 rounded-xl border border-[#d7ebe4] bg-[#f7fbf9] p-3"><div className="flex items-center gap-2 text-sm font-bold text-[#244b4f]"><Camera size={17} className="text-[#159b82]"/> Completion evidence photo</div><p className="mt-1 text-xs leading-5 text-[#718986]">After checking every step, upload a clear photo of the cleaned area. Your administrator will see it before verifying this task.</p>{task.evidenceUrl && <a href={task.evidenceUrl} target="_blank" rel="noreferrer" className="mt-3 block"><img src={task.evidenceUrl} alt={`Completion evidence for ${task.title}`} className="max-h-64 w-full rounded-xl border border-[#dcebe7] bg-white object-contain"/><span className="mt-1 block text-[10px] font-semibold text-[#117d6b]">Evidence uploaded · tap image to view full size</span></a>}<label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#b8ddd0] bg-white px-4 py-3 text-sm font-semibold text-[#117d6b] hover:bg-[#eef8f3]"><Camera size={16}/>{evidenceBusy === task.id ? "Uploading photo…" : task.evidenceUrl ? "Replace completion photo" : "Upload completion photo"}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={evidenceBusy === task.id} onChange={(event) => uploadTaskEvidence(task.id, event)}/></label><p className="mt-2 text-[10px] text-[#829792]">JPG, PNG or WebP · maximum 5 MB</p></section>}{task.status === "ASSIGNED" && <button disabled={busy === task.id} onClick={() => action(task.id, "start")} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#117d6b] py-3 text-sm font-semibold text-white disabled:opacity-60"><Play size={16}/>{busy === task.id ? "Updating…" : "Start task"}</button>}{task.status === "IN_PROGRESS" && <button disabled={busy === task.id || task.checklist.length === 0 || task.checklist.some((item) => !item.isCompleted) || !task.evidenceUrl} onClick={() => action(task.id, "complete")} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#117d6b] py-3 text-sm font-semibold text-white disabled:opacity-40"><CheckCircle2 size={17}/>{busy === task.id ? "Submitting…" : task.checklist.some((item) => !item.isCompleted) ? "Complete all checklist items first" : !task.evidenceUrl ? "Upload completion photo first" : "Submit for administrator verification"}</button>}{["COMPLETED", "VERIFIED"].includes(task.status) && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-700">Submitted successfully · visible to administrator</p>}</article>)}</div>
      <div className="mt-8 rounded-2xl bg-[#123b43] p-5 text-center text-white"><ShieldCheck className="mx-auto text-emerald-300" size={25}/><p className="mt-2 text-sm font-semibold">Every space. Every clean. Every record.</p><p className="mt-1 text-xs text-teal-100/70">Your work is recorded for supervisor review.</p></div>
    </div>
    <nav className="fixed inset-x-0 bottom-0 border-t border-[#e1eeeb] bg-white/95 px-6 py-3 backdrop-blur"><div className="mx-auto flex max-w-3xl justify-around"><div className="flex flex-col items-center gap-1 text-[#117d6b]"><ClipboardCheck size={20}/><span className="text-[10px] font-semibold">My tasks</span></div><div className="flex flex-col items-center gap-1 text-[#9aafaa]"><Activity size={20}/><span className="text-[10px]">Activity</span></div><div className="flex flex-col items-center gap-1 text-[#9aafaa]"><Users size={20}/><span className="text-[10px]">Profile</span></div></div></nav>
  </main>;
}
