# Optimization Checklist

- `[x]` Define weekly cron in vercel.json
- `[x]` Update default config schedule to weekly in config/route.ts
- `[x]` Create and export pruneSyncLogs in src/lib/sync-helper.ts
- `[x]` Accept GET requests and call pruneSyncLogs in src/app/api/sync/rescan/route.ts
- `[x]` Call pruneSyncLogs in upload/route.ts, data/route.ts, and webhook/route.ts
- `[x]` Add "weekly" Select option and fix state sync in src/components/dashboard/sync-dialog.tsx
- `[x]` Verify with linting and build
