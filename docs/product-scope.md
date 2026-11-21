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

## Admin portal
1. Hospital structure manager: hospital > floors > departments/areas > rooms/washrooms/lobbies > beds.
2. Staff directory: employee ID, name, phone, optional gender, role, floor/department assignment, active status.
3. Task management: manual assignment and recurring/triggered schedule rules.
4. Calendar and schedule management.
5. Priority management: Critical, High, Medium, Low.
6. Notification centre and operational overview.
7. Staff work history and task audit trail.

## Staff portal
1. Mobile-first home screen.
2. Today, upcoming, active, completed, and overdue tasks.
3. Day/week calendar.
4. Task detail with location, instructions, time, deadline, and priority.
5. Start task, complete checklist, report issue, submit completion.
6. Personal work history.
7. In-app notifications and reminders.

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
- staff_profiles
- task_templates
- schedule_rules
- tasks
- task_checklist_items / task_responses
- notifications
- task_events (append-only audit history)

## Delivery order
1. Establish backend schema and role model.
2. Admin creates floors and locations.
3. Admin creates staff profiles.
4. Admin assigns one manual sanitation task.
5. Staff sees task, starts it, completes checklist, and submits.
6. Admin sees the persisted result and work history.
7. Add recurring calendar generation and reminders.
8. Add richer floor visualization, room/bed turnover, supervisor verification, and browser push.

## MVP constraints
- First complete vertical slice is one manual task from Admin assignment to Staff completion to Admin-visible history.
- Do not build the second feature before this flow works end-to-end.
- No mock metrics presented as live data.
- No patient-identifying information in sanitation records.
