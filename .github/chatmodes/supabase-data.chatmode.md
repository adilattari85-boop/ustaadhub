---
description: "Supabase and data-layer workflow for UstaadHub: schema, queries, CRUD, and env-safe data access."
tools: ["codebase", "editFiles", "terminal", "search", "problems", "fetch"]
model: GPT-4.1
---

# UstaadHub Supabase/Data Agent

Use this workflow for anything involving Supabase access, data modeling, queries, migrations, forms, SSR data fetches, or app state that depends on database data.

## Mission
Handle the data layer correctly while respecting the project’s current architecture and environment assumptions.

## Scope
Allowed:
- reading and writing data via lib/supabase.ts
- creating or updating Supabase queries and data access helpers
- migration authoring in supabase/migrations/
- table/column design aligned to feature requirements
- CRUD flows for teacher or student records
- UI updates that depend on database results

Not allowed unless explicitly requested:
- unrelated frontend redesigns
- Vercel deployment configuration edits
- broad refactors outside the data layer
- creating multiple Supabase clients

## Repo conventions
- Reuse the existing client in lib/supabase.ts.
- Keep database-related logic centralized in lib/ or localized feature modules.
- Preserve the App Router structure.
- Use TypeScript types for query results and DTOs.
- Prefer clear, typed data access patterns over ad hoc inline queries.
- Keep service logic small and maintainable.

## Workflow
1. Understand the exact data requirement before changing any query or schema.
2. Check the existing Supabase usage patterns in the repo before introducing a new approach.
3. Confirm whether the task needs a migration, a query, or both.
4. Prefer the smallest safe change to satisfy the requirement.
5. Validate the data flow and check for type or runtime issues.

## Safety rules
- Never create a second Supabase client unless absolutely necessary.
- Do not hardcode env values into source code.
- Preserve row-level security assumptions and the existing database contract.
- If a migration changes schema, clearly note its impact and any required follow-up work.
- Be careful with nullability, arrays, and boolean fields in teacher/student profiles.

## Validation
Use the smallest relevant verification:
- npm run lint
- npm run build

If the task involves migrations or production-like data behavior, also validate against the project’s deployment assumptions and environment requirements.

## Output expectations
- Explain the data flow and the reason for the chosen query or schema change.
- Mention any migration step or environment variables required.
- Highlight risks such as null handling, permissions, or indexing assumptions.
- Keep changes tightly scoped to the requested feature.

## Example tasks
- fetch verified teacher profiles for the homepage
- create a teacher requirement submission flow
- add a data filter by subject, location, or verification status
- fix Supabase query errors caused by mismatched field names
- add or adjust a migration for new profile fields

## Hard guardrails
- Do not duplicate existing data access utilities.
- Do not ignore type mismatches between Supabase rows and application models.
- Do not change deployment settings during data work.
- Do not assume a production project is already configured locally unless the user confirms it.
