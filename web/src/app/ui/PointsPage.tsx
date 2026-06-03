"use client";

import { useMemo, useState } from "react";

import { useInfra, type UpsertPointInput } from "@/app/providers";
import {
  INFRA_STATUS_OPTIONS,
  MILESTONE_STATUS_OPTIONS,
  POINT_MILESTONES,
  pointProgress,
  type InfraStatus,
  type Point,
} from "@/lib/infra";
import Modal from "@/app/ui/Modal";
import { ProgressBar, StatusBadge } from "@/app/ui/infra-ui";

type PointDraft = UpsertPointInput;

function textIncludes(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function PointForm({
  initial,
  hubOptions,
  onCancel,
  onSave,
}: {
  initial: PointDraft;
  hubOptions: readonly { id: string; name: string }[];
  onCancel: () => void;
  onSave: (draft: PointDraft) => void;
}) {
  const [draft, setDraft] = useState<PointDraft>(initial);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.name.trim()) return;
        onSave({ ...draft, name: draft.name.trim() });
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Name</span>
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            className="h-10 rounded-xl border border-black/10 bg-background px-3 text-sm outline-none focus:border-brand dark:border-white/10"
            placeholder="Roam Point – Depot charger"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Status</span>
          <select
            value={draft.status}
            onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as InfraStatus }))}
            className="h-10 rounded-xl border border-black/10 bg-background px-3 text-sm outline-none focus:border-brand dark:border-white/10"
          >
            {INFRA_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Roam Hub</span>
          <select
            value={draft.hubId ?? ""}
            onChange={(e) =>
              setDraft((d) => ({ ...d, hubId: e.target.value || undefined }))
            }
            className="h-10 rounded-xl border border-black/10 bg-background px-3 text-sm outline-none focus:border-brand dark:border-white/10"
          >
            <option value="">Unassigned</option>
            {hubOptions.map((hub) => (
              <option key={hub.id} value={hub.id}>
                {hub.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Connector count</span>
          <input
            value={typeof draft.connectorCount === "number" ? String(draft.connectorCount) : ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                connectorCount: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            inputMode="numeric"
            className="h-10 rounded-xl border border-black/10 bg-background px-3 text-sm outline-none focus:border-brand dark:border-white/10"
            placeholder="e.g. 2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Power (kW)</span>
          <input
            value={typeof draft.powerKw === "number" ? String(draft.powerKw) : ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                powerKw: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            inputMode="numeric"
            className="h-10 rounded-xl border border-black/10 bg-background px-3 text-sm outline-none focus:border-brand dark:border-white/10"
            placeholder="e.g. 60"
          />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Notes</span>
          <textarea
            value={draft.notes ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value || undefined }))}
            className="min-h-[84px] rounded-xl border border-black/10 bg-background px-3 py-2 text-sm outline-none focus:border-brand dark:border-white/10"
            placeholder="Optional notes for installation, ops, commissioning, etc."
          />
        </label>
      </div>

      <div className="rounded-2xl bg-muted/40 p-3">
        <div className="text-xs font-semibold">Milestones</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {POINT_MILESTONES.map((m) => (
            <label key={m.key} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
              <select
                value={draft.milestones?.[m.key] ?? "not_started"}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    milestones: {
                      ...(d.milestones ?? ({} as Point["milestones"])),
                      [m.key]: e.target.value,
                    } as Point["milestones"],
                  }))
                }
                className="h-10 rounded-xl border border-black/10 bg-background px-3 text-sm outline-none focus:border-brand dark:border-white/10"
              >
                {MILESTONE_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-full border border-black/10 bg-background px-4 text-sm hover:bg-muted dark:border-white/10"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="h-10 rounded-full bg-brand px-4 text-sm font-semibold text-white hover:opacity-95"
        >
          Save
        </button>
      </div>
    </form>
  );
}

export default function PointsPage() {
  const { state, upsertPoint, removePoint, setPointStatus } = useInfra();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<InfraStatus | "all">("all");
  const [hubFilter, setHubFilter] = useState<string | "all">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Point | null>(null);

  const hubOptions = useMemo(
    () => state.hubs.map((h) => ({ id: h.id, name: h.name })),
    [state.hubs],
  );
  const hubNameById = useMemo(() => new Map(hubOptions.map((h) => [h.id, h.name])), [hubOptions]);

  const points = useMemo(() => {
    const base = [...state.points].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return base.filter((point) => {
      if (status !== "all" && point.status !== status) return false;
      if (hubFilter !== "all" && (point.hubId ?? "") !== hubFilter) return false;
      if (!query.trim()) return true;
      const q = query.trim();
      return (
        textIncludes(point.name, q) ||
        (point.hubId ? textIncludes(hubNameById.get(point.hubId) ?? "", q) : false) ||
        (point.notes ? textIncludes(point.notes, q) : false)
      );
    });
  }, [hubFilter, hubNameById, query, state.points, status]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Roam Points</h1>
        <p className="text-sm text-muted-foreground">
          Track individual chargers. Assign points to hubs, update status, and manage delivery
          milestones.
        </p>
      </div>

      <section className="rounded-2xl border border-black/5 bg-card p-4 dark:border-white/10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Search</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 rounded-xl border border-black/10 bg-background px-3 text-sm outline-none focus:border-brand dark:border-white/10"
                placeholder="Name, hub, notes…"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as InfraStatus | "all")}
                className="h-10 rounded-xl border border-black/10 bg-background px-3 text-sm outline-none focus:border-brand dark:border-white/10"
              >
                <option value="all">All</option>
                {INFRA_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Hub</span>
              <select
                value={hubFilter}
                onChange={(e) => setHubFilter(e.target.value as string | "all")}
                className="h-10 rounded-xl border border-black/10 bg-background px-3 text-sm outline-none focus:border-brand dark:border-white/10"
              >
                <option value="all">All</option>
                <option value="">Unassigned</option>
                {hubOptions.map((hub) => (
                  <option key={hub.id} value={hub.id}>
                    {hub.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            className="h-10 rounded-full bg-brand px-4 text-sm font-semibold text-white hover:opacity-95"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Add Roam Point
          </button>
        </div>

        <div className="mt-4 divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/5 dark:divide-white/10 dark:border-white/10">
          {points.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No points match your filters.
            </div>
          ) : (
            points.map((point) => (
              <div key={point.id} className="bg-background p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-sm font-semibold">{point.name}</div>
                      <StatusBadge status={point.status} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {[
                        point.hubId ? hubNameById.get(point.hubId) ?? point.hubId : "Unassigned",
                        typeof point.powerKw === "number" ? `${point.powerKw} kW` : undefined,
                        typeof point.connectorCount === "number"
                          ? `${point.connectorCount} connectors`
                          : undefined,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                    {point.notes ? (
                      <div className="mt-1 text-xs text-muted-foreground">{point.notes}</div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <select
                      value={point.status}
                      onChange={(e) => setPointStatus(point.id, e.target.value as InfraStatus)}
                      className="h-9 rounded-full border border-black/10 bg-background px-3 text-xs outline-none focus:border-brand dark:border-white/10"
                      aria-label={`Set status for ${point.name}`}
                    >
                      {INFRA_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="h-9 rounded-full border border-black/10 bg-background px-3 text-xs hover:bg-muted dark:border-white/10"
                      onClick={() => {
                        setEditing(point);
                        setModalOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="h-9 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 text-xs text-rose-700 hover:bg-rose-500/15 dark:text-rose-300"
                      onClick={() => {
                        if (confirm(`Delete “${point.name}”?`)) removePoint(point.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar value={pointProgress(point)} />
                  <div className="w-10 text-right text-xs text-muted-foreground">
                    {(pointProgress(point) * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  Updated: {new Date(point.updatedAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <Modal
        open={modalOpen}
        title={editing ? "Edit Roam Point" : "Add Roam Point"}
        onClose={() => setModalOpen(false)}
      >
        <PointForm
          hubOptions={hubOptions}
          initial={
            editing
              ? {
                  id: editing.id,
                  name: editing.name,
                  hubId: editing.hubId,
                  status: editing.status,
                  connectorCount: editing.connectorCount,
                  powerKw: editing.powerKw,
                  milestones: editing.milestones,
                  notes: editing.notes,
                }
              : { name: "", status: "planned" }
          }
          onCancel={() => setModalOpen(false)}
          onSave={(draft) => {
            upsertPoint(draft);
            setModalOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}

