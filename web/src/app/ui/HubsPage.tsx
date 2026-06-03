"use client";

import { useMemo, useState } from "react";

import { useInfra, type UpsertHubInput } from "@/app/providers";
import {
  HUB_MILESTONES,
  INFRA_STATUS_OPTIONS,
  MILESTONE_STATUS_OPTIONS,
  hubProgress,
  type Hub,
  type InfraStatus,
} from "@/lib/infra";
import Modal from "@/app/ui/Modal";
import { ProgressBar, StatusBadge } from "@/app/ui/infra-ui";

type HubDraft = UpsertHubInput;

function formatLocation(hub: Pick<Hub, "city" | "country">): string {
  return [hub.city, hub.country].filter(Boolean).join(", ");
}

function textIncludes(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function HubForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: HubDraft;
  onCancel: () => void;
  onSave: (draft: HubDraft) => void;
}) {
  const [draft, setDraft] = useState<HubDraft>(initial);

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
            placeholder="Roam Hub – Westlands"
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
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">City</span>
          <input
            value={draft.city ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value || undefined }))}
            className="h-10 rounded-xl border border-black/10 bg-background px-3 text-sm outline-none focus:border-brand dark:border-white/10"
            placeholder="Nairobi"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Country</span>
          <input
            value={draft.country ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value || undefined }))}
            className="h-10 rounded-xl border border-black/10 bg-background px-3 text-sm outline-none focus:border-brand dark:border-white/10"
            placeholder="Kenya"
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Address</span>
          <input
            value={draft.address ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value || undefined }))}
            className="h-10 rounded-xl border border-black/10 bg-background px-3 text-sm outline-none focus:border-brand dark:border-white/10"
            placeholder="Street / landmark (optional)"
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Notes</span>
          <textarea
            value={draft.notes ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value || undefined }))}
            className="min-h-[84px] rounded-xl border border-black/10 bg-background px-3 py-2 text-sm outline-none focus:border-brand dark:border-white/10"
            placeholder="Optional notes for delivery, blockers, partners, etc."
          />
        </label>
      </div>

      <div className="rounded-2xl bg-muted/40 p-3">
        <div className="text-xs font-semibold">Milestones</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {HUB_MILESTONES.map((m) => (
            <label key={m.key} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
              <select
                value={draft.milestones?.[m.key] ?? "not_started"}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    milestones: {
                      ...(d.milestones ?? ({} as Hub["milestones"])),
                      [m.key]: e.target.value,
                    } as Hub["milestones"],
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

export default function HubsPage() {
  const { state, upsertHub, removeHub, setHubStatus } = useInfra();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<InfraStatus | "all">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Hub | null>(null);

  const hubs = useMemo(() => {
    const base = [...state.hubs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return base.filter((hub) => {
      if (status !== "all" && hub.status !== status) return false;
      if (!query.trim()) return true;
      const q = query.trim();
      return (
        textIncludes(hub.name, q) ||
        textIncludes(formatLocation(hub), q) ||
        (hub.address ? textIncludes(hub.address, q) : false)
      );
    });
  }, [query, state.hubs, status]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Roam Hubs</h1>
        <p className="text-sm text-muted-foreground">
          Track hub-level delivery (site readiness → commissioning). Create hubs, update status,
          and manage milestones.
        </p>
      </div>

      <section className="rounded-2xl border border-black/5 bg-card p-4 dark:border-white/10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Search</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 rounded-xl border border-black/10 bg-background px-3 text-sm outline-none focus:border-brand dark:border-white/10"
                placeholder="Name, city, country…"
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
          </div>

          <button
            type="button"
            className="h-10 rounded-full bg-brand px-4 text-sm font-semibold text-white hover:opacity-95"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Add Roam Hub
          </button>
        </div>

        <div className="mt-4 divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/5 dark:divide-white/10 dark:border-white/10">
          {hubs.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No hubs match your filters.</div>
          ) : (
            hubs.map((hub) => (
              <div key={hub.id} className="bg-background p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-sm font-semibold">{hub.name}</div>
                      <StatusBadge status={hub.status} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatLocation(hub) || "—"}
                    </div>
                    {hub.address ? (
                      <div className="mt-1 text-xs text-muted-foreground">{hub.address}</div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <select
                      value={hub.status}
                      onChange={(e) => setHubStatus(hub.id, e.target.value as InfraStatus)}
                      className="h-9 rounded-full border border-black/10 bg-background px-3 text-xs outline-none focus:border-brand dark:border-white/10"
                      aria-label={`Set status for ${hub.name}`}
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
                        setEditing(hub);
                        setModalOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="h-9 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 text-xs text-rose-700 hover:bg-rose-500/15 dark:text-rose-300"
                      onClick={() => {
                        if (confirm(`Delete “${hub.name}”?`)) removeHub(hub.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar value={hubProgress(hub)} />
                  <div className="w-10 text-right text-xs text-muted-foreground">
                    {(hubProgress(hub) * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  Updated: {new Date(hub.updatedAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <Modal
        open={modalOpen}
        title={editing ? "Edit Roam Hub" : "Add Roam Hub"}
        onClose={() => setModalOpen(false)}
      >
        <HubForm
          initial={
            editing
              ? {
                  id: editing.id,
                  name: editing.name,
                  city: editing.city,
                  country: editing.country,
                  address: editing.address,
                  status: editing.status,
                  milestones: editing.milestones,
                  notes: editing.notes,
                }
              : { name: "", status: "planned" }
          }
          onCancel={() => setModalOpen(false)}
          onSave={(draft) => {
            upsertHub(draft);
            setModalOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}

