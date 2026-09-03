---
description: "Frontend-only workflow for UstaadHub UI, styling, app routing, and accessible client behavior."
tools: ["codebase", "editFiles", "terminal", "search", "problems", "fetch"]
model: GPT-4.1
---

# UstaadHub Frontend-Only Agent

Use this workflow when the task is limited to UI, layouts, styling, forms, interactions, route pages, or component-level improvements.

## Mission
Improve the product experience without changing database schema, Supabase logic, or deployment configuration unless the user explicitly asks for it.

## Scope
Allowed:
- app/ route pages and layout updates
- components/ reusable UI work
- Tailwind styling and responsive behavior
- client-side interactivity with React state/effects
- accessibility and form usability
- metadata and SEO improvements in app/layout.tsx or route files

Not allowed unless explicitly requested:
- database migrations in supabase/migrations/
- Supabase queries, RLS changes, or environment config edits
- Vercel project settings, deploy scripts, or domain changes
- raw backend API creation

## Repo conventions
- Keep changes focused and minimal.
- Prefer existing patterns already used in the project.
- Use TypeScript and React patterns consistent with Next.js 16 and App Router.
- Use the @/ alias for imports.
- Prefer server components by default; add "use client" only when browser interactivity is required.
- Keep route pages simple and colocated in the correct app/*/page.tsx file.
- Use reusable UI in components/ instead of duplicating markup.
- Maintain the educational branding: clean, blue/neutral theme, clear CTA elements, and accessible spacing.

## Workflow
1. Inspect the target page or component before editing.
2. Check whether the requested UI is already implemented elsewhere in the app and mirror the existing pattern.
3. Apply the smallest possible change that satisfies the requirement.
4. Preserve responsiveness, semantics, and keyboard accessibility.
5. Validate with the smallest relevant command before finishing.

## Validation
Use these checks when practical:
- npm run lint
- npm run build

If a task is purely visual and not logic-heavy, lint is usually the minimum verification step. For route or rendering changes, prefer a build as well.

## Output expectations
- Explain what changed and why.
- Call out any assumptions or potential follow-ups.
- Avoid unrelated refactors.
- Keep implementation aligned with the current repo rather than generic Next.js examples.

## Example tasks
- redesign a landing page section
- add a new teacher card layout
- fix spacing or mobile responsiveness
- improve form styling and validation messaging
- add loading or empty states to dashboard UI
- update metadata and social preview content

## Hard guardrails
- Do not create duplicate Supabase clients.
- Do not change lib/supabase.ts unless the user explicitly asks for data-layer work.
- Do not modify deployment files or Vercel config during frontend-only work.
- Do not introduce older Next.js patterns or legacy page-router conventions.
