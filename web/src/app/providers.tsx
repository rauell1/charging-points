"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { HubMilestones, PointMilestones } from "@/lib/infra";
import {
  createEmptyHubMilestones,
  createEmptyPointMilestones,
  isInfraState,
  nowIso,
  seedInfraState,
  type Hub,
  type HubMilestoneKey,
  type InfraState,
  type InfraStatus,
  type MilestoneStatus,
  type Point,
  type PointMilestoneKey,
} from "@/lib/infra";

const STORAGE_KEY = "roam-infra-tracker:v1";

export type UpsertHubInput = {
  id?: string;
  name: string;
  city?: string;
  country?: string;
  address?: string;
  status: InfraStatus;
  milestones?: HubMilestones;
  notes?: string;
  updatedAt?: string;
};

export type UpsertPointInput = {
  id?: string;
  name: string;
  hubId?: string;
  status: InfraStatus;
  connectorCount?: number;
  powerKw?: number;
  milestones?: PointMilestones;
  notes?: string;
  updatedAt?: string;
};

type InfraContextValue = {
  state: InfraState;
  setHubStatus: (hubId: string, status: InfraStatus) => void;
  setHubMilestone: (hubId: string, key: HubMilestoneKey, status: MilestoneStatus) => void;
  upsertHub: (hub: UpsertHubInput) => void;
  removeHub: (hubId: string) => void;
  setPointStatus: (pointId: string, status: InfraStatus) => void;
  setPointMilestone: (
    pointId: string,
    key: PointMilestoneKey,
    status: MilestoneStatus,
  ) => void;
  upsertPoint: (point: UpsertPointInput) => void;
  removePoint: (pointId: string) => void;
  exportJson: () => string;
  importJson: (json: string) => { ok: true } | { ok: false; error: string };
  resetToSeed: () => void;
};

const InfraContext = createContext<InfraContextValue | null>(null);

function safeParseJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function loadInitialState(): InfraState {
  if (typeof window === "undefined") return seedInfraState();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedInfraState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  const parsed = safeParseJson(raw);
  if (parsed && isInfraState(parsed)) return parsed;

  const seeded = seedInfraState();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function persist(state: InfraState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function generateId(prefix: string): string {
  if (typeof window !== "undefined" && "crypto" in window && "randomUUID" in window.crypto) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

export function InfraProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<InfraState>(() => loadInitialState());

  const updateState = useCallback((updater: (prev: InfraState) => InfraState) => {
    setState((prev) => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, []);

  const setHubStatus = useCallback(
    (hubId: string, status: InfraStatus) => {
      updateState((prev) => {
        const updatedAt = nowIso();
        return {
          ...prev,
          hubs: prev.hubs.map((hub) =>
            hub.id === hubId ? { ...hub, status, updatedAt } : hub,
          ),
        };
      });
    },
    [updateState],
  );

  const setHubMilestone = useCallback(
    (hubId: string, key: HubMilestoneKey, status: MilestoneStatus) => {
      updateState((prev) => {
        const updatedAt = nowIso();
        return {
          ...prev,
          hubs: prev.hubs.map((hub) =>
            hub.id === hubId
              ? { ...hub, milestones: { ...hub.milestones, [key]: status }, updatedAt }
              : hub,
          ),
        };
      });
    },
    [updateState],
  );

  const upsertHub = useCallback(
    (hub: UpsertHubInput) => {
      updateState((prev) => {
        const updatedAt = hub.updatedAt ?? nowIso();
        const nextHub: Hub = {
          id: hub.id ?? generateId("hub"),
          name: hub.name,
          city: hub.city,
          country: hub.country,
          address: hub.address,
          status: hub.status,
          milestones: hub.milestones ?? createEmptyHubMilestones(),
          notes: hub.notes,
          updatedAt,
        };

        const existingIndex = prev.hubs.findIndex((h) => h.id === nextHub.id);
        const hubs =
          existingIndex === -1
            ? [nextHub, ...prev.hubs]
            : prev.hubs.map((h) => (h.id === nextHub.id ? nextHub : h));

        return { ...prev, hubs };
      });
    },
    [updateState],
  );

  const removeHub = useCallback(
    (hubId: string) => {
      updateState((prev) => ({
        ...prev,
        hubs: prev.hubs.filter((hub) => hub.id !== hubId),
        points: prev.points.map((p) => (p.hubId === hubId ? { ...p, hubId: undefined } : p)),
      }));
    },
    [updateState],
  );

  const setPointStatus = useCallback(
    (pointId: string, status: InfraStatus) => {
      updateState((prev) => {
        const updatedAt = nowIso();
        return {
          ...prev,
          points: prev.points.map((point) =>
            point.id === pointId ? { ...point, status, updatedAt } : point,
          ),
        };
      });
    },
    [updateState],
  );

  const setPointMilestone = useCallback(
    (pointId: string, key: PointMilestoneKey, status: MilestoneStatus) => {
      updateState((prev) => {
        const updatedAt = nowIso();
        return {
          ...prev,
          points: prev.points.map((point) =>
            point.id === pointId
              ? { ...point, milestones: { ...point.milestones, [key]: status }, updatedAt }
              : point,
          ),
        };
      });
    },
    [updateState],
  );

  const upsertPoint = useCallback(
    (point: UpsertPointInput) => {
      updateState((prev) => {
        const updatedAt = point.updatedAt ?? nowIso();
        const nextPoint: Point = {
          id: point.id ?? generateId("point"),
          name: point.name,
          hubId: point.hubId,
          status: point.status,
          connectorCount: point.connectorCount,
          powerKw: point.powerKw,
          milestones: point.milestones ?? createEmptyPointMilestones(),
          notes: point.notes,
          updatedAt,
        };

        const existingIndex = prev.points.findIndex((p) => p.id === nextPoint.id);
        const points =
          existingIndex === -1
            ? [nextPoint, ...prev.points]
            : prev.points.map((p) => (p.id === nextPoint.id ? nextPoint : p));

        return { ...prev, points };
      });
    },
    [updateState],
  );

  const removePoint = useCallback(
    (pointId: string) => {
      updateState((prev) => ({ ...prev, points: prev.points.filter((p) => p.id !== pointId) }));
    },
    [updateState],
  );

  const exportJson = useCallback(() => JSON.stringify(state, null, 2), [state]);

  const importJson = useCallback(
    (json: string) => {
      const parsed = safeParseJson(json);
      if (!parsed) return { ok: false as const, error: "Invalid JSON." };
      if (!isInfraState(parsed))
        return {
          ok: false as const,
          error:
            "JSON schema mismatch. Expecting { version: 1, hubs: Hub[], points: Point[] } with valid statuses and milestones.",
        };

      if (typeof window === "undefined") return { ok: false as const, error: "Not available." };

      setState(parsed);
      persist(parsed);
      return { ok: true as const };
    },
    [setState],
  );

  const resetToSeed = useCallback(() => {
    updateState(() => seedInfraState());
  }, [updateState]);

  const value = useMemo<InfraContextValue>(
    () => ({
      state,
      setHubStatus,
      setHubMilestone,
      upsertHub,
      removeHub,
      setPointStatus,
      setPointMilestone,
      upsertPoint,
      removePoint,
      exportJson,
      importJson,
      resetToSeed,
    }),
    [
      exportJson,
      importJson,
      removeHub,
      removePoint,
      resetToSeed,
      setHubMilestone,
      setHubStatus,
      setPointMilestone,
      setPointStatus,
      state,
      upsertHub,
      upsertPoint,
    ],
  );

  return <InfraContext.Provider value={value}>{children}</InfraContext.Provider>;
}

export function useInfra(): InfraContextValue {
  const ctx = useContext(InfraContext);
  if (!ctx) throw new Error("useInfra must be used inside <InfraProvider />.");
  return ctx;
}
