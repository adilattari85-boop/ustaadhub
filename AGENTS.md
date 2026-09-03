# UstaadHub Agent Instructions

## Project overview
This repository is a Next.js 16 app for UstaadHub, a teacher-matching platform for students seeking tutors and online learning support. The app uses the App Router, React 19, TypeScript, Tailwind CSS, and Supabase.

## Core rules
- Keep changes focused and minimal.
- Prefer the existing file structure and naming conventions already used in the repo.
- Use TypeScript types and React patterns that match the project.
- Preserve the App Router architecture in the app/ directory.
- Use the @/ alias for imports that correspond to project root paths.
- Prefer server components by default; add "use client" only when browser interactivity is required.
- Do not introduce framework patterns from older Next.js versions unless they are explicitly needed.

## Key project structure
- app/: Next.js route pages and app-level layout.
- components/: reusable UI components.
- lib/: project utilities, including Supabase client setup.
- public/: static assets.
- supabase/migrations/: database migrations.

## Stack and conventions
- Framework: Next.js 16 with App Router
- UI: React 19 + TypeScript
- Styling: Tailwind CSS
- Data: Supabase via @supabase/supabase-js
- Deployment target: Vercel

## Commands
- Development: npm run dev
- Production build: npm run build
- Linting: npm run lint
- Production start: npm run start

## Implementation guidance
- For route pages, keep the page component simple and colocated in the appropriate app/*/page.tsx file.
- For shared logic or reusable data access, place it in lib/ or components/ instead of scattering it across pages.
- Keep metadata and SEO configuration in app/layout.tsx or the relevant route file when needed.
- Respect the current design language: clean educational branding, blue/neutral UI, and clear CTA buttons.
- For Supabase access, use the existing lib/supabase.ts client and avoid creating duplicate clients.

## Quality bar
- Run the relevant validation command before declaring work complete when practical.
- Favor small, testable edits over large refactors.
- Do not remove existing functionality without a clear reason.
- Preserve accessibility and responsive behavior when updating UI.

## Important note
This project is intentionally configured for a modern Next.js App Router setup. If a change appears to rely on outdated Next.js conventions, verify against the installed version and keep the implementation aligned with the current repo rather than generic examples. 
