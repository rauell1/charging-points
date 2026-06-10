# Charging Points - Project Rules for Claude

## Code Style

### No Em Dashes or En Dashes
Never use em dashes (U+2014: --) or en dashes (U+2013: -) anywhere in this codebase.
This applies to: JSX/TSX string literals, comments, template literals, error messages, and any other text.

- Use a regular hyphen `-` for separators in comments and text strings
- Use a colon `:` as a label separator in UI text (e.g. `Hub: 5 operational`)
- Use `-` as an empty/null placeholder in tables and UI cells

### Charger ID Canonical Formats
**Roam Hubs**: `FO-NBI-XX#RH-KE-A-XX` (e.g. `FO-NBI-01#RH-KE-A-07`)
**Roam Points**: `FO-NBI-XX#RP-KE-A-XX` (e.g. `FO-NBI-06#RP-KE-A-03`)

- Never create or accept bare `#RH-KE-A-XX` or `#RP-KE-A-XX` entries
- Use `resolveStation()` from `src/lib/sync-helper.ts` in all sync paths - it handles both hub and point suffix fallback automatically
- Hub exceptions (no FO-NBI counterpart, keep bare IDs): `#RH-KE-A-09` (Oryx Ruai), `#RH-KE-A-22` (Ngong Center), `#RH-KE-A-25` (Banana)
- Point canonical source: column I of the Roam Points Google Sheet (48 entries, RP-01 through RP-48)

### Duplicate Prevention
- Google Sheets sync must always call `resolveStation()` before create/update operations
- CSV uploads use a dual-index station map (canonical + bare-suffix) for tolerance
- DB inserts use `createMany({ skipDuplicates: true })` for idempotency

## Architecture

- **Framework**: Next.js 16 App Router, Vercel SSR (`output: "standalone"`)
- **Database**: Neon Serverless PostgreSQL + Prisma ORM (project: `spring-glade-34969519`)
- **Auth**: NextAuth v4 Google OAuth, `ADMIN_EMAIL = 'roy.otieno@roam-electric.com'`
- **Theme**: `next-themes` with `forcedTheme="light"` - no `.dark` class on `<html>`
- **CSS**: Tailwind v4, zinc-based light mode palette

## Removed Components
The following components exist in the codebase but are no longer rendered:
- `MilestonesTimeline` (`src/components/dashboard/milestones-timeline.tsx`) - no data source
- `ActivityFeed` (`src/components/dashboard/activity-feed.tsx`) - no data source
Do not re-add these to the homepage without a real data source.
