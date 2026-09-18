# Aura by CannaPost

A cannabis dispensary social media post generator for Ontario, Canada. Generates AGCO-compliant captions and Health Canada warning-stamped images for dispensary Instagram marketing.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/api-server run test:credentials` — verify channel credential encryption, tamper detection, and wrong-key rejection
- `pnpm --filter @workspace/aura-cannapost run dev` — run the frontend (port 25150)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Required Environment Variables

- `DATABASE_URL` — Postgres connection string (auto-provisioned by Replit)
- `ANTHROPIC_API_KEY` — Used for AGCO compliance caption rewrites and caption generation
- `CLERK_SECRET_KEY` — Auto-provisioned by Replit Clerk
- `CLERK_PUBLISHABLE_KEY` — Auto-provisioned
- `VITE_CLERK_PUBLISHABLE_KEY` — Auto-provisioned
- `CHANNEL_CREDENTIALS_ENCRYPTION_KEY` — (Recommended) Dedicated server secret used to encrypt Twilio and SendGrid credentials at rest. Falls back to a domain-separated key derived from `SESSION_SECRET`.
- `STABILITY_AI_API_KEY` — (Optional) If set, used for AI-generated backgrounds in post images. Without it, gradient backgrounds are used.
- `OPENROUTER_IMAGE_MODEL` — (Optional) OpenRouter image model override. Defaults to `openai/gpt-5.4-image-2`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind v4 + shadcn/ui + Wouter routing
- Auth: Clerk (Replit-managed)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- AI: Anthropic Claude (AGCO compliance rewrites + caption generation)
- Image compositing: Sharp (server-side 1080×1080 JPEG generation)
- Validation: Zod (v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle table definitions (posts, brandProfiles, instagramConnections)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/imageGenerator.ts` — Sharp compositing pipeline (Health Canada warnings, LAYOUT constants)
- `artifacts/api-server/src/lib/agcoCompliance.ts` — AGCO caption rewrite logic (Anthropic)
- `artifacts/aura-cannapost/src/pages/` — React page components

## Architecture decisions

- **Image generation:** Sharp compositing with SVG text overlays. Background is either Stability AI (if key set) or dark gradient by product type. Images returned as base64 data URLs for the MVP.
- **AGCO compliance:** Every generated caption passes through Claude Haiku for a compliance rewrite. The original and rewritten captions are both stored; the rewritten version is used for Instagram publishing.
- **Health Canada warnings:** 14 mandatory strings, one selected randomly per generated post and locked onto the image (LAYOUT constants are locked).
- **Clerk auth:** Proxy middleware in Express; cookie-based for web (no bearer tokens on the frontend).
- **Instagram publishing:** Uses Meta Graph API (media container → publish). Note: Meta may flag cannabis content — manual review recommended before enabling auto-publish.

## Product

- Landing page with AGCO/Health Canada compliance messaging, 19+ Ontario notice
- Dashboard with stats and 5 cannabis-specific quick-generate prompts
- Post generator: product type, strain, THC%, optional reference photo upload
- History grid with filter by product type, search, delete
- Monthly calendar of scheduled posts
- Brand kit settings (business name, Instagram handle, logo, location)
- Instagram account connection via access token

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Instagram auto-publishing of THC%/strain-pricing content may be flagged by Meta regardless of AGCO compliance. Consider keeping publishing manual for dispensary accounts (see Section 7 of the master prompt).
- LAYOUT constants in `imageGenerator.ts` are locked — do not adjust pixel values, THC%/strain label positions, or the Health Canada warning box without explicit instruction.
- All 14 Health Canada warning strings must be preserved. Random selection per post is mandatory.
- Sharp requires native binary installation. If the server fails to start, check that `pnpm install` completed successfully for `@workspace/api-server`.
- base64 data URLs for images work for demo but should be replaced with object storage in production.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
