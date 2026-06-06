'use client';

import { useState, useEffect, useCallback } from 'react';
import { signOut, useSession } from 'next-auth/react';
import {
  Zap, Shield, LogOut, RefreshCw, CheckCircle2,
  HardHat, Clock, Ban, Archive, ChevronDown,
  AlertTriangle, Sparkles, Activity, RotateCcw
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminStation {
  id: string;
  chargerId: string;
  name: string;
  status: string;
  neighborhood: string;
  launchDate: string | null;
  partner: string | null;
  chargerCount: number;
  statusOverride: string | null;
  statusOverrideBy: string | null;
  statusOverrideAt: string | null;
  statusOverrideNote: string | null;
  hasOverride: boolean;
  overrideInfo: string | null;
}

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  operational: {
    label: 'Operational',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  construction: {
    label: 'Construction',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    icon: <HardHat className="w-3.5 h-3.5" />,
  },
  planned: {
    label: 'Planned',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  blocked: {
    label: 'Blocked',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    icon: <Ban className="w-3.5 h-3.5" />,
  },
  archived: {
    label: 'Archived',
    color: 'text-zinc-400',
    bg: 'bg-zinc-500/10 border-zinc-500/20',
    icon: <Archive className="w-3.5 h-3.5" />,
  },
};

const OVERRIDE_OPTIONS = ['operational', 'construction', 'planned', 'blocked'];

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, hasOverride }: { status: string; hasOverride?: boolean }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.planned;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
      {cfg.icon}
      {cfg.label}
      {hasOverride && <Sparkles className="w-3 h-3 text-[#E8621A] ml-0.5" />}
    </span>
  );
}

// ─── Override Dropdown ────────────────────────────────────────────────────────
function OverrideDropdown({
  station,
  onUpdate,
}: {
  station: AdminStation;
  onUpdate: (id: string, status: string | null, note?: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const handleSelect = (status: string) => {
    setPendingStatus(status);
    setShowNote(true);
    setOpen(false);
  };

  const handleConfirm = async () => {
    setLoading(true);
    await onUpdate(station.id, pendingStatus, note || undefined);
    setLoading(false);
    setShowNote(false);
    setNote('');
    setPendingStatus(null);
  };

  const handleClear = async () => {
    setLoading(true);
    await onUpdate(station.id, null);
    setLoading(false);
  };

  return (
    <div className="relative">
      {showNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#161616] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold mb-1">
              Set Override → <StatusBadge status={pendingStatus!} />
            </h3>
            <p className="text-white/50 text-xs mb-4">{station.name}</p>
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm placeholder:text-white/30 resize-none focus:outline-none focus:border-[#E8621A]/50 mb-4"
              rows={2}
              placeholder="Optional reason (e.g. 'Temporarily closed for maintenance')"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowNote(false); setPendingStatus(null); setNote(''); }}
                className="flex-1 py-2 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-2 rounded-xl bg-[#E8621A] text-white text-sm font-semibold hover:bg-[#d4571a] transition-colors disabled:opacity-50"
              >
                {loading ? 'Applying…' : 'Apply Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1">
        {station.hasOverride && (
          <button
            onClick={handleClear}
            disabled={loading}
            title="Clear override — revert to smart sync rule"
            className="p-1.5 rounded-lg border border-white/10 text-white/40 hover:text-[#E8621A] hover:border-[#E8621A]/30 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => setOpen(!open)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/70 text-xs hover:bg-white/10 hover:border-[#E8621A]/30 transition-all"
        >
          {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
          Override
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-40 w-44 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            {OVERRIDE_OPTIONS.map((s) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => handleSelect(s)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors hover:bg-white/5 ${cfg.color} ${station.status === s ? 'bg-white/5' : ''}`}
                >
                  {cfg.icon}
                  {cfg.label}
                  {station.status === s && <span className="ml-auto text-[10px] text-white/30">current</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const { data: session } = useSession();
  const [stations, setStations] = useState<AdminStation[]>([]);
  const [loading, setLoading] = useState(true);
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
      showToast(data.message ?? 'Updated', 'success');
      await fetchStations();
    } catch (err) {
      showToast(String(err), 'error');
    }
  };

  const handleManualSync = async () => {
    setSyncLoading(true);
    try {
      const res = await fetch('/api/sync/rescan', { method: 'POST' });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Sync failed');
      showToast('Sync triggered successfully', 'success');
      setTimeout(fetchStations, 3000);
    } catch (err) {
      showToast(String(err), 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  // Summary counts
  const operational = stations.filter((s) => s.status === 'operational').length;
  const withOverrides = stations.filter((s) => s.hasOverride).length;
  const construction = stations.filter((s) => s.status === 'construction').length;
  const planned = stations.filter((s) => s.status === 'planned').length;

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      {/* Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,_#1a0800_0%,_transparent_50%)] pointer-events-none" />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium transition-all animate-in slide-in-from-top-2 duration-300 ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="relative border-b border-white/5 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-[#E8621A] rounded-xl flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-white font-black text-sm tracking-tight uppercase">Roam Electric</p>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-[#E8621A]/10 border border-[#E8621A]/20 rounded-full">
                  <Shield className="w-2.5 h-2.5 text-[#E8621A]" />
                  <span className="text-[#E8621A] text-[10px] font-bold uppercase tracking-wider">Admin</span>
                </div>
              </div>
              <p className="text-white/40 text-xs">Hub Status Control Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5">
              {session?.user?.image && (
                <img src={session.user.image} alt="" className="w-5 h-5 rounded-full" />
              )}
              <span className="text-white/60 text-xs">{session?.user?.email}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-white/50 text-xs hover:text-white hover:border-white/20 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-6 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Operational', value: operational, color: 'text-emerald-400', icon: <CheckCircle2 className="w-4 h-4" /> },
            { label: 'Construction', value: construction, color: 'text-amber-400', icon: <HardHat className="w-4 h-4" /> },
            { label: 'Planned', value: planned, color: 'text-blue-400', icon: <Clock className="w-4 h-4" /> },
            { label: 'Admin Overrides', value: withOverrides, color: 'text-[#E8621A]', icon: <Sparkles className="w-4 h-4" /> },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
              <div className={`flex items-center gap-2 ${stat.color} mb-2`}>
                {stat.icon}
                <span className="text-xs font-medium text-white/50">{stat.label}</span>
              </div>
              <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-white">Hub Status Control</h1>
            <p className="text-white/40 text-sm mt-0.5">
              Smart sync auto-sets status from Google Sheets. Use overrides to pin any hub regardless of sheet data.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStations}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-white/60 text-xs hover:bg-white/5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleManualSync}
              disabled={syncLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#E8621A]/10 border border-[#E8621A]/20 text-[#E8621A] text-xs font-medium hover:bg-[#E8621A]/20 transition-colors"
            >
              <Activity className={`w-3.5 h-3.5 ${syncLoading ? 'animate-pulse' : ''}`} />
              {syncLoading ? 'Syncing…' : 'Trigger Sync'}
            </button>
          </div>
        </div>

        {/* Hub Table */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-5 h-5 text-[#E8621A] animate-spin mr-2" />
              <span className="text-white/40 text-sm">Loading stations…</span>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-white/40 text-xs font-medium">Hub</th>
                  <th className="text-left px-4 py-3 text-white/40 text-xs font-medium hidden md:table-cell">ID</th>
                  <th className="text-left px-4 py-3 text-white/40 text-xs font-medium hidden sm:table-cell">Launch Date</th>
                  <th className="text-left px-4 py-3 text-white/40 text-xs font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-white/40 text-xs font-medium">Override</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((station, i) => (
                  <tr
                    key={station.id}
                    className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${
                      station.hasOverride ? 'bg-[#E8621A]/[0.02]' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <p className="text-white text-sm font-medium leading-none">{station.name}</p>
                      <p className="text-white/35 text-xs mt-1">{station.neighborhood}</p>
                      {station.hasOverride && station.overrideInfo && (
                        <p className="text-[#E8621A]/60 text-[10px] mt-1 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          {station.overrideInfo}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <code className="text-white/30 text-xs">{station.chargerId}</code>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className="text-white/50 text-xs">
                        {station.launchDate
                          ? new Date(station.launchDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          : <span className="text-white/20">—</span>
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={station.status} hasOverride={station.hasOverride} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <OverrideDropdown station={station} onUpdate={handleOverrideUpdate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/30">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#E8621A]" />
            <span>Orange spark = admin override active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <RotateCcw className="w-3 h-3" />
            <span>Revert icon = clear override, return to smart sync</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            <span>Smart sync: Operational in sheet + past launch date = auto operational</span>
          </div>
        </div>
      </main>
    </div>
  );
}
