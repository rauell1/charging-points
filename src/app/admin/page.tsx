'use client';

import { useState, useEffect, useCallback } from 'react';
import { signOut, useSession } from 'next-auth/react';
import {
  Zap, Shield, LogOut, RefreshCw, CheckCircle2,
  HardHat, Clock, Ban, Archive, ChevronDown,
  AlertTriangle, Sparkles, Activity, RotateCcw,
  Radio, MapPin, Building2, X
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminStation {
  id: string;
  chargerId: string;
  name: string;
  type: 'hub' | 'point' | 'kiosk';
  status: string;
  neighborhood: string;
  launchDate: string | null;
  partner: string | null;
  chargerCount: number;
  totalKw: number;
  statusOverride: string | null;
  statusOverrideBy: string | null;
  statusOverrideAt: string | null;
  statusOverrideNote: string | null;
  hasOverride: boolean;
  overrideInfo: string | null;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  operational: { label: 'Operational', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  construction: { label: 'Construction', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
  planned: { label: 'Planned', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-400' },
  blocked: { label: 'Blocked', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', dot: 'bg-red-400' },
  archived: { label: 'Archived', color: 'text-zinc-500', bg: 'bg-zinc-500/10 border-zinc-500/20', dot: 'bg-zinc-500' },
};

const TYPE_CONFIG = {
  hub: { label: 'Roam Hubs', icon: Building2, color: 'text-[#E8621A]', accent: 'border-[#E8621A]/40 bg-[#E8621A]/10' },
  point: { label: 'Roam Points', icon: Radio, color: 'text-violet-400', accent: 'border-violet-400/40 bg-violet-400/10' },
  kiosk: { label: 'Roam Kiosks', icon: MapPin, color: 'text-cyan-400', accent: 'border-cyan-400/40 bg-cyan-400/10' },
};

const OVERRIDE_OPTIONS = ['operational', 'construction', 'planned', 'blocked'];

// ─── Components ───────────────────────────────────────────────────────────────
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
      {/* Confirm modal */}
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
              onChange={(e) => setNote(e.target.value)}
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
        <button onClick={handleClear} disabled={loading} title="Clear override - revert to smart sync"
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
            {OVERRIDE_OPTIONS.map((s) => {
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

// ─── Station Table ─────────────────────────────────────────────────────────────
function StationTable({ stations, onUpdate }: {
  stations: AdminStation[];
  onUpdate: (id: string, status: string | null, note?: string) => Promise<void>;
}) {
  if (stations.length === 0) {
    return (
      <div className="text-center py-12 text-white/30 text-sm">
        No stations in this category
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-white/5">
          <th className="text-left px-4 py-3 text-white/35 text-[11px] font-medium uppercase tracking-wider">Station</th>
          <th className="text-left px-4 py-3 text-white/35 text-[11px] font-medium uppercase tracking-wider hidden lg:table-cell">ID</th>
          <th className="text-left px-4 py-3 text-white/35 text-[11px] font-medium uppercase tracking-wider hidden md:table-cell">Launch</th>
          <th className="text-left px-4 py-3 text-white/35 text-[11px] font-medium uppercase tracking-wider hidden sm:table-cell">Chargers</th>
          <th className="text-left px-4 py-3 text-white/35 text-[11px] font-medium uppercase tracking-wider">Status</th>
          <th className="text-right px-4 py-3 text-white/35 text-[11px] font-medium uppercase tracking-wider">Override</th>
        </tr>
      </thead>
      <tbody>
        {stations.map((station) => (
          <tr key={station.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group ${station.hasOverride ? 'bg-[#E8621A]/[0.015]' : ''}`}>
            <td className="px-4 py-3">
              <p className="text-white text-sm font-medium leading-tight">{station.name}</p>
              <p className="text-white/35 text-xs mt-0.5">{station.neighborhood}</p>
              {station.hasOverride && station.overrideInfo && (
                <p className="text-[#E8621A]/50 text-[10px] mt-1 flex items-center gap-1">
                  <Sparkles className="w-2 h-2 flex-shrink-0" />
                  <span className="truncate max-w-[200px]">{station.overrideInfo}</span>
                </p>
              )}
            </td>
            <td className="px-4 py-3 hidden lg:table-cell">
              <code className="text-white/25 text-[11px]">{station.chargerId}</code>
            </td>
            <td className="px-4 py-3 hidden md:table-cell">
              <span className="text-white/40 text-xs">
                {station.launchDate
                  ? new Date(station.launchDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
                  : <span className="text-white/15">-</span>}
              </span>
            </td>
            <td className="px-4 py-3 hidden sm:table-cell">
              <span className="text-white/40 text-xs">{station.chargerCount > 0 ? `${station.chargerCount} · ${station.totalKw.toFixed(1)}kW` : '-'}</span>
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={station.status} hasOverride={station.hasOverride} />
            </td>
            <td className="px-4 py-3">
              <OverrideDropdown station={station} onUpdate={onUpdate} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type TabType = 'hub' | 'point' | 'kiosk';

export default function AdminPage() {
  const { data: session } = useSession();
  const [stations, setStations] = useState<AdminStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('hub');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchStations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stations');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json() as { stations: AdminStation[] };
      setStations(data.stations);
    } catch {
      showToast('Failed to load station data', 'error');
    } finally {
      setLoading(false);
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

  // Derived counts
  const byType = (t: TabType) => stations.filter((s) => s.type === t);
  const hubs = byType('hub');
  const points = byType('point');
  const kiosks = byType('kiosk');
  const activeStations = stations.filter((s) => s.status === 'operational' && s.type === activeTab);
  const constructionStations = stations.filter((s) => s.status === 'construction' && s.type === activeTab);
  const withOverrides = stations.filter((s) => s.hasOverride).length;

  const tabStations = { hub: hubs, point: points, kiosk: kiosks }[activeTab];

  const tabs: { key: TabType; label: string; count: number; opCount: number }[] = [
    { key: 'hub', label: 'Roam Hubs', count: hubs.length, opCount: hubs.filter(s => s.status === 'operational').length },
    { key: 'point', label: 'Roam Points', count: points.length, opCount: points.filter(s => s.status === 'operational').length },
    { key: 'kiosk', label: 'Kiosks', count: kiosks.length, opCount: kiosks.filter(s => s.status === 'operational').length },
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
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="relative border-b border-white/5 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/">
              <img src="/roam-logo-horizontal-orange.png" alt="Roam Logo" className="h-7 w-auto object-contain" />
            </a>
            <div className="flex items-center gap-2 border-l border-white/10 pl-3">
              <div className="flex items-center gap-1 px-2 py-0.5 bg-[#E8621A]/10 border border-[#E8621A]/20 rounded-full">
                <Shield className="w-2.5 h-2.5 text-[#E8621A]" />
                <span className="text-[#E8621A] text-[10px] font-bold uppercase tracking-wider">Admin</span>
              </div>
              <p className="text-white/40 text-xs hidden sm:block">Infrastructure Status Control Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleSync} disabled={syncLoading}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E8621A]/10 border border-[#E8621A]/20 text-[#E8621A] text-xs font-medium hover:bg-[#E8621A]/20 transition-colors">
              <Activity className={`w-3.5 h-3.5 ${syncLoading ? 'animate-pulse' : ''}`} />
              {syncLoading ? 'Syncing…' : 'Trigger Sync'}
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5">
              {session?.user?.image && <img src={session.user.image} alt="" className="w-5 h-5 rounded-full" />}
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

      <main className="relative max-w-6xl mx-auto px-6 py-6">
        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Operational', value: stations.filter(s => s.status === 'operational').length, color: 'text-emerald-400', dot: 'bg-emerald-400' },
            { label: 'Construction', value: stations.filter(s => s.status === 'construction').length, color: 'text-amber-400', dot: 'bg-amber-400' },
            { label: 'Planned', value: stations.filter(s => s.status === 'planned').length, color: 'text-blue-400', dot: 'bg-blue-400' },
            { label: 'Overrides Active', value: withOverrides, color: 'text-[#E8621A]', dot: 'bg-[#E8621A]' },
          ].map((s) => (
            <div key={s.label} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                <span className="text-white/40 text-xs">{s.label}</span>
              </div>
              <p className={`text-2xl font-black ${s.color}`}>{loading ? '-' : s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 bg-white/[0.03] border border-white/5 rounded-2xl p-1.5 w-fit">
          {tabs.map((tab) => {
            const TypeIcon = TYPE_CONFIG[tab.key].icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? `bg-white/10 ${TYPE_CONFIG[tab.key].color} border ${TYPE_CONFIG[tab.key].accent}`
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                <TypeIcon className="w-3.5 h-3.5" />
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-white/10' : 'bg-white/5 text-white/30'
                }`}>
                  {tab.opCount}/{tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active tab context bar */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-bold text-white">
              {TYPE_CONFIG[activeTab].label} - {tabStations.filter(s => s.status === 'operational').length} operational
              {tabStations.filter(s => s.status === 'construction').length > 0 && `, ${tabStations.filter(s => s.status === 'construction').length} in construction`}
            </h1>
            <p className="text-white/35 text-xs mt-0.5">
              {activeTab === 'hub' && 'Smart sync: Operational + past launch date → live. Use override to pin any status.'}
              {activeTab === 'point' && 'Construction points are deploying sites. Override to mark as operational when chargers go live.'}
              {activeTab === 'kiosk' && 'Kiosk status is synced from the field database. Override to adjust.'}
            </p>
          </div>
          <button onClick={fetchStations} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-white/50 text-xs hover:bg-white/5 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2">
              <RefreshCw className="w-4 h-4 text-[#E8621A] animate-spin" />
              <span className="text-white/40 text-sm">Loading stations…</span>
            </div>
          ) : (
            <StationTable stations={tabStations} onUpdate={handleOverrideUpdate} />
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-white/25">
          <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-[#E8621A]" /> Orange spark = admin override active</span>
          <span className="flex items-center gap-1.5"><RotateCcw className="w-3 h-3" /> Revert = clear override, follow smart sync</span>
          <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Tab badge shows operational / total count</span>
        </div>
      </main>
    </div>
  );
}
