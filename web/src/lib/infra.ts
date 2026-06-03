export const CURRENT_INFRA_VERSION = 1 as const;

export type InfraStatus =
  | "planned"
  | "in_progress"
  | "live"
  | "paused"
  | "cancelled";

export type MilestoneStatus = "not_started" | "in_progress" | "blocked" | "done";

export const INFRA_STATUS_OPTIONS: readonly { value: InfraStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "live", label: "Live" },
  { value: "paused", label: "Paused" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const MILESTONE_STATUS_OPTIONS: readonly { value: MilestoneStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
] as const;

export const HUB_MILESTONE_KEYS = [
  "site",
  "permitting",
  "civil",
  "electrical",
  "equipment",
  "commissioning",
] as const;
export type HubMilestoneKey = (typeof HUB_MILESTONE_KEYS)[number];

export const HUB_MILESTONES: readonly { key: HubMilestoneKey; label: string }[] = [
  { key: "site", label: "Site readiness" },
  { key: "permitting", label: "Permitting" },
  { key: "civil", label: "Civil works" },
  { key: "electrical", label: "Electrical works" },
  { key: "equipment", label: "Equipment" },
  { key: "commissioning", label: "Commissioning" },
] as const;

export const POINT_MILESTONE_KEYS = [
  "procurement",
  "installation",
  "testing",
  "commissioning",
] as const;
export type PointMilestoneKey = (typeof POINT_MILESTONE_KEYS)[number];

export const POINT_MILESTONES: readonly { key: PointMilestoneKey; label: string }[] = [
  { key: "procurement", label: "Procurement" },
  { key: "installation", label: "Installation" },
  { key: "testing", label: "Testing" },
  { key: "commissioning", label: "Commissioning" },
] as const;

export type HubMilestones = Record<HubMilestoneKey, MilestoneStatus>;
export type PointMilestones = Record<PointMilestoneKey, MilestoneStatus>;

export type Hub = {
  id: string;
  name: string;
  city?: string;
  country?: string;
  address?: string;
  status: InfraStatus;
  milestones: HubMilestones;
  notes?: string;
  updatedAt: string;
};

export type Point = {
  id: string;
  name: string;
  hubId?: string;
  status: InfraStatus;
  connectorCount?: number;
  powerKw?: number;
  milestones: PointMilestones;
  notes?: string;
  updatedAt: string;
};

export type InfraState = {
  version: typeof CURRENT_INFRA_VERSION;
  hubs: Hub[];
  points: Point[];
};

export function nowIso(): string {
  return new Date().toISOString();
}

export function createEmptyHubMilestones(): HubMilestones {
  return {
    site: "not_started",
    permitting: "not_started",
    civil: "not_started",
    electrical: "not_started",
    equipment: "not_started",
    commissioning: "not_started",
  };
}

export function createEmptyPointMilestones(): PointMilestones {
  return {
    procurement: "not_started",
    installation: "not_started",
    testing: "not_started",
    commissioning: "not_started",
  };
}

export function hubProgress(hub: Hub): number {
  const keys = HUB_MILESTONE_KEYS;
  const doneCount = keys.filter((key) => hub.milestones[key] === "done").length;
  return keys.length === 0 ? 0 : doneCount / keys.length;
}

export function pointProgress(point: Point): number {
  const keys = POINT_MILESTONE_KEYS;
  const doneCount = keys.filter((key) => point.milestones[key] === "done").length;
  return keys.length === 0 ? 0 : doneCount / keys.length;
}

export function seedInfraState(): InfraState {
  const timestamp = nowIso();
  return {
    version: CURRENT_INFRA_VERSION,
    hubs: [
      {
        id: "hub-001",
        name: "Roam Hub – Demo",
        city: "Nairobi",
        country: "Kenya",
        status: "planned",
        milestones: createEmptyHubMilestones(),
        notes:
          "Replace this seed data with your real Roam Hub rollout plan (site, permitting, civil, electrical, equipment, commissioning).",
        updatedAt: timestamp,
      },
    ],
    points: [
      {
        id: "point-001",
        name: "Roam Point – Demo",
        hubId: "hub-001",
        status: "planned",
        connectorCount: 2,
        powerKw: 60,
        milestones: createEmptyPointMilestones(),
        notes:
          "Use Roam Points for individual chargers at depots, endpoints, or locations tied to Roam Hubs.",
        updatedAt: timestamp,
      },
    ],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const INFRA_STATUSES: ReadonlySet<string> = new Set([
  "planned",
  "in_progress",
  "live",
  "paused",
  "cancelled",
]);

const MILESTONE_STATUSES: ReadonlySet<string> = new Set([
  "not_started",
  "in_progress",
  "blocked",
  "done",
]);

function isInfraStatus(value: unknown): value is InfraStatus {
  return typeof value === "string" && INFRA_STATUSES.has(value);
}

function isMilestoneStatus(value: unknown): value is MilestoneStatus {
  return typeof value === "string" && MILESTONE_STATUSES.has(value);
}

function hasAllKeys<T extends readonly string[]>(
  value: Record<string, unknown>,
  keys: T,
): value is Record<T[number], unknown> {
  return keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function isHubMilestones(value: unknown): value is HubMilestones {
  if (!isRecord(value) || !hasAllKeys(value, HUB_MILESTONE_KEYS)) return false;
  return HUB_MILESTONE_KEYS.every((key) => isMilestoneStatus(value[key]));
}

function isPointMilestones(value: unknown): value is PointMilestones {
  if (!isRecord(value) || !hasAllKeys(value, POINT_MILESTONE_KEYS)) return false;
  return POINT_MILESTONE_KEYS.every((key) => isMilestoneStatus(value[key]));
}

function isHub(value: unknown): value is Hub {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || typeof value.name !== "string") return false;
  if (typeof value.updatedAt !== "string") return false;
  if (!isInfraStatus(value.status)) return false;
  if (!isHubMilestones(value.milestones)) return false;
  if (value.city !== undefined && typeof value.city !== "string") return false;
  if (value.country !== undefined && typeof value.country !== "string") return false;
  if (value.address !== undefined && typeof value.address !== "string") return false;
  if (value.notes !== undefined && typeof value.notes !== "string") return false;
  return true;
}

function isPoint(value: unknown): value is Point {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || typeof value.name !== "string") return false;
  if (typeof value.updatedAt !== "string") return false;
  if (!isInfraStatus(value.status)) return false;
  if (!isPointMilestones(value.milestones)) return false;
  if (value.hubId !== undefined && typeof value.hubId !== "string") return false;
  if (value.connectorCount !== undefined && typeof value.connectorCount !== "number")
    return false;
  if (value.powerKw !== undefined && typeof value.powerKw !== "number") return false;
  if (value.notes !== undefined && typeof value.notes !== "string") return false;
  return true;
}

export function isInfraState(value: unknown): value is InfraState {
  if (!isRecord(value)) return false;
  if (value.version !== CURRENT_INFRA_VERSION) return false;
  if (!Array.isArray(value.hubs) || !Array.isArray(value.points)) return false;
  return value.hubs.every(isHub) && value.points.every(isPoint);
}
