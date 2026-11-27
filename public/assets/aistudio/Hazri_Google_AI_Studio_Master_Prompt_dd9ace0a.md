# HAZRI — Google AI Studio Master Prompt

> **Purpose:** Give this complete prompt to Google AI Studio as the master specification for the existing Hazri project. The goal is to inspect the current codebase and backend first, preserve working features, complete missing work, secure the system, and deliver a responsive website plus an installable mobile PWA.
>
> **Important project distinction:** The six Markdown files in the supplied `Hazri.zip` describe a different product named **ClipWave**, a short-video platform. They are not Hazri requirements and must not be used to replace or modify this Hazri specification. Do not add video feeds, video uploads, likes/comments for videos, or ClipWave roles to Hazri.

---

## 1. Your role and working method

Act as a senior full-stack engineer, Supabase/PostgreSQL security specialist, React/TypeScript developer, QA engineer, and Cloudflare deployment engineer.

You are working on an **existing project**, not starting from zero unless the repository is genuinely empty. Before changing anything:

1. Inspect the complete repository, branch, commit history, package scripts, dependencies, routes, components, services, types, migrations, tests, environment-variable usage, and deployment configuration.
2. Inspect the connected Supabase project: tables, columns, constraints, indexes, RLS policies, SQL functions/RPCs, triggers, Storage buckets and policies, Auth providers, and relevant Edge Functions.
3. Inspect the connected Cloudflare account and the existing Hazri Worker/Pages deployment, bindings, assets, environment variables, and deployment history.
4. Produce a baseline report showing what exists, what works, what is missing, what is duplicated, and what is unsafe.
5. Compare existing implementation with this specification. Preserve compatible working code. Do not overwrite or delete working features just to make the code look cleaner.
6. Make changes in small, logically grouped commits or migration files. Keep a clear change log.
7. Run type checks, lint, tests, production build, and role-based/security checks. Fix errors rather than hiding them.
8. Deploy only after a successful build and a review of the deployment target. Never replace a production Worker with a guessed or incomplete artifact.
9. Verify the live website and PWA after deployment. Report exactly what was tested and what could not be tested.

Do not claim that a task is complete merely because code was generated. Distinguish clearly between: code changed, GitHub committed, Supabase migration applied, build passed, Cloudflare deployed, and live smoke test passed.

If a required external action is blocked by unavailable credentials, connector capability, or build environment, continue with all safe work possible and state the exact blocker and smallest required next step. Never invent successful access or results.

---

## 2. Product identity and objective

**Product name:** Hazri (working name; retain unless the owner explicitly changes it).

Build a simple, reliable, secure student attendance and daily Quran lesson-record system for teachers/admins. It must work as:

- A responsive website accessible through a normal browser on desktop, tablet, and mobile.
- An installable Progressive Web App (PWA) on supported Android and iOS devices, where users can add it to their home screen and launch it in an app-like full-screen experience.

The PWA is not a promise of a native Play Store/App Store application. Do not create a native Android/iOS app unless separately requested. Prioritize a reliable mobile web experience and PWA installation.

The user experience must remain simple. Do not add unnecessary data-entry fields or complicated workflows.

---

## 3. Authentication and account isolation

### 3.1 Google-only sign-in

- Use Supabase Auth with **Google OAuth sign-in** as the intended login method.
- Do not add email/password registration as an alternative unless the owner explicitly asks for it.
- Implement sign-in, sign-out, session restoration, expired-session handling, and auth-state changes correctly.
- Configure the Supabase Google provider and OAuth redirect URLs for local development and production domains. Do not hardcode OAuth secrets in frontend code.
- Use environment variables for public Supabase configuration. The Supabase service-role key must never appear in browser code, public environment variables, GitHub, or built assets.
- If Google OAuth provider settings or Google Cloud OAuth credentials are not configured, show a clear setup instruction; do not fake a successful login.

### 3.2 Strict per-user data isolation

- Every authenticated Google account must see and manage only the records it is authorized to access.
- Use the authenticated Supabase user UUID (`auth.uid()`) as the security identity. Do not rely on email address as the authorization key.
- All user-owned tables must have appropriate `user_id` / owner references and strict Row Level Security (RLS).
- Users must not be able to read, insert, update, or delete another user's students, classes, attendance, performance records, settings, or private data by changing a request, URL, or client-side ID.
- Enforce ownership in database policies and server-side functions, not only in React route guards.
- Never trust a user ID supplied by the browser when the database can derive it from `auth.uid()`.
- Test isolation with at least two separate Google test accounts.

### 3.3 Roles and permissions

Inspect the current role model and preserve it if valid. At minimum, separate ordinary user/teacher access from any elevated administrative access. Never allow a user to grant themselves a privileged role by editing a profile row or sending a modified API request.

If the existing product supports multiple teachers/admins or shared classes, preserve the current intended ownership model and document it. Do not assume shared access unless the current schema and product behavior support it.

---

## 4. Core daily student record — required simple form

The main daily-entry workflow must be fast and easy to use on a phone.

For a selected student and date, record only the following core information:

### A. Attendance
- Present / Absent (use the existing app's exact attendance choices if already established).

### B. Sabaq
- Was Sabaq listened to? Yes / No.
- Number of lines recited/listened to (non-negative whole number).

### C. Sabqi
- Was Sabqi listened to? Yes / No.
- Number of lines recited/listened to (non-negative whole number).

### D. Manzil
- Was Manzil listened to? Yes / No.
- Number of lines recited/listened to (non-negative whole number).

### Strict form simplification rule
Do **not** show extra detailed fields on the daily entry form, including:
- Mistakes / errors count
- Grades or marks
- Surah name
- Page number
- Para number
- Detailed lesson breakdown
- Remarks or long notes
- Any other unrequested performance field

Do not reintroduce old/legacy fields into the visible form just because they remain in the database. Legacy columns may remain for backward compatibility, but the UI must stay limited to the fields above.

### Validation and behavior
- Line counts must be whole numbers greater than or equal to zero.
- If a lesson is marked **No**, use a consistent and documented behavior for its line count (normally set to zero and disable the count input). Do not leave contradictory values.
- If a lesson is marked **Yes**, allow the teacher to enter the number of lines.
- Prevent duplicate daily records for the same student/date according to the existing data model; use a database unique constraint or safe upsert where appropriate.
- Show clear saving, saved, validation, and error states.
- Do not lose entered data on a transient network error; provide a safe retry experience.

---

## 5. Student and class management

Inspect the existing app and preserve the established class/student workflows. Complete them so that an authorized user can:

- Create, view, edit, and archive/delete classes as supported by the existing product rules.
- Create, view, edit, and archive/delete students as supported by the existing product rules.
- Associate students with the correct class and owner.
- View a class roster and select a student for daily attendance/performance entry.
- Search or filter students where the current app already supports it or where needed for usability.
- Prevent accidental deletion with confirmation and preserve historical records where appropriate.

Do not invent complex school-management features, fee management, parent portals, timetables, messaging, or unrelated modules.

---

## 6. Daily records, history, and summaries

- Provide a date selector and a clear daily class/student workflow.
- Allow authorized users to review saved daily attendance and lesson records.
- Display the recorded attendance and the Yes/No plus line count for Sabaq, Sabqi, and Manzil.
- Support editing an existing record with proper ownership checks.
- Ensure saved line counts are fetched from Supabase and displayed after page refresh or re-login.
- Ensure the read query includes all three line-count fields: `sabaq_lines`, `sabqi_lines`, and `manzil_lines`.
- Keep summaries consistent with the underlying records. Do not fabricate sample/demo values in production.
- Provide helpful empty states when no record exists for the selected date.

---

## 7. Existing known implementation details to verify

The project has previously had work in these areas. Inspect the actual current repository and Supabase database before making assumptions:

- Google OAuth support was previously added in:
  - `src/services/authService.ts`
  - `src/contexts/AuthContext.tsx`
  - `src/pages/public/LoginPage.tsx`
- A `student_daily_performance` table and RLS migration were previously introduced.
- The daily performance form was simplified in `src/components/performance/DailyPerformanceForm.tsx` to attendance plus three lesson cards, each with Yes/No and line count.
- The following columns were previously added to `public.student_daily_performance`:
  - `sabaq_lines integer not null default 0 check (sabaq_lines >= 0)`
  - `sabqi_lines integer not null default 0 check (sabqi_lines >= 0)`
  - `manzil_lines integer not null default 0 check (manzil_lines >= 0)`
- `src/types/database.ts` was updated for the three line-count columns.
- `src/services/performanceService.ts` was updated so its selected performance columns include the three line-count fields.
- A previously reported GitHub commit was `dbb77d22aeea61576a4599e9e36883590f63ba89`, titled “Include recitation line counts when reading saved performance records”.

These are historical clues, not proof that the current branch or production database still contains the changes. Verify the actual state. If a change is already present and correct, do not duplicate it.

---

## 8. Supabase backend requirements

1. Inspect the live schema before writing migrations.
2. Use versioned, repeatable SQL migrations for schema changes.
3. Keep database naming consistent with the existing project; do not create parallel duplicate tables for the same feature.
4. Ensure all user-owned tables have RLS enabled and policies for the required operations.
5. Review policies for accidental broad access such as unrestricted `USING (true)` or `WITH CHECK (true)` on private tables.
6. Review functions and triggers for correct ownership and authorization checks.
7. Use database constraints for non-negative line counts and uniqueness where appropriate.
8. Ensure indexes exist for frequent filters, especially owner/user ID, student ID, class ID, and record date where relevant.
9. Keep migrations safe for existing production data. Avoid destructive changes unless absolutely necessary and explicitly documented.
10. Never put a service-role key in frontend code. Use a trusted server-side environment for privileged operations only when required.
11. Do not claim a migration is applied until Supabase confirms success and the resulting schema/policies are verified.
12. Test direct API access, not just UI behavior, for cross-user data isolation.

### Required verification scenarios
- User A can read/write their own authorized records.
- User A cannot read/write User B's records, even if they know the row UUID.
- Anonymous visitors cannot access private student or attendance data.
- A logged-out session cannot access protected data.
- Invalid negative line counts are rejected by the database.
- Duplicate student/date records are rejected or handled through the intended safe upsert behavior.

---

## 9. Frontend architecture and UX

- Use the existing stack if it is sound. The known project has used React, TypeScript, and Vite; do not migrate frameworks without a compelling reason.
- Keep Supabase access in service modules rather than scattering raw queries throughout UI components.
- Use typed database models and keep generated/manual types aligned with the real schema.
- Keep auth state centralized and handle loading states before rendering protected screens.
- Provide responsive navigation and layouts for narrow mobile screens first, then tablet and desktop.
- Use readable Urdu/English labels according to the existing product language. Do not translate or rename established database identifiers.
- Keep the daily record form compact, with large touch targets and minimal taps.
- Provide accessible labels, keyboard focus, sufficient contrast, and visible validation messages.
- Include loading, empty, success, offline/network error, permission-denied, and retry states.
- Avoid unnecessary animations and heavy dependencies.

---

## 10. Installable mobile PWA requirements

Implement a proper Progressive Web App so users can install Hazri from a supported mobile browser.

Required items:
- A valid web app manifest with product name, short name, start URL, display mode (prefer `standalone`), theme color, background color, and appropriate icon sizes.
- Valid app icons, including at least 192×192 and 512×512 PNG assets. Use a maskable icon where supported.
- A service worker registered safely in production.
- HTTPS production hosting.
- An offline fallback page and graceful offline messaging.
- Cache only safe static application assets. Do not cache private API responses, student data, auth tokens, or user-specific records in a shared cache.
- On logout, avoid leaving sensitive private content available to another person using the same device. Clear any user-specific client cache/state.
- Handle service-worker updates without trapping users on stale application code.
- Show a concise install hint where appropriate. Use the browser's install prompt when supported and explain iOS “Add to Home Screen” steps when needed.
- Test installability and launch behavior on Android Chrome and iOS Safari where devices or emulators are available.

Do not claim offline data entry/synchronization unless it has actually been designed, implemented, conflict-tested, and secured. The first release may provide an offline shell and a clear “internet required to save records” message rather than storing sensitive records offline.

---

## 11. GitHub source control

- Work on the existing repository and correct branch after verifying repository identity.
- Review current uncommitted changes before editing; do not overwrite user work.
- Commit related changes with descriptive messages.
- Keep migrations and `.env.example` in source control.
- Never commit `.env`, OAuth client secrets, Supabase service-role keys, Cloudflare API tokens, or other secrets.
- Add/verify `.gitignore` for local secrets, build artifacts, and dependency folders.
- Add or repair CI checks if the project already uses GitHub Actions; do not create a workflow that deploys unverified code.
- Ensure package lockfiles are consistent with the package manager used by the repository.
- Provide commit hashes and links for changes that were actually committed.

---

## 12. Cloudflare hosting and deployment

- Inspect whether the current production site is hosted through Cloudflare Pages or a Worker serving static assets. Follow the existing architecture unless there is a justified reason to change it.
- Inspect current production deployment and compare it with the latest intended GitHub commit.
- For a Vite static frontend, verify the production build output (normally `dist`) and SPA fallback/deep-link routing.
- Configure only required public frontend environment variables at build time, such as the existing project's Supabase URL and anon/publishable key variable names.
- Do not expose secrets in client-side variables or bundle output.
- Do not upload an empty, guessed, stale, or incomplete `dist` directory.
- Deploy only a verified artifact to the correct Hazri production target.
- After deployment, test the home/login route, Google OAuth redirect/return, protected route behavior, student/class screens, daily record save/read, refresh/deep links, and PWA manifest/service worker.
- Report deployment ID/version, live URL, time, and test results only when actually available.

---

## 13. Testing and acceptance criteria

### Functional
- [ ] User can sign in using Google through Supabase Auth.
- [ ] Session persists and logout works.
- [ ] A user's data is isolated from other accounts.
- [ ] Authorized user can manage their classes and students using the existing product workflow.
- [ ] User can record attendance for a student/date.
- [ ] User can mark Sabaq Yes/No and enter its line count.
- [ ] User can mark Sabqi Yes/No and enter its line count.
- [ ] User can mark Manzil Yes/No and enter its line count.
- [ ] No extra unrequested fields appear in the daily form.
- [ ] Saved line counts remain visible after refresh and re-login.
- [ ] Existing daily record can be edited safely.
- [ ] Duplicate records and invalid line counts are handled by database constraints/logic.

### Security
- [ ] RLS is enabled on every private user-owned table.
- [ ] Cross-account access is denied at the database/API layer.
- [ ] Anonymous and logged-out access to private records is denied.
- [ ] Privileged roles cannot be self-assigned.
- [ ] No service-role key or OAuth secret exists in frontend source or build output.

### Mobile/PWA
- [ ] Layout works on small mobile screens without horizontal overflow.
- [ ] Touch controls are comfortable to use.
- [ ] Manifest and icons are valid.
- [ ] Service worker registers on HTTPS production.
- [ ] App can be installed/launched on supported mobile browsers.
- [ ] Private student data is not exposed through shared/offline caches.

### Delivery
- [ ] Clean dependency install succeeds (or exact dependency-install blocker is documented).
- [ ] TypeScript check passes.
- [ ] Lint passes if configured.
- [ ] Tests pass if configured.
- [ ] Production build succeeds.
- [ ] Cloudflare deployment is verified.
- [ ] Live smoke tests pass.

---

## 14. Required final report from Google AI Studio

At the end, provide a clear report with these sections:

1. **Repository audit:** branch, latest commit, framework, current architecture, and baseline issues.
2. **Changes made:** every important file changed and why.
3. **Supabase audit:** tables, columns, constraints, indexes, RLS policies, functions, triggers, buckets, and migrations inspected/changed.
4. **Authentication:** Google OAuth configuration status and exact redirect URLs needed (never print secrets).
5. **Data isolation tests:** accounts/roles tested and pass/fail outcomes.
6. **Daily form:** confirm only attendance + Sabaq/Sabqi/Manzil Yes/No + line counts are visible.
7. **PWA:** manifest, icons, service worker, installability, and offline limitations.
8. **GitHub:** commits and commit links actually created.
9. **Build/test:** exact commands and results.
10. **Cloudflare:** target, deployment ID/version, live URL, and smoke-test results if deployed.
11. **Remaining blockers:** list only genuine outstanding items and the exact action needed.
12. **No false claims:** clearly mark anything not verified or not completed.

---

## 15. Final instruction

Start by auditing the existing Hazri repository and connected services. Then implement the missing requirements in this prompt while preserving existing valid work. Do not build ClipWave. Do not add unnecessary features or extra daily-entry fields. Deliver Hazri as a secure, Google-login-based, multi-user-isolated attendance and Quran lesson-record website that can also be installed as a mobile PWA.
