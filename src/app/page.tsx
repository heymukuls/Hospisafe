"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowRight, Check, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";

function BrandMark({ size = 52 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-2xl text-white shadow-lg"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(145deg, #159b82, #123b43)",
        boxShadow: "0 12px 28px rgba(17, 128, 110, .22)"
      }}
      aria-hidden="true"
    >
      <ShieldCheck size={size * .56} strokeWidth={1.8} />
    </div>
  );
}

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <main className="relative grid min-h-[100svh] place-items-center overflow-hidden bg-[#123b43] px-6 text-white">
        <div className="splash-orb absolute inset-0" />
        <div className="grid-pattern absolute inset-0 opacity-40" />
        <div className="relative flex flex-col items-center text-center">
          <div className="mb-6 rounded-[28px] bg-white p-3 shadow-2xl shadow-black/20">
            <BrandMark size={82} />
          </div>
          <div className="text-4xl font-bold tracking-[-0.06em]">Hospisafe</div>
          <p className="mt-2 text-sm tracking-wide text-teal-100">Hospital Hygiene &amp; Sanitation Management</p>
          <div className="mt-12 flex items-center gap-2 text-xs text-teal-100/80">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
            Preparing your workspace
          </div>
        </div>
        <div className="absolute bottom-8 text-[10px] uppercase tracking-[.28em] text-teal-100/50">Every space. Every clean. Every record.</div>
      </main>
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("Sign-in is a visual starter for now. Authentication will be connected in the next build step.");
  }

  return (
    <main className="min-h-[100svh] bg-[#f5faf8]">
      <div className="mx-auto grid min-h-[100svh] max-w-7xl lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden bg-[#123b43] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="grid-pattern absolute inset-0 opacity-50" />
          <div className="splash-orb absolute -left-36 top-1/4 h-[520px] w-[520px]" />
          <div className="relative flex items-center gap-3">
            <BrandMark />
            <div>
              <div className="text-xl font-bold tracking-tight">Hospisafe</div>
              <div className="text-xs text-teal-100/70">Hospital hygiene operations</div>
            </div>
          </div>
          <div className="relative max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-teal-100">
              <Sparkles size={14} /> A clearer view of hospital hygiene
            </div>
            <h1 className="text-5xl font-semibold leading-[1.12] tracking-[-.045em] xl:text-6xl">
              Every space deserves <span className="text-emerald-300">care.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-teal-50/75">
              Coordinate sanitation tasks, document cleaning activity, and keep teams aligned across your hospital.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[.07] p-4">
                <ShieldCheck className="mb-3 text-emerald-300" size={22} />
                <div className="font-medium">Accountable tasks</div>
                <div className="mt-1 text-xs text-teal-50/60">Clear records and ownership</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[.07] p-4">
                <Activity className="mb-3 text-emerald-300" size={22} />
                <div className="font-medium">Live visibility</div>
                <div className="mt-1 text-xs text-teal-50/60">A shared view of progress</div>
              </div>
            </div>
          </div>
          <div className="relative text-xs text-teal-100/50">HOSPISAFE · HYGIENE OPERATIONS PLATFORM</div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <BrandMark />
              <div>
                <div className="text-xl font-bold tracking-tight">Hospisafe</div>
                <div className="text-xs text-[#6c8588]">Hospital hygiene operations</div>
              </div>
            </div>

            <div className="mb-8">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4f6ef] text-[#13866f]">
                <LockKeyhole size={19} />
              </div>
              <p className="text-sm font-semibold text-[#159b82]">WELCOME TO HOSPISAFE</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-.04em] text-[#153a40]">Sign in to continue</h2>
              <p className="mt-2 text-sm leading-6 text-[#6c8588]">Access your hospital sanitation workspace.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#244b4f]">Work email</span>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@hospital.com"
                  className="h-12 w-full rounded-xl border border-[#dcebe7] bg-white px-4 text-sm outline-none transition placeholder:text-[#a1b4b1] focus:border-[#159b82] focus:ring-4 focus:ring-[#159b82]/10"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#244b4f]">Password</span>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="h-12 w-full rounded-xl border border-[#dcebe7] bg-white px-4 pr-12 text-sm outline-none transition placeholder:text-[#a1b4b1] focus:border-[#159b82] focus:ring-4 focus:ring-[#159b82]/10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#78918d] hover:text-[#159b82]">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
              <button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#117d6b] px-4 text-sm font-semibold text-white shadow-lg shadow-[#117d6b]/15 transition hover:bg-[#0e6b5c] active:scale-[.99]">
                Continue <ArrowRight size={17} />
              </button>
              {notice && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">{notice}</p>}
            </form>

            <div className="mt-7 flex items-start gap-3 rounded-xl border border-[#e1eeeb] bg-white p-4">
              <div className="mt-0.5 text-[#159b82]"><Check size={17} /></div>
              <p className="text-xs leading-5 text-[#6c8588]">For authorised hospital personnel. Your access and sanitation records will be protected by role-based permissions once authentication is enabled.</p>
            </div>
            <p className="mt-10 text-center text-[11px] text-[#91a5a1]">© {new Date().getFullYear()} Hospisafe. Built for safer care environments.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
