'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { signOut, useSession } from 'next-auth/react';
import {
  Shield, LogOut, RefreshCw, CheckCircle2,
  ChevronDown, AlertTriangle, Sparkles, Activity, RotateCcw,
  Radio, MapPin, Building2, X, Target, Pencil, History,
  Check, Minus, Phone, User, ChevronRight, Save, Search,
  Upload, FileText, BarChart2, AlertCircle,
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
  operational: { label: 'Operational', color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  construction: { label: 'Construction', color: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
  planned:      { label: 'Planned',      color: 'text-blue-600',   bg: 'bg-blue-500/10 border-blue-500/20',   dot: 'bg-blue-400'   },
  blocked:      { label: 'Blocked',      color: 'text-red-600',    bg: 'bg-red-500/10 border-red-500/20',     dot: 'bg-red-400'    },
  archived:     { label: 'Archived',     color: 'text-zinc-500',   bg: 'bg-zinc-500/10 border-zinc-500/20',   dot: 'bg-zinc-500'   },
};

const PIPELINE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  new:      { label: 'New',      color: 'text-blue-600',    bg: 'bg-blue-500/10 border-blue-500/20',     dot: 'bg-blue-400'    },
  approved: { label: 'Approved', color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  on_hold:  { label: 'On Hold',  color: 'text-amber-600',   bg: 'bg-amber-500/10 border-amber-500/20',   dot: 'bg-amber-400'   },
  rejected: { label: 'Rejected', color: 'text-red-600',     bg: 'bg-red-500/10 border-red-500/20',       dot: 'bg-red-400'     },
  deployed: { label: 'Deployed', color: 'text-purple-600',  bg: 'bg-purple-500/10 border-purple-500/20', dot: 'bg-purple-400'  },
};

const SYNC_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  success: { label: 'Success', color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  partial: { label: 'Partial', color: 'text-amber-600',   bg: 'bg-amber-500/10 border-amber-500/20',    dot: 'bg-amber-400'   },
  error:   { label: 'Error',   color: 'text-red-600',     bg: 'bg-red-500/10 border-red-500/20',        dot: 'bg-red-400'     },
};

const TYPE_CONFIG = {
  hub:   { label: 'Roam Hubs',   icon: Building2, color: 'text-[#E8621A]',  accent: 'border-[#E8621A]/40 bg-[#E8621A]/10'   },
  point: { label: 'Roam Points', icon: Radio,     color: 'text-violet-600', accent: 'border-violet-400/40 bg-violet-400/10' },
  kiosk: { label: 'Kiosks',      icon: MapPin,    color: 'text-cyan-600',   accent: 'border-cyan-400/40 bg-cyan-400/10'     },
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
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-zinc-900 font-bold text-sm">Set Status Override</h3>
                <p className="text-zinc-400 text-xs mt-0.5 truncate max-w-[220px]">{station.name}</p>
              </div>
              <button onClick={() => { setShowConfirm(false); setPendingStatus(null); }} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-4 p-2 bg-zinc-100 rounded-xl border border-zinc-100">
              <StatusBadge status={station.status} />
              <span className="text-zinc-400 text-xs">→</span>
              <StatusBadge status={pendingStatus!} />
            </div>
            <textarea
              className="w-full bg-zinc-100 border border-zinc-200 rounded-xl p-3 text-zinc-900 text-xs placeholder:text-zinc-400 resize-none focus:outline-none focus:border-[#E8621A]/40 mb-3"
              rows={2}
              placeholder="Optional note (e.g. 'Closed for maintenance')"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowConfirm(false); setPendingStatus(null); setNote(''); }}
                className="flex-1 py-2 rounded-xl border border-zinc-200 text-zinc-500 text-xs hover:bg-zinc-100 transition-colors">
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
          className="p-1.5 rounded-lg border border-zinc-200 text-zinc-400 hover:text-[#E8621A] hover:border-[#E8621A]/30 transition-all">
          <RotateCcw className="w-3 h-3" />
        </button>
      )}

      <button onClick={() => setOpen(!open)} disabled={loading}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-600 text-xs hover:bg-zinc-200 hover:border-zinc-300 transition-all">
        {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
        Set
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-40 w-40 bg-white border border-zinc-200 rounded-xl shadow-2xl overflow-hidden">
            {OVERRIDE_OPTIONS.map(s => {
              const cfg = STATUS_CONFIG[s];
              return (
                <button key={s} onClick={() => handleSelect(s)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-zinc-100 ${cfg.color} ${station.status === s ? 'bg-zinc-100' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
                  {cfg.label}
                  {station.status === s && <span className="ml-auto text-[10px] text-zinc-300">now</span>}
                </button>
              );
            })}
            {station.hasOverride && (
              <>
                <div className="border-t border-zinc-100 my-0.5" />
                <button onClick={() => { handleClear(); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-100 transition-colors">
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
    return <div className="text-center py-12 text-zinc-400 text-sm">No stations in this category</div>;
  }
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-zinc-100">
          <th className="text-left px-3 sm:px-4 py-3 text-zinc-400 text-[11px] font-medium uppercase tracking-wider">Station</th>
          <th className="text-left px-3 sm:px-4 py-3 text-zinc-400 text-[11px] font-medium uppercase tracking-wider hidden lg:table-cell">ID</th>
          <th className="text-left px-3 sm:px-4 py-3 text-zinc-400 text-[11px] font-medium uppercase tracking-wider hidden md:table-cell">Launch</th>
          <th className="text-left px-3 sm:px-4 py-3 text-zinc-400 text-[11px] font-medium uppercase tracking-wider hidden sm:table-cell">Chargers</th>
          <th className="text-left px-3 sm:px-4 py-3 text-zinc-400 text-[11px] font-medium uppercase tracking-wider">Status</th>
          <th className="text-right px-3 sm:px-4 py-3 text-zinc-400 text-[11px] font-medium uppercase tracking-wider">Override</th>
        </tr>
      </thead>
      <tbody>
        {stations.map(station => (
          <tr key={station.id}
            className={`border-b border-zinc-100 hover:bg-zinc-50 transition-colors ${station.hasOverride ? 'bg-[#E8621A]/[0.015]' : ''}`}>
            <td className="px-3 sm:px-4 py-3">
              <p className="text-zinc-900 text-sm font-medium leading-tight">{station.name}</p>
              <p className="text-zinc-400 text-xs mt-0.5">{station.neighborhood}</p>
              {station.hasOverride && station.overrideInfo && (
                <p className="text-[#E8621A]/50 text-[10px] mt-1 flex items-center gap-1">
                  <Sparkles className="w-2 h-2 flex-shrink-0" />
                  <span className="truncate max-w-[200px]">{station.overrideInfo}</span>
                </p>
              )}
            </td>
            <td className="px-3 sm:px-4 py-3 hidden lg:table-cell">
              <code className="text-zinc-400 text-[11px]">{station.chargerId}</code>
            </td>
            <td className="px-3 sm:px-4 py-3 hidden md:table-cell">
              <span className="text-zinc-400 text-xs">
                {station.launchDate
                  ? new Date(station.launchDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
                  : <span className="text-zinc-300">—</span>}
              </span>
            </td>
            <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
              <span className="text-zinc-400 text-xs">
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
    <div className={`flex items-center gap-1 text-[10px] ${yes ? 'text-emerald-600' : 'text-zinc-400'}`}>
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
        <span className="text-zinc-500 text-sm">Loading pipeline sites…</span>
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
                      ? 'bg-zinc-100 text-zinc-900 border-zinc-200'
                      : `${psCfg.bg} ${psCfg.color}`
                    : 'bg-zinc-50 border-zinc-100 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
                }`}>
                {f.key !== 'all' && psCfg && <span className={`w-1.5 h-1.5 rounded-full ${psCfg.dot}`} />}
                {f.label}
                <span className={`text-[10px] font-bold ${isActive ? 'opacity-70' : 'text-zinc-300'}`}>
                  {counts[f.key]}
                </span>
              </button>
            );
          })}
        </div>
        <button onClick={fetchSites}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 text-zinc-500 text-xs hover:bg-zinc-100 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 text-sm">No sites in this category</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map(site => {
            const psCfg = PIPELINE_STATUS_CONFIG[site.status] ?? PIPELINE_STATUS_CONFIG.new;
            return (
              <div key={site.id} className="bg-white border border-zinc-200 rounded-2xl p-4 hover:border-zinc-200 transition-colors">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-zinc-900 font-semibold text-sm leading-tight truncate">{site.landmark}</h3>
                    <p className="text-zinc-400 text-xs mt-0.5">{site.neighborhood} · {site.city}</p>
                    <code className="text-zinc-300 text-[10px]">{site.siteId}</code>
                  </div>
                  <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${psCfg.color} ${psCfg.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${psCfg.dot}`} />
                    {psCfg.label}
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-zinc-50 rounded-xl p-2">
                    <p className="text-[10px] text-zinc-400 mb-0.5">Est. Points</p>
                    <p className="text-zinc-900 font-bold text-sm">{site.estimatedPoints}</p>
                  </div>
                  <div className="bg-zinc-50 rounded-xl p-2">
                    <p className="text-[10px] text-zinc-400 mb-0.5">Priority</p>
                    <p className="text-[#E8621A] font-bold text-sm">{site.priorityScore.toFixed(1)}</p>
                  </div>
                  <div className="bg-zinc-50 rounded-xl p-2">
                    <p className="text-[10px] text-zinc-400 mb-0.5">Bucket</p>
                    <p className="text-zinc-900 font-medium text-[11px] leading-tight truncate">{site.priorityBucket || '—'}</p>
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
                      <span className="text-zinc-400 flex-shrink-0">{d.label}:</span>
                      <span className="text-zinc-500 truncate">{d.value || '—'}</span>
                    </div>
                  ))}
                </div>

                {/* Agent / partner */}
                {(site.agentName || site.partnerName || site.partnerPhone) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
                    {site.agentName && (
                      <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <User className="w-3 h-3 flex-shrink-0" />{site.agentName}
                      </span>
                    )}
                    {site.partnerName && (
                      <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <Building2 className="w-3 h-3 flex-shrink-0" />{site.partnerName}
                      </span>
                    )}
                    {site.partnerPhone && (
                      <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <Phone className="w-3 h-3 flex-shrink-0" />{site.partnerPhone}
                      </span>
                    )}
                  </div>
                )}

                {/* Agent checklist */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 px-2.5 py-2 bg-zinc-50 rounded-xl border border-zinc-100">
                  <CheckItem label="Agreement"  value={site.checklist.agreement}  />
                  <CheckItem label="Consent"    value={site.checklist.consent}    />
                  <CheckItem label="Title Deed" value={site.checklist.titleDeed}  />
                  <CheckItem label="Rent"       value={site.checklist.rentAgreed} />
                </div>

                {/* Matched station */}
                {site.matchedStation && (
                  <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 bg-emerald-500/[0.05] border border-emerald-500/10 rounded-xl text-[11px] text-emerald-600">
                    <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                    Matched: {site.matchedStation.name} ·{' '}
                    <code className="text-emerald-600/70 text-[10px]">{site.matchedStation.chargerId}</code>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-100">
                  <span className="text-zinc-300 text-[10px] mr-0.5">Move to:</span>
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
        <span className="text-zinc-400 text-sm">Loading stations…</span>
      </div>
    );
  }

  return (
    <div>
      {/* Search bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ID or neighborhood…"
            className="flex-1 bg-transparent text-zinc-900 text-sm placeholder:text-zinc-400 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-zinc-400 hover:text-zinc-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button onClick={fetchStations} className="p-2 rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-100 transition-colors">
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
            <div key={station.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
              <button onClick={() => handleExpand(station)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors text-left">
                <TypeIcon className={`w-4 h-4 flex-shrink-0 ${typeCfg.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-900 text-sm font-medium truncate">{station.name}</p>
                  <p className="text-zinc-400 text-xs">
                    {station.neighborhood}
                    {station.partner && <span className="text-zinc-300"> · {station.partner}</span>}
                    {' · '}<code className="text-zinc-300 text-[10px]">{station.chargerId}</code>
                  </p>
                </div>
                <StatusBadge status={station.status} hasOverride={station.hasOverride} />
                <ChevronRight className={`w-4 h-4 text-zinc-300 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {/* Inline edit form */}
              {isExpanded && (
                <div className="border-t border-zinc-100 px-4 py-4 bg-white">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                    {EDITABLE_FIELD_DEFS.map(field => (
                      <div key={String(field.key)}>
                        <label className="block text-[10px] text-zinc-400 font-semibold mb-1 uppercase tracking-wider">
                          {field.label}
                        </label>
                        {field.type === 'select' ? (
                          <select
                            value={String(editData[field.key] ?? '')}
                            onChange={e => setEditData(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="w-full bg-zinc-100 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-900 text-xs focus:outline-none focus:border-[#E8621A]/40">
                            {field.options!.map(opt => (
                              <option key={opt} value={opt} className="bg-white">{opt}</option>
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
                            className="w-full bg-zinc-100 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-900 text-xs placeholder:text-zinc-300 focus:outline-none focus:border-[#E8621A]/40"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Notes full-width */}
                  <div className="mb-4">
                    <label className="block text-[10px] text-zinc-400 font-semibold mb-1 uppercase tracking-wider">Notes</label>
                    <textarea
                      value={editData.notes ?? ''}
                      onChange={e => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                      className="w-full bg-zinc-100 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-900 text-xs placeholder:text-zinc-300 focus:outline-none focus:border-[#E8621A]/40 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-zinc-300 text-[10px]">Saves directly to the database</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setExpandedId(null); setEditData({}); }}
                        className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-400 text-xs hover:bg-zinc-100 transition-colors">
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
        <div className="text-center py-16 text-zinc-400 text-sm">No stations match your search</div>
      )}
    </div>
  );
}

// ─── Upload Result type ───────────────────────────────────────────────────────

interface UploadResult {
  success: boolean;
  fileName: string;
  totalRows: number;
  inserted: number;
  skipped: { csvDuplicate: number; noStation: number; badDate: number; dbDuplicate: number; total: number };
  dateRange: { from: string | null; to: string | null };
  hubBreakdown: Record<string, number>;
  unknownHubs: Record<string, number> | null;
  durationMs: number;
}

// ─── Upload CSV Modal ─────────────────────────────────────────────────────────

function UploadCSVModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/upload-sessions', { method: 'POST', body: form });
      const data = await res.json() as UploadResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setResult(data);
      onSuccess();
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#E8621A]" />
            <h3 className="text-sm font-bold text-zinc-900">Upload Charging Data</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!result ? (
            <>
              {/* File picker */}
              <div>
                <p className="text-zinc-500 text-xs mb-3">
                  Upload a monthly charging sessions CSV exported from the Roam system.
                  Required columns: <code className="bg-zinc-100 px-1 rounded text-[11px]">service_id</code>,{' '}
                  <code className="bg-zinc-100 px-1 rounded text-[11px]">paymentDate</code>,{' '}
                  <code className="bg-zinc-100 px-1 rounded text-[11px]">pickupLocationProjectCode</code>, etc.
                </p>
                <label className={`flex flex-col items-center justify-center gap-2 w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  file ? 'border-[#E8621A]/40 bg-[#E8621A]/5' : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'
                }`}>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={e => { setFile(e.target.files?.[0] ?? null); setError(null); }}
                  />
                  {file ? (
                    <>
                      <FileText className="w-6 h-6 text-[#E8621A]" />
                      <span className="text-xs font-semibold text-zinc-700 text-center px-4 truncate max-w-full">{file.name}</span>
                      <span className="text-[11px] text-zinc-400">{(file.size / 1024 / 1024).toFixed(1)} MB — click to change</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-zinc-300" />
                      <span className="text-xs text-zinc-400">Click to select CSV file</span>
                    </>
                  )}
                </label>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-red-600 text-xs">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-700 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-[#E8621A] text-white text-xs font-bold rounded-xl hover:bg-[#E8621A]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? 'Uploading…' : 'Upload & Import'}
                </button>
              </div>
            </>
          ) : (
            /* Result view */
            <div className="space-y-4">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                result.skipped.noStation > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'
              }`}>
                {result.skipped.noStation > 0
                  ? <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  : <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                }
                <p className={`text-xs font-semibold ${result.skipped.noStation > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {result.inserted.toLocaleString()} sessions imported from {result.totalRows.toLocaleString()} rows
                  {result.skipped.total > 0 && ` · ${result.skipped.total} skipped`}
                </p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Imported', value: result.inserted.toLocaleString(), color: 'text-emerald-600' },
                  { label: 'Duplicates', value: (result.skipped.csvDuplicate + result.skipped.dbDuplicate).toString(), color: 'text-zinc-400' },
                  { label: 'Unmatched', value: result.skipped.noStation.toString(), color: result.skipped.noStation > 0 ? 'text-amber-600' : 'text-zinc-400' },
                ].map(s => (
                  <div key={s.label} className="bg-zinc-50 border border-zinc-100 rounded-xl p-3 text-center">
                    <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {result.dateRange.from && (
                <p className="text-xs text-zinc-400">
                  Date range: <span className="text-zinc-600 font-semibold">{result.dateRange.from}</span> → <span className="text-zinc-600 font-semibold">{result.dateRange.to}</span>
                  <span className="ml-2 text-zinc-300">·</span>
                  <span className="ml-2">{(result.durationMs / 1000).toFixed(1)}s</span>
                </p>
              )}

              {/* Hub breakdown */}
              {Object.keys(result.hubBreakdown).length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">Sessions per hub</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {Object.entries(result.hubBreakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([hub, count]) => {
                        const max = Math.max(...Object.values(result.hubBreakdown));
                        return (
                          <div key={hub} className="flex items-center gap-2">
                            <span className="text-[11px] text-zinc-500 w-32 flex-shrink-0 truncate">{hub}</span>
                            <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#E8621A] rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                            </div>
                            <span className="text-[11px] font-semibold text-zinc-600 w-12 text-right flex-shrink-0">
                              {count.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Unknown hubs */}
              {result.unknownHubs && Object.keys(result.unknownHubs).length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-1.5">
                    Unmatched hub codes (sessions skipped)
                  </p>
                  {Object.entries(result.unknownHubs).map(([code, count]) => (
                    <p key={code} className="text-xs text-amber-700">
                      <code className="font-mono">{code}</code> — {count} sessions
                    </p>
                  ))}
                  <p className="text-[10px] text-amber-500 mt-1.5">Add this hub to the database to import these sessions.</p>
                </div>
              )}

              <div className="flex justify-end">
                <button onClick={onClose}
                  className="px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-xl hover:bg-zinc-700 transition-colors">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sync Log Tab ─────────────────────────────────────────────────────────────

function SyncLogTab() {
  const [data, setData] = useState<SyncHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

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
        <span className="text-zinc-400 text-sm">Loading sync history…</span>
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div>
      {showUpload && (
        <UploadCSVModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => { fetchLogs(); }}
        />
      )}

      {/* Upload + refresh header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-bold text-zinc-900">Charging Data Uploads</h2>
          <p className="text-zinc-400 text-xs mt-0.5">Import monthly CSV exports from the Roam system.</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#E8621A] text-white text-xs font-bold rounded-xl hover:bg-[#E8621A]/90 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload CSV
        </button>
      </div>

      {/* Summary stats */}
      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Syncs', value: s.totalSyncs,   color: 'text-zinc-900'    },
            { label: 'Successful',  value: s.totalSuccess, color: 'text-emerald-600' },
            { label: 'Partial',     value: s.totalPartial, color: 'text-amber-600'   },
            { label: 'Errors',      value: s.totalErrors,  color: 'text-red-600'     },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-zinc-200 rounded-2xl p-4">
              <p className="text-zinc-400 text-xs mb-2">{stat.label}</p>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {s && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 px-1 text-xs text-zinc-400">
          <span><span className="text-emerald-600 font-semibold">{s.totalCreated.toLocaleString()}</span> records created</span>
          <span className="text-zinc-300">·</span>
          <span><span className="text-blue-600 font-semibold">{s.totalUpdated.toLocaleString()}</span> records updated</span>
          <span className="text-zinc-300">·</span>
          <span><span className="text-red-600 font-semibold">{s.totalErrorCount.toLocaleString()}</span> errors logged</span>
        </div>
      )}

      {/* Log table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Recent syncs (last 50)</p>
          <button onClick={fetchLogs}
            className="flex items-center gap-1.5 text-zinc-400 text-xs hover:text-zinc-600 transition-colors">
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>

        {!data?.logs?.length ? (
          <div className="text-center py-12 text-zinc-400 text-sm">No sync history yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left px-4 py-2.5 text-zinc-400 text-[10px] font-semibold uppercase tracking-wider w-6"></th>
                  <th className="text-left px-4 py-2.5 text-zinc-400 text-[10px] font-semibold uppercase tracking-wider">Time</th>
                  <th className="text-left px-4 py-2.5 text-zinc-400 text-[10px] font-semibold uppercase tracking-wider hidden sm:table-cell">File / Source</th>
                  <th className="text-left px-4 py-2.5 text-zinc-400 text-[10px] font-semibold uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-2.5 text-zinc-400 text-[10px] font-semibold uppercase tracking-wider hidden md:table-cell">+Created</th>
                  <th className="text-left px-4 py-2.5 text-zinc-400 text-[10px] font-semibold uppercase tracking-wider hidden md:table-cell">~Updated</th>
                  <th className="text-left px-4 py-2.5 text-zinc-400 text-[10px] font-semibold uppercase tracking-wider hidden lg:table-cell">Unchanged</th>
                  <th className="text-left px-4 py-2.5 text-zinc-400 text-[10px] font-semibold uppercase tracking-wider hidden md:table-cell">Errors</th>
                  <th className="text-left px-4 py-2.5 text-zinc-400 text-[10px] font-semibold uppercase tracking-wider hidden lg:table-cell">Duration</th>
                  <th className="text-left px-4 py-2.5 text-zinc-400 text-[10px] font-semibold uppercase tracking-wider hidden sm:table-cell">Triggered by</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map(log => {
                  const cfg = SYNC_STATUS_CONFIG[log.status] ?? SYNC_STATUS_CONFIG.success;
                  const isCsvUpload = log.source === 'csv_sessions';
                  const isExpanded = expandedLog === log.id;
                  let details: {
                    dateRange?: { from: string; to: string };
                    hubBreakdown?: Record<string, number>;
                    unknownHubs?: Record<string, number>;
                    skippedDuplicate?: number;
                    skippedNoStation?: number;
                    totalRows?: number;
                  } | null = null;
                  if (isCsvUpload && log.details) {
                    try { details = JSON.parse(log.details); } catch { /* ignore */ }
                  }

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        className={`border-b border-zinc-100 transition-colors ${isCsvUpload ? 'cursor-pointer hover:bg-zinc-50' : 'hover:bg-zinc-50'}`}
                        onClick={() => isCsvUpload && setExpandedLog(isExpanded ? null : log.id)}
                      >
                        <td className="px-4 py-3">
                          {isCsvUpload && (
                            <ChevronRight className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-zinc-700 text-xs">
                            {new Date(log.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                          </p>
                          <p className="text-zinc-400 text-[10px]">
                            {new Date(log.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            {isCsvUpload && <BarChart2 className="w-3 h-3 text-[#E8621A] flex-shrink-0" />}
                            <div>
                              <p className="text-zinc-500 text-xs truncate max-w-[140px]">
                                {log.fileName || <span className="text-zinc-300">no file</span>}
                              </p>
                              <p className="text-zinc-400 text-[10px]">{isCsvUpload ? 'Charging Sessions CSV' : log.source}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cfg.color} ${cfg.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`text-xs font-semibold ${log.created > 0 ? 'text-emerald-600' : 'text-zinc-300'}`}>
                            {log.created > 0 ? `+${log.created.toLocaleString()}` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`text-xs font-semibold ${log.updated > 0 ? 'text-blue-600' : 'text-zinc-300'}`}>
                            {log.updated > 0 ? `~${log.updated}` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-zinc-400 text-xs">{log.unchanged > 0 ? log.unchanged.toLocaleString() : '—'}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`text-xs font-semibold ${log.errors > 0 ? 'text-red-600' : 'text-zinc-300'}`}>
                            {log.errors > 0 ? log.errors : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-zinc-400 text-xs">
                            {log.durationMs > 0 ? `${(log.durationMs / 1000).toFixed(1)}s` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-zinc-400 text-xs truncate max-w-[100px] block">{log.triggerBy ?? '—'}</span>
                        </td>
                      </tr>

                      {/* Expanded detail row for CSV uploads */}
                      {isExpanded && details && (
                        <tr key={`${log.id}-detail`} className="bg-zinc-50 border-b border-zinc-100">
                          <td colSpan={10} className="px-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Date range + counts */}
                              <div className="space-y-2">
                                {details.dateRange && (
                                  <div className="text-xs text-zinc-500">
                                    <span className="font-semibold text-zinc-700">Date range: </span>
                                    {details.dateRange.from} → {details.dateRange.to}
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-3 text-xs">
                                  <span><span className="font-semibold text-zinc-600">{details.totalRows?.toLocaleString()}</span> <span className="text-zinc-400">total rows</span></span>
                                  <span><span className="font-semibold text-emerald-600">+{log.created.toLocaleString()}</span> <span className="text-zinc-400">inserted</span></span>
                                  {(details.skippedDuplicate ?? 0) > 0 && (
                                    <span><span className="font-semibold text-zinc-400">{details.skippedDuplicate}</span> <span className="text-zinc-400">duplicates</span></span>
                                  )}
                                  {(details.skippedNoStation ?? 0) > 0 && (
                                    <span><span className="font-semibold text-amber-600">{details.skippedNoStation}</span> <span className="text-zinc-400">unmatched</span></span>
                                  )}
                                </div>
                                {/* Unknown hubs */}
                                {details.unknownHubs && Object.keys(details.unknownHubs).length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1">Unmatched hub codes</p>
                                    {Object.entries(details.unknownHubs).map(([code, count]) => (
                                      <p key={code} className="text-xs text-amber-700">
                                        <code className="font-mono text-[11px]">{code}</code> — {count} sessions skipped
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {/* Hub breakdown mini bar chart */}
                              {details.hubBreakdown && Object.keys(details.hubBreakdown).length > 0 && (
                                <div>
                                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Sessions per hub</p>
                                  <div className="space-y-1.5">
                                    {Object.entries(details.hubBreakdown)
                                      .sort((a, b) => b[1] - a[1])
                                      .slice(0, 8)
                                      .map(([hub, count]) => {
                                        const max = Math.max(...Object.values(details.hubBreakdown!));
                                        return (
                                          <div key={hub} className="flex items-center gap-2">
                                            <span className="text-[10px] text-zinc-500 w-24 flex-shrink-0 truncate">{hub}</span>
                                            <div className="flex-1 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                                              <div className="h-full bg-[#E8621A]/60 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                                            </div>
                                            <span className="text-[10px] font-semibold text-zinc-500 w-10 text-right flex-shrink-0">
                                              {count.toLocaleString()}
                                            </span>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
    <div className="min-h-screen bg-zinc-50 text-zinc-900">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium animate-in slide-in-from-top-2 duration-300 ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
            : 'bg-red-500/10 border-red-500/30 text-red-600'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="relative border-b border-zinc-100 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/">
              <img src="/roam-logo-horizontal-orange.png" alt="Roam" className="h-7 w-auto object-contain" />
            </a>
            <div className="flex items-center gap-2 border-l border-zinc-200 pl-3">
              <div className="flex items-center gap-1 px-2 py-0.5 bg-[#E8621A]/10 border border-[#E8621A]/20 rounded-full">
                <Shield className="w-2.5 h-2.5 text-[#E8621A]" />
                <span className="text-[#E8621A] text-[10px] font-bold uppercase tracking-wider">Admin</span>
              </div>
              <p className="text-zinc-400 text-xs hidden sm:block">Infrastructure Control Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleSync} disabled={syncLoading}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E8621A]/10 border border-[#E8621A]/20 text-[#E8621A] text-xs font-medium hover:bg-[#E8621A]/20 transition-colors">
              <Activity className={`w-3.5 h-3.5 ${syncLoading ? 'animate-pulse' : ''}`} />
              {syncLoading ? 'Syncing…' : 'Trigger Sync'}
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-xl border border-zinc-100">
              {session?.user?.image && (
                <img src={session.user.image} alt="" className="w-5 h-5 rounded-full" />
              )}
              <span className="text-zinc-500 text-xs">{session?.user?.name ?? session?.user?.email}</span>
            </div>
            <button onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 text-zinc-400 text-xs hover:text-zinc-900 hover:border-zinc-200 transition-all">
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
            { label: 'Operational',      value: stations.filter(s => s.status === 'operational').length,  color: 'text-emerald-600', dot: 'bg-emerald-400' },
            { label: 'Construction',     value: stations.filter(s => s.status === 'construction').length, color: 'text-amber-600',   dot: 'bg-amber-400'   },
            { label: 'Planned',          value: stations.filter(s => s.status === 'planned').length,      color: 'text-blue-600',    dot: 'bg-blue-400'    },
            { label: 'Overrides Active', value: withOverrides,                                             color: 'text-[#E8621A]',   dot: 'bg-[#E8621A]'  },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-zinc-200 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`w-2 h-2 rounded-full ${stat.dot}`} />
                <span className="text-zinc-400 text-xs">{stat.label}</span>
              </div>
              <p className={`text-2xl font-black ${stat.color}`}>{loadingStations ? '—' : stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── Tab navigation ─────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mb-4 bg-white border border-zinc-200 rounded-2xl p-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

          {/* Station control tabs */}
          {stationTabs.map(tab => {
            const TypeIcon = TYPE_CONFIG[tab.key].icon;
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-shrink-0 ${
                  isActive
                    ? `bg-zinc-100 ${TYPE_CONFIG[tab.key].color} border ${TYPE_CONFIG[tab.key].accent}`
                    : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
                }`}>
                <TypeIcon className="w-3.5 h-3.5" />
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-zinc-100' : 'bg-zinc-100 text-zinc-400'}`}>
                  {tab.opCount}/{tab.count}
                </span>
              </button>
            );
          })}

          {/* Divider */}
          <div className="w-px h-6 bg-zinc-100 mx-1 flex-shrink-0" />

          {/* Management tabs */}
          {managementTabs.map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-shrink-0 ${
                  isActive
                    ? 'bg-zinc-100 text-zinc-900 border border-zinc-200'
                    : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
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
                <h1 className="text-base font-bold text-zinc-900">
                  {TYPE_CONFIG[activeTab].label} — {tabStations.filter(s => s.status === 'operational').length} operational
                  {tabStations.filter(s => s.status === 'construction').length > 0 &&
                    `, ${tabStations.filter(s => s.status === 'construction').length} in construction`}
                </h1>
                <p className="text-zinc-400 text-xs mt-0.5">
                  {activeTab === 'hub'   && 'Smart sync: Operational + past launch date → live. Use override to pin any status.'}
                  {activeTab === 'point' && 'Construction points are deploying sites. Override to mark as operational when chargers go live.'}
                  {activeTab === 'kiosk' && 'Kiosk status is synced from the field database. Override to adjust.'}
                </p>
              </div>
              <button onClick={fetchStations} disabled={loadingStations}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 text-zinc-500 text-xs hover:bg-zinc-100 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingStations ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl overflow-x-auto">
              {loadingStations ? (
                <div className="flex items-center justify-center py-16 gap-2">
                  <RefreshCw className="w-4 h-4 text-[#E8621A] animate-spin" />
                  <span className="text-zinc-400 text-sm">Loading stations…</span>
                </div>
              ) : (
                <StationTable stations={tabStations} onUpdate={handleOverrideUpdate} />
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-zinc-400">
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
              <h1 className="text-base font-bold text-zinc-900">Site Acquisition Pipeline</h1>
              <p className="text-zinc-400 text-xs mt-0.5">
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
              <h1 className="text-base font-bold text-zinc-900">Edit Site Details</h1>
              <p className="text-zinc-400 text-xs mt-0.5">
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
              <h1 className="text-base font-bold text-zinc-900">Sync Log</h1>
              <p className="text-zinc-400 text-xs mt-0.5">
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
