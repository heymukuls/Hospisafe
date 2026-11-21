# Hospisafe

**Hospital Hygiene & Sanitation Management**
*Every space. Every clean. Every record.*

Hospisafe is a mobile-first workspace for hospital housekeeping teams and administrators. It connects hospital locations, staff assignments, recurring cleaning routines, one-time sanitation tasks, checklists and completion verification in one operational record.

## Live demo

- Application: https://hospisafe.online
- Admin portal: https://hospisafe.online/dashboard
- Staff portal: https://hospisafe.online/staff
- Health endpoint: https://hospisafe.online/api/health

The landing page includes separate **Admin demo** and **Staff demo** entry points. They use a dedicated sample tenant named **Hospisafe Demo Hospital**. Use sample information only; do not enter patient-identifying information or real staff records in the public demo.

## Core workflow

1. An administrator creates a hospital workspace and configures floors, departments and areas (rooms, washrooms, lobbies, beds and other spaces).
2. The administrator adds housekeeping staff with an employee ID and a staff login, then assigns the employee to a floor and department.
3. The administrator creates a one-time **Special task** with a location, priority, assignee and due date/time, or configures a **Daily routine** with a location, assignee, start date and due time.
4. Staff sign in to the separate Staff portal, view assigned work, start a task, complete its checklist and submit it.
5. An administrator reviews submitted work and verifies completion. Task activity is retained as an operational history.

Daily routine occurrences are generated idempotently when the task list is requested, using the Asia/Kolkata calendar date. This MVP does not run a separate background scheduler at the exact due time.

## Technology

- Next.js App Router, React and TypeScript
- Tailwind CSS
- Prisma ORM and MySQL
- Password hashing and role-based Admin / Staff sessions
- Progressive Web App manifest, service worker and Hospisafe shield-and-cross icon

## Run locally

Requirements: Node.js 22+, npm, and MySQL 8+.

```bash
npm install
cp .env.example .env
# Set DATABASE_URL and SHADOW_DATABASE_URL in .env; keep this file private.
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Open http://localhost:3000.

## Production checks

```bash
npm run build
npm run smoke -- https://hospisafe.online
```

The smoke test verifies the public health endpoint, both portals, demo Admin and Staff sessions, and the protected task/layout APIs. It does not create real hospital staff accounts. The demo login may initialise sample records in the dedicated demo tenant.

## Security and demo scope

- `.env` and other environment files are excluded from Git. Never commit credentials, cookies, private staff photos or real hospital data.
- The public demo is intentionally limited to sample data in a separate demo hospital tenant.
- This hackathon MVP demonstrates operational task management. Before production use with real hospitals, add formal account invitations and recovery, rate limiting, stronger deployment monitoring, backup/restore procedures, privacy review and a managed background scheduler for recurring work.
- Do not store patient-identifying information in Hospisafe demo records.

## Repository hygiene

Patch backups are stored under `.patch-backup/` and ignored by Git. Database migrations under `prisma/migrations/` are source-controlled; live `.env` files are not.
