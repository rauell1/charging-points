'use client';

import { useState, useEffect, useCallback } from 'react';
import { signOut, useSession } from 'next-auth/react';
import {
  Shield, LogOut, RefreshCw, CheckCircle2,
  ChevronDown, AlertTriangle, Sparkles, Activity, RotateCcw,
  Radio, MapPin, Building2, X, Target, Pencil, History,
  Check, Minus, Phone, User, ChevronRight, Save, Search,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminStation {
  id: string;
  chargerId: string;
  name: string;
  type: 'hub' | 'point' | 'kiosk';
  status: string;
  address: string;
  neighborhood: string;
  launchDate: string | null;
  partner: string | null;
  siteManager: string | null;
  managerPhone: string | null;
  notes: string | null;
  chargerCount: number;
  totalKw: number;
  latitude: number | null;
  longitude: number | null;
  connectorType: string | null;
  operatingHours: string | null;
  statusOverride: string | null;
  statusOverrideBy: string | null;
  statusOverrideAt: string | null;
  statusOverrideNote: string | null;
  hasOverride: boolean;
  overrideInfo: string | null;
}

interface PipelineSite {
  id: string;
  siteId: string;
  landmark: string;
  neighborhood: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  estimatedPoints: number;
  electricityAccess: string;
  landlordType: string;
  bikeTraffic: string;
  securityLevel: string;
  priorityScore: number;
  priorityBucket: string;
  status: string;
  agentName: string | null;
  agentType: string | null;
  partnerName: string | null;
  partnerPhone: string | null;
  partnerEmail: string | null;
  mountType: string | null;
  deploymentPhase: string | null;
  deploymentCost: number | null;
  monthlyRent: number | null;
  comment: string;
  checklist: { agreement: string; consent: string; titleDeed: string; rentAgreed: string };
  matchedStation: { id: string; chargerId: string; name: string; status: string; type: string } | null;
}

interface SyncLogEntry {
  id: string;
  source: string;
  status: string;
  created: number;
  updated: number;
  unchanged: number;
  errors: number;
  details: string | null;
  fileName: string | null;
  triggerBy: string | null;
  durationMs: number;
  createdAt: string;
}

interface SyncHistoryResponse {
  logs: SyncLogEntry[];
  summary: {
    totalSyncs: number;
    totalSuccess: number;
    totalPartial: number;
    totalErrors: number;
    totalCreated: number;
    totalUpdated: number;
    totalErrorCount: number;
  };
}

type StationTab = 'hub' | 'point' | 'kiosk';
type AdminTab = StationTab | 'pipeline' | 'edit' | 'synclog';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  operational: { label: 'Operational', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  construction: { label: 'Construction', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
  planned:      { label: 'Planned',      color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   dot: 'bg-blue-400'   },
  blocked:      { label: 'Blocked',      color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',     dot: 'bg-red-400'    },
  archived:     { label: 'Archived',     color: 'text-zinc-500',   bg: 'bg-zinc-500/10 border-zinc-500/20',   dot: 'bg-zinc-500'   },
};

const PIPELINE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  new:      { label: 'New',      color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',     dot: 'bg-blue-400'    },
  approved: { label: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  on_hold:  { label: 'On Hold',  color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',   dot: 'bg-amber-400'   },
  rejected: { label: 'Rejected', color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',       dot: 'bg-red-400'     },
  deployed: { label: 'Deployed', color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/20', dot: 'bg-purple-400'  },
};

const SYNC_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  success: { label: 'Success', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  partial: { label: 'Partial', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',    dot: 'bg-amber-400'   },
  error:   { label: 'Error',   color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',        dot: 'bg-red-400'     },
};

const TYPE_CONFIG = {
  hub:   { label: 'Roam Hubs',   icon: Building2, color: 'text-[#E8621A]',  accent: 'border-[#E8621A]/40 bg-[#E8621A]/10'   },
  point: { label: 'Roam Points', icon: Radio,     color: 'text-violet-400', accent: 'border-violet-400/40 bg-violet-400/10' },
  kiosk: { label: 'Kiosks',      icon: MapPin,    color: 'text-cyan-400',   accent: 'border-cyan-400/40 bg-cyan-400/10'     },
};

const OVERRIDE_OPTIONS = ['operational', 'construction', 'planned', 'blocked'];
const PIPELINE_ACTIONS = ['approved', 'on_hold', 'rejected', 'new', 'deployed'];

// ─── Shared Components ────────────────────────────────────────────────────────

function StatusBadge({ status, hasOverride }: { status: string; hasOverride?: boolean }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.planned;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${cfg.color} ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
      {hasOverride && <Sparkles className="w-2.5 h-2.5 text-[#E8621A]" />}
    </span>
  );
}

// ─── Station Control: Override Dropdown ───────────────────────────────────────

function OverrideDropdown({ station, onUpdate }: {
  station: AdminStation;
  onUpdate: (id: string, status: string | null, note?: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const handleSelect = (s: string) => { setPendingStatus(s); setShowConfirm(true); setOpen(false); };
  const handleConfirm = async () => {
    setLoading(true);
    await onUpdate(station.id, pendingStatus, note || undefined);
    setLoading(false); setShowConfirm(false); setNote(''); setPendingStatus(null);
  };
  const handleClear = async () => { setLoading(true); await onUpdate(station.id, null); setLoading(false); };

  return (
    <div className="relative flex items-center justify-end gap-1">
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#161616] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-white font-bold text-sm">Set Status Override</h3>
                <p className="text-white/40 text-xs mt-0.5 truncate max-w-[220px]">{station.name}</p>
              </div>
              <button onClick={() => { setShowConfirm(false); setPendingStatus(null); }} className="text-white/30 hover:text-white/60">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-4 p-2 bg-white/5 rounded-xl border border-white/5">
              <StatusBadge status={station.status} />
              <span className="text-white/30 text-xs">→</span>
              <StatusBadge status={pendingStatus!} />
            </div>
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-xs placeholder:text-white/25 resize-none focus:outline-none focus:border-[#E8621A]/40 mb-3"
              rows={2}
              placeholder="Optional note (e.g. 'Closed for maintenance')"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowConfirm(false); setPendingStatus(null); setNote(''); }}
                className="flex-1 py-2 rounded-xl border border-white/10 text-white/50 text-xs hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirm} disabled={loading}
                className="flex-1 py-2 rounded-xl bg-[#E8621A] text-white text-xs font-semibold hover:bg-[#d4571a] transition-colors disabled:opacity-50">
                {loading ? 'Applying…' : 'Apply Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {station.hasOverride && (
        <button onClick={handleClear} disabled={loading} title="Clear override — revert to smart sync"
          className="p-1.5 rounded-lg border border-white/10 text-white/30 hover:text-[#E8621A] hover:border-[#E8621A]/30 transition-all">
          <RotateCcw className="w-3 h-3" />
        </button>
      )}

      <button onClick={() => setOpen(!open)} disabled={loading}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/60 text-xs hover:bg-white/10 hover:border-white/20 transition-all">
        {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
        Set
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-40 w-40 bg-[#1c1c1c] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            {OVERRIDE_OPTIONS.map(s => {
              const cfg = STATUS_CONFIG[s];
              return (
                <button key={s} onClick={() => handleSelect(s)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-white/5 ${cfg.color} ${station.status === s ? 'bg-white/5' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
                  {cfg.label}
                  {station.status === s && <span className="ml-auto text-[10px] text-white/20">now</span>}
                </button>
              );
            })}
            {station.hasOverride && (
              <>
                <div className="border-t border-white/5 my-0.5" />
                <button onClick={() => { handleClear(); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/40 hover:bg-white/5 transition-colors">
                  <RotateCcw className="w-3 h-3 flex-shrink-0" />
                  Clear override
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Station Control: Table ───────────────────────────────────────────────────

function StationTable({ stations, onUpdate }: {
  stations: AdminStation[];
  onUpdate: (id: string, status: string | null, note?: string) => Promise<void>;
}) {
  if (stations.length === 0) {
    return <div className="text-center py-12 text-white/30 text-sm">No stations in this category</div>;
  }
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-white/5">
          <th className="text-left px-3 sm:px-4 py-3 text-white/35 text-[11px] font-medium uppercase tracking-wider">Station</th>
          <th className="text-left px-3 sm:px-4 py-3 text-white/35 text-[11px] font-medium uppercase tracking-wider hidden lg:table-cell">ID</th>
          <th className="text-left px-3 sm:px-4 py-3 text-white/35 text-[11px] font-medium uppercase tracking-wider hidden md:table-cell">Launch</th>
          <th className="text-left px-3 sm:px-4 py-3 text-white/35 text-[11px] font-medium uppercase tracking-wider hidden sm:table-cell">Chargers</th>
          <th className="text-left px-3 sm:px-4 py-3 text-white/35 text-[11px] font-medium uppercase tracking-wider">Status</th>
          <th className="text-right px-3 sm:px-4 py-3 text-white/35 text-[11px] font-medium uppercase tracking-wider">Override</th>
        </tr>
      </thead>
      <tbody>
        {stations.map(station => (
          <tr key={station.id}
            className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${station.hasOverride ? 'bg-[#E8621A]/[0.015]' : ''}`}>
            <td className="px-3 sm:px-4 py-3">
              <p className="text-white text-sm font-medium leading-tight">{station.name}</p>
              <p className="text-white/35 text-xs mt-0.5">{station.neighborhood}</p>
              {station.hasOverride && station.overrideInfo && (
                <p className="text-[#E8621A]/50 text-[10px] mt-1 flex items-center gap-1">
                  <Sparkles className="w-2 h-2 flex-shrink-0" />
                  <span className="truncate max-w-[200px]">{station.overrideInfo}</span>
                </p>
              )}
            </td>
            <td className="px-3 sm:px-4 py-3 hidden lg:table-cell">
              <code className="text-white/25 text-[11px]">{station.chargerId}</code>
            </td>
            <td className="px-3 sm:px-4 py-3 hidden md:table-cell">
              <span className="text-white/40 text-xs">
                {station.launchDate
                  ? new Date(station.launchDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
                  : <span className="text-white/15">—</span>}
              </span>
            </td>
            <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
              <span className="text-white/40 text-xs">
                {station.chargerCount > 0 ? `${station.chargerCount} · ${station.totalKw.toFixed(1)}kW` : '—'}
              </span>
            </td>
            <td className="px-3 sm:px-4 py-3">
              <StatusBadge status={station.status} hasOverride={station.hasOverride} />
            </td>
            <td className="px-3 sm:px-4 py-3">
              <OverrideDropdown station={station} onUpdate={onUpdate} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Pipeline Tab ─────────────────────────────────────────────────────────────

function CheckItem({ label, value }: { label: string; value: string }) {
  const yes = ['yes', 'true', 'done', 'agreed'].includes(String(value ?? '').toLowerCase());
  return (
    <div className={`flex items-center gap-1 text-[10px] ${yes ? 'text-emerald-400' : 'text-white/25'}`}>
      {yes ? <Check className="w-2.5 h-2.5 flex-shrink-0" /> : <Minus className="w-2.5 h-2.5 flex-shrink-0" />}
      {label}
    </div>
  );
}

function PipelineTab({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [sites, setSites] = useState<PipelineSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchSites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pipeline');
      if (!res.ok) throw new Error('Failed to fetch');
      setSites(await res.json() as PipelineSite[]);
    } catch {
      showToast('Failed to load pipeline sites', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  const handleStatusChange = async (siteId: string, newStatus: string) => {
    setUpdating(siteId);
    try {
      const res = await fetch(`/api/admin/pipeline/${siteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      showToast(data.message ?? 'Status updated');
      await fetchSites();
    } catch (err) {
      showToast(String(err), 'error');
    } finally {
      setUpdating(null);
    }
  };

  const FILTERS = [
    { key: 'all',      label: 'All'      },
    { key: 'new',      label: 'New'      },
    { key: 'approved', label: 'Approved' },
    { key: 'on_hold',  label: 'On Hold'  },
    { key: 'rejected', label: 'Rejected' },
    { key: 'deployed', label: 'Deployed' },
  ] as const;

  const counts: Record<string, number> = {};
  FILTERS.forEach(f => { counts[f.key] = f.key === 'all' ? sites.length : sites.filter(s => s.status === f.key).length; });

  const filtered = filter === 'all' ? sites : sites.filter(s => s.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2">
        <RefreshCw className="w-4 h-4 text-[#E8621A] animate-spin" />
        <span className="text-white/40 text-sm">Loading pipeline sites…</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => {
            const psCfg = PIPELINE_STATUS_CONFIG[f.key];
            const isActive = filter === f.key;
            return (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-all ${
                  isActive
                    ? f.key === 'all'
                      ? 'bg-white/15 text-white border-white/20'
                      : `${psCfg.bg} ${psCfg.color}`
                    : 'bg-white/[0.03] border-white/5 text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
                }`}>
                {f.key !== 'all' && psCfg && <span className={`w-1.5 h-1.5 rounded-full ${psCfg.dot}`} />}
                {f.label}
                <span className={`text-[10px] font-bold ${isActive ? 'opacity-70' : 'text-white/20'}`}>
                  {counts[f.key]}
                </span>
              </button>
            );
          })}
        </div>
        <button onClick={fetchSites}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-white/50 text-xs hover:bg-white/5 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-white/30 text-sm">No sites in this category</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map(site => {
            const psCfg = PIPELINE_STATUS_CONFIG[site.status] ?? PIPELINE_STATUS_CONFIG.new;
            return (
              <div key={site.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold text-sm leading-tight truncate">{site.landmark}</h3>
                    <p className="text-white/40 text-xs mt-0.5">{site.neighborhood} · {site.city}</p>
                    <code className="text-white/20 text-[10px]">{site.siteId}</code>
                  </div>
                  <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${psCfg.color} ${psCfg.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${psCfg.dot}`} />
                    {psCfg.label}
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-white/[0.03] rounded-xl p-2">
                    <p className="text-[10px] text-white/30 mb-0.5">Est. Points</p>
                    <p className="text-white font-bold text-sm">{site.estimatedPoints}</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-2">
                    <p className="text-[10px] text-white/30 mb-0.5">Priority</p>
                    <p className="text-[#E8621A] font-bold text-sm">{site.priorityScore.toFixed(1)}</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-2">
                    <p className="text-[10px] text-white/30 mb-0.5">Bucket</p>
                    <p className="text-white font-medium text-[11px] leading-tight truncate">{site.priorityBucket || '—'}</p>
                  </div>
                </div>

                {/* Site details */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-3">
                  {[
                    { label: 'Electricity', value: site.electricityAccess },
                    { label: 'Landlord',    value: site.landlordType      },
                    { label: 'Bike Traffic',value: site.bikeTraffic       },
                    { label: 'Security',    value: site.securityLevel     },
                  ].map(d => (
                    <div key={d.label} className="flex items-center gap-1 text-[11px]">
                      <span className="text-white/25 flex-shrink-0">{d.label}:</span>
                      <span className="text-white/55 truncate">{d.value || '—'}</span>
                    </div>
                  ))}
                </div>

                {/* Agent / partner */}
                {(site.agentName || site.partnerName || site.partnerPhone) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
                    {site.agentName && (
                      <span className="flex items-center gap-1 text-[11px] text-white/40">
                        <User className="w-3 h-3 flex-shrink-0" />{site.agentName}
                      </span>
                    )}
                    {site.partnerName && (
                      <span className="flex items-center gap-1 text-[11px] text-white/40">
                        <Building2 className="w-3 h-3 flex-shrink-0" />{site.partnerName}
                      </span>
                    )}
                    {site.partnerPhone && (
                      <span className="flex items-center gap-1 text-[11px] text-white/40">
                        <Phone className="w-3 h-3 flex-shrink-0" />{site.partnerPhone}
                      </span>
                    )}
                  </div>
                )}

                {/* Agent checklist */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 px-2.5 py-2 bg-white/[0.02] rounded-xl border border-white/5">
                  <CheckItem label="Agreement"  value={site.checklist.agreement}  />
                  <CheckItem label="Consent"    value={site.checklist.consent}    />
                  <CheckItem label="Title Deed" value={site.checklist.titleDeed}  />
                  <CheckItem label="Rent"       value={site.checklist.rentAgreed} />
                </div>

                {/* Matched station */}
                {site.matchedStation && (
                  <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 bg-emerald-500/[0.05] border border-emerald-500/10 rounded-xl text-[11px] text-emerald-400">
                    <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                    Matched: {site.matchedStation.name} ·{' '}
                    <code className="text-emerald-400/70 text-[10px]">{site.matchedStation.chargerId}</code>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/[0.04]">
                  <span className="text-white/20 text-[10px] mr-0.5">Move to:</span>
                  {PIPELINE_ACTIONS.filter(a => a !== site.status).map(action => {
                    const aCfg = PIPELINE_STATUS_CONFIG[action];
                    return (
                      <button key={action} onClick={() => handleStatusChange(site.id, action)}
                        disabled={updating === site.id}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-semibold transition-all disabled:opacity-50 hover:opacity-80 ${aCfg.bg} ${aCfg.color}`}>
                        {updating === site.id
                          ? <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          : <span className={`w-1.5 h-1.5 rounded-full ${aCfg.dot}`} />}
                        {aCfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Edit Sites Tab ───────────────────────────────────────────────────────────

const EDITABLE_FIELD_DEFS: Array<{
  key: keyof AdminStation;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
}> = [
  { key: 'name',          label: 'Name',           type: 'text'   },
  { key: 'status',        label: 'Status',         type: 'select', options: ['operational', 'construction', 'planned', 'blocked', 'archived'] },
  { key: 'neighborhood',  label: 'Neighborhood',   type: 'text'   },
  { key: 'address',       label: 'Address',        type: 'text'   },
  { key: 'partner',       label: 'Partner',        type: 'text'   },
  { key: 'siteManager',   label: 'Site Manager',   type: 'text'   },
  { key: 'managerPhone',  label: 'Manager Phone',  type: 'text'   },
  { key: 'connectorType', label: 'Connector Type', type: 'text'   },
  { key: 'chargerCount',  label: 'Charger Count',  type: 'number' },
  { key: 'totalKw',       label: 'Total kW',       type: 'number' },
  { key: 'latitude',      label: 'Latitude',       type: 'number' },
  { key: 'longitude',     label: 'Longitude',      type: 'number' },
];

function EditTab({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [stations, setStations] = useState<AdminStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<AdminStation>>({});
  const [saving, setSaving] = useState(false);

  const fetchStations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stations');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json() as { stations: AdminStation[] };
      setStations(data.stations);
    } catch {
      showToast('Failed to load stations', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchStations(); }, [fetchStations]);

  const handleExpand = (station: AdminStation) => {
    if (expandedId === station.id) { setExpandedId(null); setEditData({}); }
    else { setExpandedId(station.id); setEditData({ ...station }); }
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/stations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      showToast(data.message ?? 'Station updated');
      setExpandedId(null);
      setEditData({});
      await fetchStations();
    } catch (err) {
      showToast(String(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = stations.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.chargerId.toLowerCase().includes(search.toLowerCase()) ||
    s.neighborhood.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2">
        <RefreshCw className="w-4 h-4 text-[#E8621A] animate-spin" />
        <span className="text-white/40 text-sm">Loading stations…</span>
      </div>
    );
  }

  return (
    <div>
      {/* Search bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ID or neighborhood…"
            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-white/30 hover:text-white/60">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button onClick={fetchStations} className="p-2 rounded-xl border border-white/10 text-white/50 hover:bg-white/5 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Station rows */}
      <div className="space-y-1.5">
        {filtered.map(station => {
          const isExpanded = expandedId === station.id;
          const typeCfg = TYPE_CONFIG[station.type];
          const TypeIcon = typeCfg.icon;

          return (
            <div key={station.id} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
              <button onClick={() => handleExpand(station)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left">
                <TypeIcon className={`w-4 h-4 flex-shrink-0 ${typeCfg.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{station.name}</p>
                  <p className="text-white/35 text-xs">
                    {station.neighborhood}
                    {station.partner && <span className="text-white/20"> · {station.partner}</span>}
                    {' · '}<code className="text-white/20 text-[10px]">{station.chargerId}</code>
                  </p>
                </div>
                <StatusBadge status={station.status} hasOverride={station.hasOverride} />
                <ChevronRight className={`w-4 h-4 text-white/20 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {/* Inline edit form */}
              {isExpanded && (
                <div className="border-t border-white/5 px-4 py-4 bg-white/[0.01]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                    {EDITABLE_FIELD_DEFS.map(field => (
                      <div key={String(field.key)}>
                        <label className="block text-[10px] text-white/30 font-semibold mb-1 uppercase tracking-wider">
                          {field.label}
                        </label>
                        {field.type === 'select' ? (
                          <select
                            value={String(editData[field.key] ?? '')}
                            onChange={e => setEditData(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#E8621A]/40">
                            {field.options!.map(opt => (
                              <option key={opt} value={opt} className="bg-[#1c1c1c]">{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type}
                            step={field.type === 'number' ? 'any' : undefined}
                            value={editData[field.key] == null ? '' : String(editData[field.key])}
                            onChange={e => setEditData(prev => ({
                              ...prev,
                              [field.key]: field.type === 'number'
                                ? (e.target.value === '' ? null : Number(e.target.value))
                                : e.target.value,
                            }))}
                            className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-[#E8621A]/40"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Notes full-width */}
                  <div className="mb-4">
                    <label className="block text-[10px] text-white/30 font-semibold mb-1 uppercase tracking-wider">Notes</label>
                    <textarea
                      value={editData.notes ?? ''}
                      onChange={e => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                      className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-[#E8621A]/40 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-white/20 text-[10px]">Saves directly to the database</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setExpandedId(null); setEditData({}); }}
                        className="px-3 py-1.5 rounded-lg border border-white/10 text-white/40 text-xs hover:bg-white/5 transition-colors">
                        Cancel
                      </button>
                      <button onClick={() => handleSave(station.id)} disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E8621A] text-white text-xs font-semibold hover:bg-[#d4571a] transition-colors disabled:opacity-50">
                        {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-white/30 text-sm">No stations match your search</div>
      )}
    </div>
  );
}

// ─── Sync Log Tab ─────────────────────────────────────────────────────────────

function SyncLogTab() {
  const [data, setData] = useState<SyncHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sync/history');
      if (!res.ok) throw new Error('Failed');
      setData(await res.json() as SyncHistoryResponse);
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2">
        <RefreshCw className="w-4 h-4 text-[#E8621A] animate-spin" />
        <span className="text-white/40 text-sm">Loading sync history…</span>
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div>
      {/* Summary stats */}
      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Syncs', value: s.totalSyncs,   color: 'text-white'       },
            { label: 'Successful',  value: s.totalSuccess, color: 'text-emerald-400' },
            { label: 'Partial',     value: s.totalPartial, color: 'text-amber-400'   },
            { label: 'Errors',      value: s.totalErrors,  color: 'text-red-400'     },
          ].map(stat => (
            <div key={stat.label} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
              <p className="text-white/40 text-xs mb-2">{stat.label}</p>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {s && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 px-1 text-xs text-white/40">
          <span><span className="text-emerald-400 font-semibold">{s.totalCreated.toLocaleString()}</span> records created</span>
          <span className="text-white/15">·</span>
          <span><span className="text-blue-400 font-semibold">{s.totalUpdated.toLocaleString()}</span> records updated</span>
          <span className="text-white/15">·</span>
          <span><span className="text-red-400 font-semibold">{s.totalErrorCount.toLocaleString()}</span> errors logged</span>
        </div>
      )}

      {/* Log table */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Recent syncs (last 50)</p>
          <button onClick={fetchLogs}
            className="flex items-center gap-1.5 text-white/35 text-xs hover:text-white/60 transition-colors">
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>

        {!data?.logs?.length ? (
          <div className="text-center py-12 text-white/30 text-sm">No sync history yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-2.5 text-white/30 text-[10px] font-semibold uppercase tracking-wider">Time</th>
                  <th className="text-left px-4 py-2.5 text-white/30 text-[10px] font-semibold uppercase tracking-wider hidden sm:table-cell">File / Source</th>
                  <th className="text-left px-4 py-2.5 text-white/30 text-[10px] font-semibold uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-2.5 text-white/30 text-[10px] font-semibold uppercase tracking-wider hidden md:table-cell">+Created</th>
                  <th className="text-left px-4 py-2.5 text-white/30 text-[10px] font-semibold uppercase tracking-wider hidden md:table-cell">~Updated</th>
                  <th className="text-left px-4 py-2.5 text-white/30 text-[10px] font-semibold uppercase tracking-wider hidden lg:table-cell">Unchanged</th>
                  <th className="text-left px-4 py-2.5 text-white/30 text-[10px] font-semibold uppercase tracking-wider hidden md:table-cell">Errors</th>
                  <th className="text-left px-4 py-2.5 text-white/30 text-[10px] font-semibold uppercase tracking-wider hidden lg:table-cell">Duration</th>
                  <th className="text-left px-4 py-2.5 text-white/30 text-[10px] font-semibold uppercase tracking-wider hidden sm:table-cell">Triggered by</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map(log => {
                  const cfg = SYNC_STATUS_CONFIG[log.status] ?? SYNC_STATUS_CONFIG.success;
                  return (
                    <tr key={log.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white/70 text-xs">
                          {new Date(log.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-white/30 text-[10px]">
                          {new Date(log.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-white/50 text-xs truncate max-w-[160px]">
                          {log.fileName || <span className="text-white/20">no file</span>}
                        </p>
                        <p className="text-white/25 text-[10px]">{log.source}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cfg.color} ${cfg.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`text-xs font-semibold ${log.created > 0 ? 'text-emerald-400' : 'text-white/15'}`}>
                          {log.created > 0 ? `+${log.created}` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`text-xs font-semibold ${log.updated > 0 ? 'text-blue-400' : 'text-white/15'}`}>
                          {log.updated > 0 ? `~${log.updated}` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-white/30 text-xs">{log.unchanged > 0 ? log.unchanged : '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`text-xs font-semibold ${log.errors > 0 ? 'text-red-400' : 'text-white/15'}`}>
                          {log.errors > 0 ? log.errors : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-white/30 text-xs">
                          {log.durationMs > 0 ? `${(log.durationMs / 1000).toFixed(1)}s` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-white/30 text-xs truncate max-w-[100px] block">{log.triggerBy ?? '—'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: session } = useSession();
  const [stations, setStations] = useState<AdminStation[]>([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('hub');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchStations = useCallback(async () => {
    setLoadingStations(true);
    try {
      const res = await fetch('/api/admin/stations');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json() as { stations: AdminStation[] };
      setStations(data.stations);
    } catch {
      showToast('Failed to load station data', 'error');
    } finally {
      setLoadingStations(false);
    }
  }, []);

  useEffect(() => { fetchStations(); }, [fetchStations]);

  const handleOverrideUpdate = async (id: string, status: string | null, note?: string) => {
    try {
      const res = await fetch(`/api/admin/stations/${id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      showToast(data.message ?? 'Updated');
      await fetchStations();
    } catch (err) {
      showToast(String(err), 'error');
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    try {
      const res = await fetch('/api/sync/rescan', { method: 'POST' });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      showToast('Sync triggered');
      setTimeout(fetchStations, 3000);
    } catch (err) {
      showToast(String(err), 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  // Derived station data (only used by station-control tabs)
  const byType = (t: StationTab) => stations.filter(s => s.type === t);
  const hubs   = byType('hub');
  const points = byType('point');
  const kiosks = byType('kiosk');
  const withOverrides = stations.filter(s => s.hasOverride).length;

  const isStationTab = (t: AdminTab): t is StationTab => ['hub', 'point', 'kiosk'].includes(t);
  const stationsByTab = { hub: hubs, point: points, kiosk: kiosks };
  const tabStations = isStationTab(activeTab) ? stationsByTab[activeTab] : [];

  const stationTabs: { key: StationTab; label: string; count: number; opCount: number }[] = [
    { key: 'hub',   label: 'Roam Hubs',   count: hubs.length,   opCount: hubs.filter(s => s.status === 'operational').length   },
    { key: 'point', label: 'Roam Points', count: points.length, opCount: points.filter(s => s.status === 'operational').length },
    { key: 'kiosk', label: 'Kiosks',      count: kiosks.length, opCount: kiosks.filter(s => s.status === 'operational').length },
  ];

  const managementTabs = [
    { key: 'pipeline' as AdminTab, label: 'Site Acquisition', icon: Target  },
    { key: 'edit'     as AdminTab, label: 'Edit Sites',        icon: Pencil  },
    { key: 'synclog'  as AdminTab, label: 'Sync Log',          icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,_#1a0800_0%,_transparent_50%)] pointer-events-none" />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium animate-in slide-in-from-top-2 duration-300 ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="relative border-b border-white/5 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/">
              <img src="/roam-logo-horizontal-orange.png" alt="Roam" className="h-7 w-auto object-contain" />
            </a>
            <div className="flex items-center gap-2 border-l border-white/10 pl-3">
              <div className="flex items-center gap-1 px-2 py-0.5 bg-[#E8621A]/10 border border-[#E8621A]/20 rounded-full">
                <Shield className="w-2.5 h-2.5 text-[#E8621A]" />
                <span className="text-[#E8621A] text-[10px] font-bold uppercase tracking-wider">Admin</span>
              </div>
              <p className="text-white/40 text-xs hidden sm:block">Infrastructure Control Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleSync} disabled={syncLoading}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E8621A]/10 border border-[#E8621A]/20 text-[#E8621A] text-xs font-medium hover:bg-[#E8621A]/20 transition-colors">
              <Activity className={`w-3.5 h-3.5 ${syncLoading ? 'animate-pulse' : ''}`} />
              {syncLoading ? 'Syncing…' : 'Trigger Sync'}
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5">
              {session?.user?.image && (
                <img src={session.user.image} alt="" className="w-5 h-5 rounded-full" />
              )}
              <span className="text-white/50 text-xs">{session?.user?.name ?? session?.user?.email}</span>
            </div>
            <button onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-white/40 text-xs hover:text-white hover:border-white/20 transition-all">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Summary strip — always visible */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Operational',      value: stations.filter(s => s.status === 'operational').length,  color: 'text-emerald-400', dot: 'bg-emerald-400' },
            { label: 'Construction',     value: stations.filter(s => s.status === 'construction').length, color: 'text-amber-400',   dot: 'bg-amber-400'   },
            { label: 'Planned',          value: stations.filter(s => s.status === 'planned').length,      color: 'text-blue-400',    dot: 'bg-blue-400'    },
            { label: 'Overrides Active', value: withOverrides,                                             color: 'text-[#E8621A]',   dot: 'bg-[#E8621A]'  },
          ].map(stat => (
            <div key={stat.label} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`w-2 h-2 rounded-full ${stat.dot}`} />
                <span className="text-white/40 text-xs">{stat.label}</span>
              </div>
              <p className={`text-2xl font-black ${stat.color}`}>{loadingStations ? '—' : stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── Tab navigation ─────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mb-4 bg-white/[0.03] border border-white/5 rounded-2xl p-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

          {/* Station control tabs */}
          {stationTabs.map(tab => {
            const TypeIcon = TYPE_CONFIG[tab.key].icon;
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-shrink-0 ${
                  isActive
                    ? `bg-white/10 ${TYPE_CONFIG[tab.key].color} border ${TYPE_CONFIG[tab.key].accent}`
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}>
                <TypeIcon className="w-3.5 h-3.5" />
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/10' : 'bg-white/5 text-white/30'}`}>
                  {tab.opCount}/{tab.count}
                </span>
              </button>
            );
          })}

          {/* Divider */}
          <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />

          {/* Management tabs */}
          {managementTabs.map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-shrink-0 ${
                  isActive
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}>
                <TabIcon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Station control tab content ─────────────────────────────── */}
        {isStationTab(activeTab) && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h1 className="text-base font-bold text-white">
                  {TYPE_CONFIG[activeTab].label} — {tabStations.filter(s => s.status === 'operational').length} operational
                  {tabStations.filter(s => s.status === 'construction').length > 0 &&
                    `, ${tabStations.filter(s => s.status === 'construction').length} in construction`}
                </h1>
                <p className="text-white/35 text-xs mt-0.5">
                  {activeTab === 'hub'   && 'Smart sync: Operational + past launch date → live. Use override to pin any status.'}
                  {activeTab === 'point' && 'Construction points are deploying sites. Override to mark as operational when chargers go live.'}
                  {activeTab === 'kiosk' && 'Kiosk status is synced from the field database. Override to adjust.'}
                </p>
              </div>
              <button onClick={fetchStations} disabled={loadingStations}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-white/50 text-xs hover:bg-white/5 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingStations ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-x-auto">
              {loadingStations ? (
                <div className="flex items-center justify-center py-16 gap-2">
                  <RefreshCw className="w-4 h-4 text-[#E8621A] animate-spin" />
                  <span className="text-white/40 text-sm">Loading stations…</span>
                </div>
              ) : (
                <StationTable stations={tabStations} onUpdate={handleOverrideUpdate} />
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-white/25">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#E8621A]" /> Orange spark = admin override active
              </span>
              <span className="flex items-center gap-1.5">
                <RotateCcw className="w-3 h-3" /> Revert = clear override, follow smart sync
              </span>
            </div>
          </>
        )}

        {/* ── Pipeline tab content ────────────────────────────────────── */}
        {activeTab === 'pipeline' && (
          <>
            <div className="mb-4">
              <h1 className="text-base font-bold text-white">Site Acquisition Pipeline</h1>
              <p className="text-white/35 text-xs mt-0.5">
                Review prospective sites from the SITES sheet. Approve, hold or reject individual sites.
              </p>
            </div>
            <PipelineTab showToast={showToast} />
          </>
        )}

        {/* ── Edit sites tab content ──────────────────────────────────── */}
        {activeTab === 'edit' && (
          <>
            <div className="mb-4">
              <h1 className="text-base font-bold text-white">Edit Site Details</h1>
              <p className="text-white/35 text-xs mt-0.5">
                Click any station to expand and edit its fields. Changes are saved directly to the database.
              </p>
            </div>
            <EditTab showToast={showToast} />
          </>
        )}

        {/* ── Sync log tab content ────────────────────────────────────── */}
        {activeTab === 'synclog' && (
          <>
            <div className="mb-4">
              <h1 className="text-base font-bold text-white">Sync Log</h1>
              <p className="text-white/35 text-xs mt-0.5">
                History of all database syncs — uploads, rescans and scheduled imports.
              </p>
            </div>
            <SyncLogTab />
          </>
        )}
      </main>
    </div>
  );
}
