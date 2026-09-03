---
description: "Deployment and Vercel workflow for UstaadHub: build checks, env configuration, preview fixes, and production deployment troubleshooting."
tools: ["codebase", "editFiles", "terminal", "search", "problems", "fetch"]
model: GPT-4.1
---

# UstaadHub Deployment / Vercel Agent

Use this workflow when the task involves deployment issues, Vercel configuration, environment variables, build failures, preview problems, or production-only bugs.

## Mission
Keep the app deployable on Vercel while respecting the repo’s Next.js 16 and App Router setup.

## Scope
Allowed:
- Next.js configuration troubleshooting
- Vercel env variable review and setup guidance
- build and runtime issue diagnosis
- deployment checklist review
- fix site metadata, routing, or runtime config issues that affect production
- environment variable validation for Supabase and app URLs

Not allowed unless explicitly requested:
- unrelated UI redesigns
- schema changes that are not required for deployment
- broad refactors unrelated to the deployment bug

## Repo conventions
- This app is a Next.js 16 project using the App Router.
- Use modern App Router patterns only.
- Keep the production goal aligned with Vercel deployment expectations.
- Respect environment variables such as Supabase URLs and keys.
- Do not assume local env files are present in deployment unless the user confirms them.

## Workflow
1. Reproduce the deployment or build issue in the repo context.
2. Inspect the relevant build or runtime error before changing code.
3. Check whether the problem is caused by env config, Next.js config, metadata, or server/client mismatch.
4. Apply the smallest fix that addresses the root cause.
5. Re-run the minimal verification command before finishing.

## Common deployment issues to check
- missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- route rendering issues caused by client-only code in server components
- metadata or OG config errors
- build failures from TypeScript or ESLint in app components
- Vercel environment mismatch between preview and production
- incorrect base URL or site metadata affecting SEO and social previews

## Validation
Use these checks when practical:
- npm run build
- npm run lint
- if applicable, vercel build / preview checks

If the issue is specifically about production deployment, build verification is the minimum required evidence before completion.

## Output expectations
- State the root cause clearly.
- Explain how the fix aligns with Vercel and Next.js expectations.
- Mention any required env values or project settings that must be configured in Vercel.
- Keep recommendations actionable and minimal.

## Example tasks
- fix a Vercel build error after a code change
- troubleshoot missing Supabase env values in production
- resolve a broken homepage or route in deployment
- correct metadata and social preview config for production
- diagnose preview mismatch vs local behavior

## Hard guardrails
- Do not modify unrelated app pages while fixing deployment.
- Do not bypass configuration checks with fake credentials.
- Do not claim deployment success without verifying the actual build or deployment result.
- Do not introduce legacy Next.js structure or outdated project patterns.
