"use client";

import Link from "next/link";

import { useInfra } from "@/app/providers";
import { hubProgress, pointProgress } from "@/lib/infra";
import { ProgressBar, StatusBadge } from "@/app/ui/infra-ui";

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const card = (
    <div className="rounded-2xl border border-black/5 bg-card p-4 dark:border-white/10">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );

  if (!href) return card;
  return (
    <Link href={href} className="block transition-transform hover:-translate-y-0.5">
      {card}
    </Link>
  );
}

export default function Dashboard() {
  const { state } = useInfra();
  const hubs = state.hubs;
  const points = state.points;

  const liveHubs = hubs.filter((h) => h.status === "live").length;
  const inProgressHubs = hubs.filter((h) => h.status === "in_progress").length;
  const plannedHubs = hubs.filter((h) => h.status === "planned").length;

  const livePoints = points.filter((p) => p.status === "live").length;
  const inProgressPoints = points.filter((p) => p.status === "in_progress").length;

  const hubRows = [...hubs]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8);

  const pointRows = [...points]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Progress dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Track delivery progress for Roam Hubs (sites) and Roam Points (individual
          charging points). Data is stored in your browser.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Roam Hubs" value={`${hubs.length}`} href="/hubs" />
        <StatCard label="Hubs live" value={`${liveHubs}`} href="/hubs" />
        <StatCard label="Hubs in progress" value={`${inProgressHubs}`} href="/hubs" />
        <StatCard label="Hubs planned" value={`${plannedHubs}`} href="/hubs" />
        <StatCard label="Roam Points" value={`${points.length}`} href="/points" />
        <StatCard label="Points live" value={`${livePoints}`} href="/points" />
        <StatCard label="Points in progress" value={`${inProgressPoints}`} href="/points" />
        <StatCard label="Export / import" value="Settings" href="/settings" />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/5 bg-card p-4 dark:border-white/10">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold">Recently updated hubs</h2>
            <Link href="/hubs" className="text-sm text-brand hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {hubRows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No hubs yet.</div>
            ) : (
              hubRows.map((hub) => (
                <div key={hub.id} className="rounded-xl bg-muted/40 p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{hub.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[hub.city, hub.country].filter(Boolean).join(", ")}
                      </div>
                    </div>
                    <StatusBadge status={hub.status} />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={hubProgress(hub)} />
                    <div className="w-10 text-right text-xs text-muted-foreground">
                      {(hubProgress(hub) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-black/5 bg-card p-4 dark:border-white/10">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold">Recently updated points</h2>
            <Link href="/points" className="text-sm text-brand hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {pointRows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No points yet.</div>
            ) : (
              pointRows.map((point) => (
                <div key={point.id} className="rounded-xl bg-muted/40 p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{point.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[
                          point.hubId ? `Hub: ${point.hubId}` : undefined,
                          typeof point.powerKw === "number" ? `${point.powerKw} kW` : undefined,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                    </div>
                    <StatusBadge status={point.status} />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={pointProgress(point)} />
                    <div className="w-10 text-right text-xs text-muted-foreground">
                      {(pointProgress(point) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

