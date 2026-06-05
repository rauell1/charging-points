'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  ArrowUpCircle,
  MinusCircle,
  Loader2,
  CloudUpload,
  X,
  FolderSync,
  Zap,
  History,
  Code2,
  Play,
  Settings,
  Copy,
  Check,
  Clock,
  Plug,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────

interface SyncChange {
  action: 'created' | 'updated' | 'unchanged' | 'error';
  chargerId: string;
  name: string;
  field?: string;
  oldVal?: string;
  newVal?: string;
}

interface SyncResult {
  message: string;
  source: string;
  sheets: string[];
  summary: {
    created: number;
    updated: number;
    unchanged: number;
    errors: number;
    changes: SyncChange[];
  };
  timestamp: string;
}

interface RescanResult {
  message: string;
  filesScanned: number;
  summary: {
    totalCreated: number;
    totalUpdated: number;
    totalUnchanged: number;
    totalErrors: number;
  };
  results: Array<{
    file: string;
    sheets: string[];
    created: number;
    updated: number;
    unchanged: number;
    errors: number;
  }>;
  timestamp: string;
}

interface SyncLogItem {
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

interface SyncConfig {
  apiKey: string;
  enabled: boolean;
  schedule: string;
  webhookUrl: string;
  lastSync: string | null;
  lastSyncStatus: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function invalidateDashboardQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['stations'] }),
    queryClient.invalidateQueries({ queryKey: ['analytics'] }),
    queryClient.invalidateQueries({ queryKey: ['analytics-badges'] }),
    queryClient.invalidateQueries({ queryKey: ['milestones'] }),
    queryClient.invalidateQueries({ queryKey: ['activities'] }),
    queryClient.invalidateQueries({ queryKey: ['sync-history'] }),
    queryClient.invalidateQueries({ queryKey: ['sync-config'] }),
  ]);
}

function getSourceLabel(source: string) {
  switch (source) {
    case 'manual_upload': return 'Excel Upload';
    case 'rescan': return 'Re-scan';
    case 'api_push': return 'API Push';
    case 'webhook': return 'Webhook';
    case 'scheduled': return 'Scheduled';
    default: return source;
  }
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'success': return 'default';
    case 'partial': return 'secondary';
    case 'error': return 'destructive';
    default: return 'outline';
  }
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SyncDialog() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [syncing, setSyncing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [rescanResult, setRescanResult] = useState<RescanResult | null>(null);
  const [rescanning, setRescanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Sync config state
  const [configEnabled, setConfigEnabled] = useState(true);
  const [configSchedule, setConfigSchedule] = useState('every 6 hours');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Fetch sync config
  const { data: config, refetch: refetchConfig } = useQuery<SyncConfig>({
    queryKey: ['sync-config'],
    queryFn: () => fetch('/api/sync/config').then((r) => {
      if (!r.ok) throw new Error(`API error ${r.status}`);
      return r.json();
    }),
    enabled: open,
  });

  // Fetch sync history
  const { data: historyData, refetch: refetchHistory } = useQuery<{
    logs: SyncLogItem[];
    summary: Record<string, number>;
  }>({
    queryKey: ['sync-history'],
    queryFn: () => fetch('/api/sync/history').then((r) => {
      if (!r.ok) throw new Error(`API error ${r.status}`);
      return r.json();
    }),
    enabled: open,
  });

  // Sync config from fetched data
  const resolvedConfig = config || {
    apiKey: 'roam-****-2025',
    enabled: true,
    schedule: 'every 6 hours',
    webhookUrl: '',
    lastSync: null,
    lastSyncStatus: null,
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Please upload an Excel file (.xlsx, .xls) or CSV file');
      return;
    }
    setSelectedFile(file);
    setResult(null);
    setError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleSync = async () => {
    if (!selectedFile) return;

    setSyncing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('source', 'auto-detect');

      const response = await fetch('/api/sync/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || err.details || 'Sync failed');
      }

      const data: SyncResult = await response.json();
      setResult(data);
      await invalidateDashboardQueries(queryClient);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setSyncing(false);
    }
  };

  const handleRescan = async () => {
    setRescanning(true);
    setError(null);
    setRescanResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch('/api/sync/rescan', {
        method: 'POST',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || err.details || 'Rescan failed');
      }
      const data: RescanResult = await response.json();
      setRescanResult(data);
      await invalidateDashboardQueries(queryClient);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Rescan timed out after 60 seconds');
      } else {
        setError(err instanceof Error ? err.message : 'Rescan failed');
      }
    } finally {
      setRescanning(false);
    }
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestResult(null);
    setTestError(null);

    try {
      const response = await fetch('/api/sync/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_SYNC_API_KEY || 'roam-sync-key-2025',
        },
        body: JSON.stringify({
          stations: [
            {
              chargerId: '#TEST-001',
              name: 'Test Station (Auto-Sync Check)',
              type: 'point',
              status: 'planned',
              address: 'Test Address',
              neighborhood: 'Test Area',
            },
          ],
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setTestResult(data.message);
      } else {
        setTestError(data.error || 'Connection failed');
      }
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setTestLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const response = await fetch('/api/sync/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: configEnabled,
          schedule: configSchedule,
        }),
      });
      if (response.ok) {
        await refetchConfig();
      }
    } catch {
      // Ignore
    }
  };

  const handleCopyCode = () => {
    const code = `curl -X POST /api/sync/data \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${process.env.NEXT_PUBLIC_SYNC_API_KEY || 'roam-sync-key-2025'}" \\
  -d '{
    "stations": [
      {
        "chargerId": "#RP-KE-A-01",
        "name": "Roam Point - Pangani 1",
        "type": "point",
        "status": "operational",
        "address": "Pangani, Nairobi",
        "neighborhood": "Pangani",
        "latitude": -1.266212,
        "longitude": 36.835316,
        "chargerCount": 1,
        "totalKw": 6,
        "connectorType": "Type 6",
        "partner": "Anita Karambu",
        "siteManager": "Anita Karambu",
        "managerPhone": "0716899985",
        "notes": "Operational since Dec 2025"
      }
    ]
  }'`;

    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setRescanResult(null);
    setError(null);
    setTestResult(null);
    setTestError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) handleReset();
    setActiveTab('upload');
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created': return <PlusCircle className="h-4 w-4 text-[--roam-orange]" />;
      case 'updated': return <ArrowUpCircle className="h-4 w-4 text-blue-500" />;
      case 'unchanged': return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'border-[--roam-orange]/20 bg-[--roam-orange-light] dark:bg-[--roam-orange]/10';
      case 'updated': return 'border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900';
      case 'unchanged': return 'border-muted';
      case 'error': return 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button className="bg-[--roam-orange] text-white hover:bg-[--roam-orange]/90 rounded-full px-4 py-1.5 h-8 text-xs font-semibold gap-1.5 border-none transition-all cursor-pointer flex-shrink-0">
          <CloudUpload className="h-3.5 w-3.5 text-white" />
          <span>Sync Data</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-3xl h-[100vh] md:h-auto max-h-[90vh] md:max-h-[85vh] overflow-y-auto flex flex-col border border-gray-100 dark:border-zinc-800 rounded-2xl bg-white dark:bg-[#0D0D0D] p-6 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[--roam-black] dark:text-white font-black text-lg uppercase tracking-tight">
            <RefreshCw className="h-5 w-5 text-[--roam-orange]" />
            Data Sync Center
          </DialogTitle>
          <DialogDescription className="text-xs text-[--roam-gray-mid]">
            Upload Excel files, configure auto-sync, view history, or integrate via API.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0">
          <TabsList className="w-full bg-transparent border-b rounded-none h-auto p-0 flex gap-4">
            <TabsTrigger
              value="upload"
              className="rounded-none px-0 py-2 bg-transparent shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[--roam-orange] data-[state=active]:text-[--roam-orange] dark:data-[state=active]:text-[--roam-orange] text-[--roam-gray-mid] font-medium cursor-pointer"
            >
              Upload
            </TabsTrigger>
            <TabsTrigger
              value="auto"
              className="rounded-none px-0 py-2 bg-transparent shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[--roam-orange] data-[state=active]:text-[--roam-orange] dark:data-[state=active]:text-[--roam-orange] text-[--roam-gray-mid] font-medium cursor-pointer"
            >
              Auto Sync
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-none px-0 py-2 bg-transparent shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[--roam-orange] data-[state=active]:text-[--roam-orange] dark:data-[state=active]:text-[--roam-orange] text-[--roam-gray-mid] font-medium cursor-pointer"
            >
              History
            </TabsTrigger>
            <TabsTrigger
              value="api"
              className="rounded-none px-0 py-2 bg-transparent shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[--roam-orange] data-[state=active]:text-[--roam-orange] dark:data-[state=active]:text-[--roam-orange] text-[--roam-gray-mid] font-medium cursor-pointer"
            >
              API Reference
            </TabsTrigger>
          </TabsList>

          {/* ─── Upload Tab ──────────────────────────────────────────── */}
          <TabsContent value="upload" className="flex-1 min-h-0 overflow-y-auto mt-4">
            <div className="space-y-4">
              {/* File Upload Area */}
              {!result && (
                <div
                  className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
                    dragOver
                      ? 'border-[--roam-orange] bg-[--roam-orange-light] dark:bg-[--roam-orange]/10'
                      : selectedFile
                      ? 'border-[--roam-orange] bg-[--roam-orange-light]/50 dark:bg-[--roam-orange]/5'
                      : 'border-muted-foreground/25 hover:border-[--roam-orange]/50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />

                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet className="h-10 w-10 text-[--roam-orange]" />
                      <p className="text-sm font-semibold text-[--roam-gray-dark] dark:text-zinc-200">{selectedFile.name}</p>
                      <p className="text-xs text-[--roam-gray-mid]">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                      <button
                        className="text-xs text-[--roam-gray-mid] hover:text-[--roam-orange] mt-1 flex items-center justify-center gap-1 font-semibold"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReset();
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-10 w-10 text-[--roam-gray-mid]" />
                      <p className="text-sm font-semibold text-[--roam-gray-dark] dark:text-zinc-200">
                        Drop Excel file here or click to browse
                      </p>
                      <p className="text-xs text-[--roam-gray-mid]">
                        Supports .xlsx, .xls, and .csv files
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-800 dark:text-red-400">Sync Error</p>
                    <p className="text-xs text-red-650 dark:text-red-300 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Sync Result */}
              {result && (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    <Card className={`p-3 border-gray-100 dark:border-zinc-850 bg-white dark:bg-[#141414] ${result.summary.created > 0 ? 'border-[--roam-orange]/30 bg-[--roam-orange-light]' : ''}`}>
                      <div className="text-2xl font-black text-[--roam-orange]">{result.summary.created}</div>
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-[--roam-gray-mid]">Created</div>
                    </Card>
                    <Card className={`p-3 border-gray-100 dark:border-zinc-850 bg-white dark:bg-[#141414] ${result.summary.updated > 0 ? 'border-blue-200 bg-blue-50 dark:bg-blue-950/20' : ''}`}>
                      <div className="text-2xl font-black text-blue-600">{result.summary.updated}</div>
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-[--roam-gray-mid]">Updated</div>
                    </Card>
                    <Card className="p-3 border-gray-100 dark:border-zinc-850 bg-white dark:bg-[#141414]">
                      <div className="text-2xl font-black text-muted-foreground">{result.summary.unchanged}</div>
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-[--roam-gray-mid]">Unchanged</div>
                    </Card>
                    <Card className={`p-3 border-gray-100 dark:border-zinc-850 bg-white dark:bg-[#141414] ${result.summary.errors > 0 ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : ''}`}>
                      <div className="text-2xl font-black text-red-600">{result.summary.errors}</div>
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-[--roam-gray-mid]">Errors</div>
                    </Card>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[--roam-gray-mid]">Sheets detected:</span>
                    {result.sheets.map(sheet => (
                      <Badge key={sheet} className="text-[10px] bg-[--roam-gray-light] dark:bg-zinc-800 text-[--roam-gray-dark] dark:text-zinc-300 border-none px-2 py-0.5 rounded-full hover:bg-[--roam-gray-light]">
                        {sheet}
                      </Badge>
                    ))}
                  </div>

                  {result.summary.changes.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-semibold text-[--roam-gray-dark] dark:text-zinc-200 mb-2 uppercase tracking-wider">
                          Changes ({result.summary.changes.length} total)
                        </p>
                        <ScrollArea className="h-48">
                          <div className="space-y-1.5">
                            {result.summary.changes
                              .filter(c => c.action !== 'unchanged')
                              .slice(0, 50)
                              .map((change, i) => (
                                <div
                                  key={i}
                                  className={`flex items-start gap-2 p-2 rounded-xl border text-xs ${getActionColor(change.action)}`}
                                >
                                  <div className="mt-0.5 shrink-0">
                                    {getActionIcon(change.action)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-[--roam-gray-dark] dark:text-zinc-200 truncate">{change.name}</span>
                                      <Badge variant="outline" className="text-[9px] font-mono shrink-0 px-1 py-0 border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                                        {change.chargerId}
                                      </Badge>
                                    </div>
                                    {change.field && (
                                      <div className="mt-0.5 text-[10px] text-[--roam-gray-mid]">
                                        <span className="font-semibold">{change.field}:</span>{' '}
                                        <span className="line-through text-red-500">{change.oldVal || '(empty)'}</span>
                                        {' → '}
                                        <span className="text-[--roam-orange] font-semibold">{change.newVal || '(empty)'}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            {result.summary.changes.filter(c => c.action !== 'unchanged').length > 50 && (
                              <p className="text-xs text-[--roam-gray-mid] text-center py-2">
                                ...and {result.summary.changes.length - 50} more changes
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </>
                  )}

                  {result.summary.errors === 0 && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[--roam-orange-light] dark:bg-[--roam-orange]/10 border border-[--roam-orange]/20">
                      <CheckCircle2 className="h-4 w-4 text-[--roam-orange]" />
                      <p className="text-xs text-[--roam-orange] font-semibold">
                        Dashboard data updated successfully. All tabs have been refreshed.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Re-scan Upload Folder Section */}
              {!result && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderSync className="h-4 w-4 text-[--roam-orange]" />
                      <div>
                        <p className="text-xs font-semibold text-[--roam-gray-dark] dark:text-zinc-200">Re-scan Upload Folder</p>
                        <p className="text-[10px] text-[--roam-gray-mid]">
                          Re-read existing Excel files from the upload directory
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRescan}
                      disabled={rescanning}
                      className="text-xs gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-[--roam-gray-light]"
                    >
                      {rescanning ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-[--roam-orange]" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3.5 w-3.5" />
                          Re-scan
                        </>
                      )}
                    </Button>
                  </div>

                  {rescanResult && (
                    <div className="rounded-2xl border border-gray-150 dark:border-zinc-850 p-3 space-y-2 bg-[--roam-gray-light] dark:bg-[#141414]">
                      <p className="text-xs font-semibold text-[--roam-gray-dark] dark:text-zinc-200">Scan Results</p>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center">
                          <div className="text-lg font-black text-[--roam-orange]">{rescanResult.summary.totalCreated}</div>
                          <div className="text-[10px] text-[--roam-gray-mid]">New</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-black text-blue-600">{rescanResult.summary.totalUpdated}</div>
                          <div className="text-[10px] text-[--roam-gray-mid]">Updated</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-black text-muted-foreground">{rescanResult.summary.totalUnchanged}</div>
                          <div className="text-[10px] text-[--roam-gray-mid]">Unchanged</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-black text-red-600">{rescanResult.summary.totalErrors}</div>
                          <div className="text-[10px] text-[--roam-gray-mid]">Errors</div>
                        </div>
                      </div>
                      <p className="text-[10px] text-[--roam-gray-mid]">
                        {rescanResult.filesScanned} file(s) scanned at {new Date(rescanResult.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2">
                {result ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleReset} className="text-xs rounded-full cursor-pointer">
                      Upload Another File
                    </Button>
                    <Button size="sm" onClick={() => handleClose(false)} className="text-xs rounded-full bg-[--roam-orange] hover:bg-[#c94d0e] cursor-pointer text-white">
                      Done
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-xs text-[--roam-gray-mid]">
                      {selectedFile ? 'Ready to sync' : 'Select a file to begin'}
                    </div>
                    <Button
                      size="sm"
                      onClick={handleSync}
                      disabled={!selectedFile || syncing}
                      className="text-xs gap-1.5 rounded-full bg-[--roam-orange] hover:bg-[#c94d0e] cursor-pointer text-white"
                    >
                      {syncing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3.5 w-3.5" />
                          Sync Now
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ─── Auto Sync Tab ────────────────────────────────────────── */}
          <TabsContent value="auto" className="flex-1 min-h-0 overflow-y-auto mt-4">
            <div className="space-y-4">
              {/* Status Card */}
              <Card className="border border-gray-150 dark:border-zinc-850 rounded-2xl bg-white dark:bg-[#141414] shadow-sm">
                <CardHeader className="pb-3 border-b border-gray-50 dark:border-zinc-800">
                  <CardTitle className="text-sm font-semibold uppercase tracking-widest text-[--roam-gray-dark] dark:text-zinc-200 flex items-center gap-2">
                    <Settings className="h-4 w-4 text-[--roam-orange]" />
                    Auto Sync Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Enable/Disable */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[--roam-gray-dark] dark:text-zinc-200">Enable Auto Sync</p>
                      <p className="text-[10px] text-[--roam-gray-mid] mt-0.5">
                        Allow automated data sync via API or webhook
                      </p>
                    </div>
                    <Switch
                      checked={configEnabled}
                      onCheckedChange={(checked) => {
                        setConfigEnabled(checked);
                        // Save immediately
                        const fs = { save: async (val: boolean) => {
                          await fetch('/api/sync/config', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ enabled: val }),
                          });
                          refetchConfig();
                        }};
                        fs.save(checked);
                      }}
                    />
                  </div>

                  <Separator />

                  {/* Schedule */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[--roam-gray-dark] dark:text-zinc-200">Sync Schedule</p>
                      <p className="text-[10px] text-[--roam-gray-mid] mt-0.5">
                        How often to automatically pull data
                      </p>
                    </div>
                    <Select
                      value={configSchedule}
                      onValueChange={(val) => {
                        setConfigSchedule(val);
                        fetch('/api/sync/config', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ schedule: val }),
                        }).then(() => refetchConfig());
                      }}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs rounded-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="every 1 hour">Every 1h</SelectItem>
                        <SelectItem value="every 6 hours">Every 6h</SelectItem>
                        <SelectItem value="every 12 hours">Every 12h</SelectItem>
                        <SelectItem value="every 24 hours">Every 24h</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* API Key */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[--roam-gray-dark] dark:text-zinc-200">API Key</p>
                      <p className="text-[10px] text-[--roam-gray-mid] mt-0.5">
                        Used to authenticate API and webhook requests
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                      {resolvedConfig.apiKey}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Last Sync Info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[--roam-gray-dark] dark:text-zinc-200">Last Sync</p>
                      <p className="text-[10px] text-[--roam-gray-mid] mt-0.5">
                        {resolvedConfig.lastSync
                          ? formatTime(resolvedConfig.lastSync)
                          : 'No automated sync yet'}
                      </p>
                    </div>
                    {resolvedConfig.lastSyncStatus && (
                      <Badge className={`text-[10px] border-none px-2 py-0.5 rounded-full ${resolvedConfig.lastSyncStatus === 'success' ? 'bg-[--roam-orange-light] text-[--roam-orange]' : 'bg-red-50 text-red-650'}`}>
                        {resolvedConfig.lastSyncStatus}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Test Connection */}
              <Card className="border border-gray-150 dark:border-zinc-850 rounded-2xl bg-white dark:bg-[#141414] shadow-sm">
                <CardHeader className="pb-3 border-b border-gray-50 dark:border-zinc-800">
                  <CardTitle className="text-sm font-semibold uppercase tracking-widest text-[--roam-gray-dark] dark:text-zinc-200 flex items-center gap-2">
                    <Plug className="h-4 w-4 text-[--roam-orange]" />
                    Test Connection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <p className="text-[10px] text-[--roam-gray-mid]">
                    Send a test payload to verify the API endpoint is working. A test station will be created and tracked in sync history.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={testLoading}
                    className="text-xs gap-1.5 rounded-full bg-[--roam-orange] hover:bg-[#c94d0e] cursor-pointer text-white"
                  >
                    {testLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        Test Connection
                      </>
                    )}
                  </Button>

                  {testResult && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[--roam-orange-light] dark:bg-[--roam-orange]/10 border border-[--roam-orange]/20">
                      <CheckCircle2 className="h-4 w-4 text-[--roam-orange] shrink-0" />
                      <p className="text-xs text-[--roam-orange] font-semibold">{testResult}</p>
                    </div>
                  )}
                  {testError && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                      <p className="text-xs text-red-700 dark:text-red-400">{testError}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sync Now (Re-scan) */}
              <Card className="border border-gray-150 dark:border-zinc-850 rounded-2xl bg-white dark:bg-[#141414] shadow-sm">
                <CardHeader className="pb-3 border-b border-gray-50 dark:border-zinc-800">
                  <CardTitle className="text-sm font-semibold uppercase tracking-widest text-[--roam-gray-dark] dark:text-zinc-200 flex items-center gap-2">
                    <FolderSync className="h-4 w-4 text-[--roam-orange]" />
                    Manual Sync (Re-scan)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <p className="text-[10px] text-[--roam-gray-mid]">
                    Trigger a manual re-scan of all uploaded Excel files in the upload directory.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRescan}
                    disabled={rescanning}
                    className="text-xs gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-[--roam-gray-light]"
                  >
                    {rescanning ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[--roam-orange]" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5" />
                        Sync Now
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── History Tab ──────────────────────────────────────────── */}
          <TabsContent value="history" className="flex-1 min-h-0 mt-4">
            <div className="space-y-3">
              {/* Summary stats */}
              {historyData?.summary && (
                <div className="grid grid-cols-4 gap-2">
                  <Card className="p-3 border-gray-150 dark:border-zinc-850 bg-white dark:bg-[#141414] shadow-sm">
                    <div className="text-xl font-black text-[--roam-black] dark:text-white leading-tight">{historyData.summary.totalSyncs || 0}</div>
                    <div className="text-[10px] text-[--roam-gray-mid] mt-0.5">Total Syncs</div>
                  </Card>
                  <Card className="p-3 border-gray-150 dark:border-zinc-850 bg-white dark:bg-[#141414] shadow-sm">
                    <div className="text-xl font-black text-[--roam-orange]">{historyData.summary.totalSuccess || 0}</div>
                    <div className="text-[10px] text-[--roam-gray-mid] mt-0.5">Successful</div>
                  </Card>
                  <Card className="p-3 border-gray-150 dark:border-zinc-850 bg-white dark:bg-[#141414] shadow-sm">
                    <div className="text-xl font-black text-blue-600">{historyData.summary.totalCreated || 0}</div>
                    <div className="text-[10px] text-[--roam-gray-mid] mt-0.5">Created</div>
                  </Card>
                  <Card className="p-3 border-gray-150 dark:border-zinc-850 bg-white dark:bg-[#141414] shadow-sm">
                    <div className="text-xl font-black text-red-600">{historyData.summary.totalErrors || 0}</div>
                    <div className="text-[10px] text-[--roam-gray-mid] mt-0.5">Errors</div>
                  </Card>
                </div>
              )}

              <Separator />

              {/* Log List */}
              <ScrollArea className="h-72 pr-1">
                {historyData?.logs && historyData.logs.length > 0 ? (
                  <div className="space-y-2">
                    {historyData.logs.slice(0, 10).map((log) => (
                      <div key={log.id} className="rounded-2xl border border-gray-150 dark:border-zinc-850 p-3 space-y-1.5 bg-white dark:bg-[#141414] shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[9px] border-none px-2 py-0.5 rounded-full ${log.status === 'success' ? 'bg-[--roam-orange-light] text-[--roam-orange]' : 'bg-red-50 text-red-650'}`}>
                              {log.status}
                            </Badge>
                            <Badge className="text-[9px] bg-[--roam-gray-light] dark:bg-zinc-800 text-[--roam-gray-dark] dark:text-zinc-300 border-none px-2 py-0.5 rounded-full">
                              {getSourceLabel(log.source)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-[--roam-gray-mid]">
                            <Clock className="h-3 w-3 text-[--roam-orange]" />
                            {formatTime(log.createdAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px]">
                          <span className="text-[--roam-orange] font-semibold">{log.created} created</span>
                          <span className="text-blue-600 font-semibold">{log.updated} updated</span>
                          <span className="text-[--roam-gray-mid]">{log.unchanged} unchanged</span>
                          {log.errors > 0 && (
                            <span className="text-red-600 font-semibold">{log.errors} errors</span>
                          )}
                          <span className="ml-auto text-[--roam-gray-mid] font-mono">
                            {formatDuration(log.durationMs)}
                          </span>
                        </div>
                        {log.triggerBy && (
                          <div className="text-[9px] text-[--roam-gray-mid]">
                            Triggered by: {log.triggerBy}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-[--roam-gray-mid]">
                    <History className="h-8 w-8 mb-2 opacity-50 text-[--roam-orange]" />
                    <p className="text-xs font-semibold">No sync history yet</p>
                    <p className="text-[10px]">Sync operations will appear here</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* ─── API Reference Tab ───────────────────────────────────── */}
          <TabsContent value="api" className="flex-1 min-h-0 overflow-y-auto mt-4">
            <div className="space-y-4">
              <Card className="border border-gray-150 dark:border-zinc-850 rounded-2xl bg-white dark:bg-[#141414] shadow-sm">
                <CardHeader className="pb-3 border-b border-gray-50 dark:border-zinc-800">
                  <CardTitle className="text-sm font-semibold uppercase tracking-widest text-[--roam-gray-dark] dark:text-zinc-200 flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-[--roam-orange]" />
                    API Endpoint: POST /api/sync/data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <p className="text-[10px] text-[--roam-gray-mid]">
                    Push station data directly to the dashboard using JSON. Authenticate with the <code className="text-[10px] bg-muted px-1 rounded">x-api-key</code> header.
                  </p>

                  <div className="relative">
                    <pre className="bg-slate-950 text-slate-205 rounded-2xl p-4 text-[11px] overflow-x-auto font-mono">
                      <code>{`curl -X POST /api/sync/data \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${process.env.NEXT_PUBLIC_SYNC_API_KEY || 'roam-sync-key-2025'}" \\
  -d '{
    "stations": [
      {
        "chargerId": "#RP-KE-A-01",
        "name": "Roam Point - Pangani 1",
        "type": "point",
        "status": "operational",
        "address": "Pangani, Nairobi",
        "neighborhood": "Pangani",
        "latitude": -1.266212,
        "longitude": 36.835316,
        "chargerCount": 1,
        "totalKw": 6,
        "connectorType": "Type 6",
        "partner": "Anita Karambu",
        "siteManager": "Anita Karambu",
        "managerPhone": "0716899985",
        "notes": "Operational since Dec 2025"
      }
    ]
  }'`}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-7 w-7 p-0 hover:bg-slate-800/50 rounded-full"
                      onClick={handleCopyCode}
                    >
                      {codeCopied ? (
                        <Check className="h-3.5 w-3.5 text-[--roam-orange]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-150 dark:border-zinc-850 rounded-2xl bg-white dark:bg-[#141414] shadow-sm">
                <CardHeader className="pb-3 border-b border-gray-50 dark:border-zinc-800">
                  <CardTitle className="text-sm font-semibold uppercase tracking-widest text-[--roam-gray-dark] dark:text-zinc-200 flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-[--roam-orange]" />
                    JavaScript / Fetch Example
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="relative">
                    <pre className="bg-slate-950 text-slate-205 rounded-2xl p-4 text-[11px] overflow-x-auto font-mono">
                      <code>{`const response = await fetch('/api/sync/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${process.env.NEXT_PUBLIC_SYNC_API_KEY || 'roam-sync-key-2025'}',
  },
  body: JSON.stringify({
    stations: [
      {
        chargerId: "#RP-KE-A-01",
        name: "Roam Point - Pangani 1",
        type: "point",
        status: "operational",
        address: "Pangani, Nairobi",
        neighborhood: "Pangani",
        latitude: -1.266212,
        longitude: 36.835316,
      },
    ],
  }),
});

const result = await response.json();
// result: { message, summary: { created, updated, unchanged, errors }, changes, durationMs }`}</code>
                    </pre>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-150 dark:border-zinc-855 rounded-2xl bg-white dark:bg-[#141414] shadow-sm">
                <CardHeader className="pb-3 border-b border-gray-50 dark:border-zinc-800">
                  <CardTitle className="text-sm font-semibold uppercase tracking-widest text-[--roam-gray-dark] dark:text-zinc-200 flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-[--roam-orange]" />
                    Webhook Endpoint: POST /api/sync/webhook
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <p className="text-[10px] text-[--roam-gray-mid]">
                    Generic webhook that accepts flexible payload formats. Same authentication via <code className="text-[10px] bg-muted px-1 rounded">x-api-key</code> header.
                  </p>
                  <pre className="bg-slate-950 text-slate-205 rounded-2xl p-4 text-[11px] overflow-x-auto font-mono">
                    <code>{`# Supported formats:
# { "stations": [...] }
# { "data": { "stations": [...] } }
# { "items": [...] }
# { "payload": [...] }
# Pure array: [...]

curl -X POST /api/sync/webhook \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${process.env.NEXT_PUBLIC_SYNC_API_KEY || 'roam-sync-key-2025'}" \\
  -d '{"stations": [...]} '`}</code>
                  </pre>
                </CardContent>
              </Card>

              <Card className="border border-gray-150 dark:border-zinc-855 rounded-2xl bg-white dark:bg-[#141414] shadow-sm">
                <CardHeader className="pb-3 border-b border-gray-50 dark:border-zinc-800">
                  <CardTitle className="text-sm font-semibold uppercase tracking-widest text-[--roam-gray-dark] dark:text-zinc-200">Available Endpoints</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {[
                      { method: 'POST', path: '/api/sync/upload', desc: 'Upload Excel file (FormData)' },
                      { method: 'POST', path: '/api/sync/rescan', desc: 'Re-scan upload directory' },
                      { method: 'POST', path: '/api/sync/data', desc: 'Push JSON data (API key required)' },
                      { method: 'POST', path: '/api/sync/webhook', desc: 'Webhook receiver (API key required)' },
                      { method: 'GET', path: '/api/sync/history', desc: 'Get sync logs & stats' },
                      { method: 'GET', path: '/api/sync/config', desc: 'Get sync config' },
                      { method: 'PUT', path: '/api/sync/config', desc: 'Update sync config' },
                    ].map((ep) => (
                      <div key={ep.path} className="flex items-center gap-2 text-xs text-[--roam-gray-dark] dark:text-zinc-350">
                        <Badge className={`text-[9px] w-14 justify-center border-none rounded-full ${ep.method === 'GET' ? 'bg-[--roam-gray-light] text-[--roam-gray-dark]' : 'bg-[--roam-orange-light] text-[--roam-orange]'}`}>
                          {ep.method}
                        </Badge>
                        <code className="text-[11px] font-mono bg-muted dark:bg-zinc-800 px-1.5 py-0.5 rounded">{ep.path}</code>
                        <span className="text-[10px] text-[--roam-gray-mid] ml-auto">{ep.desc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
