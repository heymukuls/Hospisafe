# Hospisafe — Product Scope

## Product
Hospital hygiene and sanitation operations platform with separate Admin and Staff portals.

## Core principles
- Build from this repository's clean starting point only.
- Use one central database and role-based access.
- Every task belongs to a configured hospital location.
- Keep immutable assignment and completion history.
- Distinguish task completion, supervisor verification, and room release.
- Collect only staff personal data needed for operations. Age is excluded from the initial profile; gender is optional and should only be collected if the hospital has a legitimate operational reason.
- Never store patient names, diagnoses, or medical records in sanitation tasks.
- Make the entire application mobile-first, responsive, and installable as a PWA—not just the staff portal.

## App-wide experience and PWA
- Responsive layouts for phones, tablets, laptops, and desktop displays.
- App-like navigation and touch-friendly controls.
- Mobile bottom navigation for both portals, with role-appropriate destinations; desktop uses a sidebar or top navigation.
- Branded splash/loading experience and Hospisafe app icon/favicon.
- Web app manifest, service worker, install prompt guidance, and HTTPS deployment.
- Offline support should be limited to safe cached app-shell/read-only content initially. Do not queue sensitive task mutations offline until conflict handling and secure sync are designed.
- In-app notification centre; browser push is an opt-in enhancement and requires HTTPS and user permission.

## Admin portal
1. Hospital structure manager: hospital > floors > departments/areas > rooms/washrooms/lobbies > beds.
2. Staff directory: employee ID, name, phone, optional profile photo, optional gender, role, floor/department assignment, active status.
3. Task management: manual assignment and recurring/triggered schedule rules.
4. Calendar and schedule management.
5. Priority management: Critical, High, Medium, Low.
6. Notification centre and operational overview.
7. Staff work history and task audit trail.

## Staff portal
1. Mobile-first home screen with bottom navigation.
2. Staff profile with optional profile photo for visual identification; staff can add or update their photo.
3. Today, upcoming, active, completed, and overdue tasks.
4. Day/week calendar.
5. Task detail with location, instructions, time, deadline, and priority.
6. Start task, complete checklist, report issue, and submit completion.
7. Personal work history.
8. In-app notifications and reminders.

## Staff photo privacy and handling
- Profile photo is optional and used only for staff identification within the authorised hospital workspace.
- Store photos in private object storage, not a public bucket.
- Serve photos only through authenticated, short-lived access or equivalent protected delivery.
- Validate file type and size; accept common image formats only.
- Do not use facial recognition or infer identity from the photo.

## Scheduling and notifications
- Recurring schedules create task instances idempotently.
- Admin can also create one-off tasks manually.
- Discharge-triggered room cleaning is created only from an authorised discharge/turnover event.
- Reminders are scheduled relative to task start/deadline.
- In-app notifications support unread/read state.
- Realtime updates are used while the app is open; web push is a later enhancement requiring user permission and HTTPS.

## Data model direction
- hospitals
- floors
- departments
- locations (typed: room, washroom, lobby, corridor, ward, etc.)
- beds (attached to room locations)
- staff_profiles (including optional private profile-photo storage key)
- task_templates
- schedule_rules
- tasks
- task_checklist_items / task_responses
- notifications
- task_events (append-only audit history)

## Delivery order
1. Establish backend schema and role model.
2. Build responsive app shell and role-specific mobile navigation.
3. Admin creates floors and locations.
4. Admin creates staff profiles; add secure optional photo upload.
5. Admin assigns one manual sanitation task.
6. Staff sees task, starts it, completes checklist, and submits.
7. Admin sees the persisted result and work history.
8. Add recurring calendar generation and reminders.
9. Add richer floor visualization, room/bed turnover, supervisor verification, and browser push.

## MVP constraints
- First complete vertical slice is one manual task from Admin assignment to Staff completion to Admin-visible history.
- Do not build the second feature before this flow works end-to-end.
- No mock metrics presented as live data.
- No patient-identifying information in sanitation records.
- Do not store staff profile photos in a publicly accessible bucket.
