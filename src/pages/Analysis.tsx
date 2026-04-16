import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar, CheckCircle2, ChevronRight, Copy, Download, ExternalLink,
  FileText, Hash, Info, MessageSquare, Send, ShieldCheck, UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../services/api';

type Panel = 'note' | 'assign' | 'manual' | 'ai' | 'audit' | null;

interface WorkspaceState {
  note: string;
  assignee: string;
  manualItems: string[];
  aiDraft: string;
  status: string;
  archived: boolean;
  audit: string[];
}

const DEFAULT_STATE: WorkspaceState = {
  note: '',
  assignee: '',
  manualItems: [],
  aiDraft: '',
  status: 'Analysis Complete',
  archived: false,
  audit: [],
};

const REVIEWERS = ['Priya Shah', 'Arjun Mehta', 'Nisha Kapoor'];

const getIssueTone = (status: string) => {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'compliant') {
    return {
      badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      panel: 'border-emerald-500/20 bg-emerald-500/5',
      recommendation: 'text-emerald-200',
    };
  }

  if (normalized === 'missing' || normalized === 'non-compliant') {
    return {
      badge: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
      panel: 'border-rose-500/20 bg-rose-500/5',
      recommendation: 'text-rose-200',
    };
  }

  return {
    badge: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    panel: 'border-amber-500/20 bg-amber-500/5',
    recommendation: 'text-amber-100',
  };
};

const getComplianceTone = (status: string) => {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'compliant') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (normalized.includes('review') || normalized === 'warning') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  if (normalized.includes('non-compliant')) {
    return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
  }

  return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
};

const getRiskTone = (score: number) => {
  if (score >= 70) return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
  if (score >= 40) return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
};

const getBlockchainTone = (status: string) => {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'confirmed') {
    return 'text-sky-300';
  }

  if (normalized === 'not registered' || normalized === 'local only') {
    return 'text-zinc-300';
  }

  if (normalized === 'failed') {
    return 'text-rose-300';
  }

  return 'text-amber-300';
};

const Analysis: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success');
  const [workspace, setWorkspace] = useState<WorkspaceState>(DEFAULT_STATE);
  const [resolvedContractId, setResolvedContractId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'share' | 'status' | null>(null);
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryContractId = searchParams.get('contractId');

  useEffect(() => {
    const loadAnalysis = async () => {
      if (queryContractId) {
        try {
          const response = await authFetch(`/api/contracts/${queryContractId}`);
          const body = await response.json();
          if (!response.ok) {
            throw new Error(body.error || 'Failed to load contract analysis');
          }

          const latestBlockchain = Array.isArray(body.blockchain) && body.blockchain.length > 0
            ? body.blockchain[0]
            : {
                hash: body.hash,
                txId: 'N/A',
                blockNumber: 0,
                timestamp: new Date().toISOString(),
                status: 'Not registered',
                contractAddress: 'N/A',
                explorerUrl: '#',
              };

          const loaded = {
            analysis: body.analysis,
            blockchain: {
              hash: body.hash,
              ...latestBlockchain,
            },
            fileName: body.fileName,
            fileSize: body.fileSize,
            contractId: body.id,
            status: body.status,
          };

          setData(loaded);
          setResolvedContractId(body.id);
          sessionStorage.setItem('last_analysis', JSON.stringify(loaded));
          return;
        } catch (err: any) {
          setMessage(err.message || 'Failed to load contract analysis.');
        }
      }

      const saved = sessionStorage.getItem('last_analysis');
      if (saved) {
        const parsed = JSON.parse(saved);
        setData(parsed);
        setResolvedContractId(parsed.contractId || null);
      }
    };

    loadAnalysis();
  }, [queryContractId]);

  const storageKey = `analysis_workspace:${resolvedContractId || data?.contractId || data?.fileName || 'current'}`;

  useEffect(() => {
    const resolveContractId = async () => {
      if (!data || resolvedContractId) return;
      if (!data?.blockchain?.hash && !data?.fileName) return;

      try {
        const response = await authFetch('/api/contracts');
        const body = await response.json();
        if (!response.ok) return;

        const matched = (body.items || []).find((item: any) =>
          (data?.blockchain?.hash && item.hash === data.blockchain.hash) ||
          (data?.fileName && item.fileName === data.fileName)
        );

        if (matched?.id) {
          setResolvedContractId(matched.id);
          const nextData = { ...data, contractId: matched.id };
          setData(nextData);
          sessionStorage.setItem('last_analysis', JSON.stringify(nextData));
        }
      } catch {
        // Keep the page usable even if contract recovery fails.
      }
    };

    resolveContractId();
  }, [data, resolvedContractId]);

  useEffect(() => {
    if (!data) return;
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      setWorkspace({ ...DEFAULT_STATE, ...JSON.parse(saved) });
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [data, storageKey]);

  useEffect(() => {
    if (data) localStorage.setItem(storageKey, JSON.stringify(workspace));
  }, [data, storageKey, workspace]);

  if (!data) {
    return <div className="p-8 text-zinc-400">Please upload a contract to see the analysis.</div>;
  }

  const { analysis, blockchain, fileName, fileSize } = data;
  const contractId = (resolvedContractId || data?.contractId) as string | undefined;
  const issues = Array.isArray(analysis?.issues) ? analysis.issues : [];
  const flagged = issues.filter((issue: any) => issue.status !== 'Compliant');
  const manualChecklist = flagged.map((issue: any) => issue.recommendation || `Review ${issue.clause}`);
  const aiDraft = workspace.aiDraft || buildAiDraft(fileName, flagged);
  const complianceTone = getComplianceTone(analysis?.complianceStatus || 'Unknown');
  const riskTone = getRiskTone(Number(analysis?.overallRiskScore ?? 0));

  const logAction = (entry: string) => {
    setMessageTone('success');
    setMessage(entry);
    setWorkspace((current) => ({
      ...current,
      audit: [`${new Date().toLocaleString()}: ${entry}`, ...current.audit].slice(0, 10),
    }));
  };

  const showError = (entry: string) => {
    setMessageTone('error');
    setMessage(entry);
  };

  const exportReport = () => {
    const content = [
      `Contract: ${fileName}`,
      `Status: ${analysis?.complianceStatus || 'Unknown'}`,
      `Risk Score: ${analysis?.overallRiskScore ?? 0}/100`,
      `Workspace Status: ${workspace.status}`,
      `Assigned To: ${workspace.assignee || 'Not assigned'}`,
      '',
      analysis?.summary || 'No summary available.',
      '',
      'Findings:',
      ...issues.map((issue: any, index: number) => `${index + 1}. ${issue.clause} - ${issue.description}`),
      '',
      'Legal Note:',
      workspace.note || 'No note saved.',
      '',
      'AI Draft:',
      aiDraft,
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName.replace(/\s+/g, '-').toLowerCase()}-report.txt`;
    link.click();
    URL.revokeObjectURL(url);
    logAction('Analysis report exported.');
  };

  const copyText = async (value: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!copied) {
      throw new Error('Clipboard copy failed');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-cyan-500/10 text-cyan-300 text-[10px] font-bold uppercase tracking-widest rounded-full border border-cyan-500/20">{workspace.status}</span>
            <span className="text-zinc-500 text-sm">{new Date().toLocaleDateString()}</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{fileName}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-xl text-sm font-bold text-white hover:bg-zinc-800 flex items-center gap-2" onClick={exportReport}>
            <Download className="w-4 h-4" />
            Export Report
          </button>
          <button
            className="px-4 py-2 bg-zinc-900 border border-cyan-500/40 rounded-xl text-sm font-bold text-cyan-300 hover:bg-zinc-800 flex items-center gap-2"
            onClick={async () => {
              setBusyAction('share');
              try {
                if (contractId) {
                  const response = await authFetch(`/api/contracts/${contractId}/share`, { method: 'POST' });
                  const body = await response.json();
                  if (!response.ok) {
                    throw new Error(body.error || 'Failed to share analysis');
                  }
                  await copyText(body.shareText);
                } else {
                  await copyText(window.location.href);
                }
                logAction('Analysis summary copied to clipboard.');
              } catch (err: any) {
                showError(err.message || 'Unable to copy analysis link.');
              } finally {
                setBusyAction(null);
              }
            }}
            disabled={busyAction !== null}
          >
            <Send className="w-4 h-4" />
            {busyAction === 'share' ? 'Sharing...' : 'Share Analysis'}
          </button>
          <button
            className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-xl text-sm font-bold text-slate-950 hover:from-cyan-300 hover:to-emerald-300"
            onClick={async () => {
              setBusyAction('status');
              const next = user?.role === 'Client'
                ? 'Review requested from legal team.'
                : user?.role === 'Legal Reviewer'
                  ? 'Review finalized and ready for approval.'
                  : 'Contract approved for downstream processing.';
              try {
                if (contractId) {
                  const mappedStatus = user?.role === 'Client'
                    ? 'Review requested'
                    : user?.role === 'Legal Reviewer'
                      ? 'Review finalized'
                      : 'Approved';
                  const response = await authFetch(`/api/contracts/${contractId}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: mappedStatus }),
                  });
                  const body = await response.json();
                  if (!response.ok) {
                    throw new Error(body.error || 'Failed to update contract status');
                  }
                } else {
                  throw new Error('This analysis is missing its contract link. Re-open it from a fresh upload or dashboard record.');
                }
                setWorkspace((current) => ({ ...current, status: next }));
                setData((current: any) => current ? { ...current, status: next } : current);
                const sessionValue = sessionStorage.getItem('last_analysis');
                if (sessionValue) {
                  const parsed = JSON.parse(sessionValue);
                  sessionStorage.setItem('last_analysis', JSON.stringify({ ...parsed, status: next }));
                }
                logAction(next);
              } catch (err: any) {
                showError(err.message || 'Failed to update contract status.');
              } finally {
                setBusyAction(null);
              }
            }}
            disabled={busyAction !== null}
          >
            {busyAction === 'status'
              ? 'Updating...'
              : user?.role === 'Client'
                ? 'Request Review'
                : user?.role === 'Legal Reviewer'
                  ? 'Finalize Review'
                  : 'Approve Contract'}
          </button>
        </div>
      </header>

      {message && (
        <div className={`mb-6 rounded-2xl border p-4 text-sm ${
          messageTone === 'success'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : 'border-red-500/30 bg-red-500/10 text-red-300'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8">
            <h3 className="text-xl font-bold text-white mb-6">Compliance Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetaCard label="Status" value={analysis?.complianceStatus || 'Unknown'} icon={<Info className="w-4 h-4" />} toneClass={complianceTone} />
              <MetaCard label="Risk Score" value={`${analysis?.overallRiskScore ?? 0}/100`} icon={<ShieldCheck className="w-4 h-4" />} toneClass={riskTone} />
              <MetaCard label="Clauses" value={String(issues.length)} icon={<CheckCircle2 className="w-4 h-4" />} toneClass="border-violet-500/30 bg-violet-500/10 text-violet-300" />
            </div>
            {analysis?.summary && <p className="mt-6 text-sm text-zinc-300 leading-relaxed">{analysis.summary}</p>}
          </div>

          <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8">
            <h3 className="text-xl font-bold text-white mb-6">Detailed Findings</h3>
            <div className="space-y-4">
              {issues.length === 0 && <p className="text-sm text-zinc-400">No clause-level findings were returned.</p>}
              {issues.map((issue: any, index: number) => {
                const tone = getIssueTone(issue.status);
                return (
                <div key={`${issue.clause}-${index}`} className={`rounded-2xl border p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] ${tone.panel}`}>
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-white font-bold">{issue.clause}</h4>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${tone.badge}`}>{issue.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-300">{issue.description}</p>
                  {issue.recommendation && <p className={`mt-3 text-sm ${tone.recommendation}`}>Recommendation: {issue.recommendation}</p>}
                </div>
              )})}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6">
            <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Blockchain Proof</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500 flex items-center gap-2"><Hash className="w-4 h-4" />Contract Hash</span>
                <button
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                  onClick={async () => {
                    try {
                      await copyText(blockchain.hash);
                      logAction('Contract hash copied to clipboard.');
                    } catch {
                      showError('Unable to copy contract hash.');
                    }
                  }}
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <p className="font-mono text-[11px] break-all text-zinc-300">{blockchain.hash}</p>
              <p className="text-zinc-400">Status: <span className={getBlockchainTone(blockchain.status)}>{blockchain.status}</span></p>
              {blockchain.explorerUrl && blockchain.explorerUrl !== '#' && (
                <a href={blockchain.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200">
                  View on Explorer
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6">
            <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Document Metadata</h4>
            <div className="space-y-3 text-sm text-zinc-300">
              <MetaRow icon={<FileText className="w-4 h-4" />} label="File Size" value={fileSize} />
              <MetaRow icon={<Calendar className="w-4 h-4" />} label="Uploaded" value={new Date().toLocaleDateString()} />
              <MetaRow icon={<UserPlus className="w-4 h-4" />} label="Assigned To" value={workspace.assignee || 'Not assigned'} />
              <MetaRow icon={<Info className="w-4 h-4" />} label="Workspace" value={workspace.archived ? 'Archived' : 'Active'} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/8 via-zinc-900/70 to-violet-500/8 border border-cyan-500/10 rounded-3xl p-6">
            <h4 className="text-sm font-bold text-cyan-300 uppercase tracking-wider mb-4">Suggested Actions</h4>
            <div className="space-y-3">
              {user?.role === 'Legal Reviewer' && (
                <>
                  <ActionButton label="Add Legal Note" icon={<MessageSquare className="w-4 h-4" />} active={panel === 'note'} onClick={() => setPanel('note')} />
                  <ActionButton label="Assign to Senior Partner" icon={<UserPlus className="w-4 h-4" />} active={panel === 'assign'} onClick={() => setPanel('assign')} />
                </>
              )}
              {user?.role !== 'Client' && (
                <ActionButton label={workspace.archived ? 'Restore Contract' : 'Archive Contract'} icon={<ChevronRight className="w-4 h-4" />} onClick={() => {
                  const nextArchived = !workspace.archived;
                  setWorkspace((current) => ({ ...current, archived: nextArchived }));
                  logAction(nextArchived ? 'Contract archived.' : 'Contract restored.');
                }} />
              )}
              <ActionButton label="Amendments (Manual)" icon={<ChevronRight className="w-4 h-4" />} active={panel === 'manual'} onClick={() => setPanel('manual')} />
              <ActionButton label="Amendments (AI)" icon={<ChevronRight className="w-4 h-4" />} active={panel === 'ai'} onClick={() => setPanel('ai')} />
              <ActionButton label="Audit History" icon={<ChevronRight className="w-4 h-4" />} active={panel === 'audit'} onClick={() => setPanel('audit')} />
            </div>

            {panel === 'note' && (
              <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-black/20 p-4 space-y-3">
                <textarea
                  value={workspace.note}
                  onChange={(event) => setWorkspace((current) => ({ ...current, note: event.target.value }))}
                  placeholder="Add a practical legal review note..."
                  className="w-full min-h-28 rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-zinc-200 outline-none focus:border-cyan-400"
                />
                <button className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300" onClick={() => {
                  if (!workspace.note.trim()) return showError('Write a note before saving.');
                  logAction('Legal note saved.');
                }}>
                  Save Note
                </button>
              </div>
            )}

            {panel === 'assign' && (
              <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-black/20 p-4 space-y-3">
                <select
                  value={workspace.assignee}
                  onChange={(event) => setWorkspace((current) => ({ ...current, assignee: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-zinc-200 outline-none focus:border-cyan-400"
                >
                  <option value="">Select a senior partner</option>
                  {REVIEWERS.map((reviewer) => <option key={reviewer} value={reviewer}>{reviewer}</option>)}
                </select>
                <button className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300" onClick={() => {
                  if (!workspace.assignee) return showError('Select a reviewer first.');
                  logAction(`Assigned to ${workspace.assignee}.`);
                }}>
                  Confirm Assignment
                </button>
              </div>
            )}

            {panel === 'manual' && (
              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-black/20 p-4 space-y-3">
                {manualChecklist.length === 0 && <p className="text-sm text-zinc-400">No manual amendments suggested.</p>}
                {manualChecklist.map((item: string) => {
                  const checked = workspace.manualItems.includes(item);
                  return (
                    <label key={item} className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${checked ? 'border-amber-500/40 bg-amber-500/10 text-white' : 'border-white/10 bg-zinc-950 text-zinc-300'}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setWorkspace((current) => ({
                          ...current,
                          manualItems: checked ? current.manualItems.filter((entry: string) => entry !== item) : [...current.manualItems, item],
                        }))}
                        className="mt-1"
                      />
                      <span>{item}</span>
                    </label>
                  );
                })}
                <button className="rounded-xl border border-amber-500/30 px-4 py-2 text-sm font-bold text-amber-300 hover:bg-amber-500/10" onClick={async () => {
                  const items = workspace.manualItems.length ? workspace.manualItems : manualChecklist;
                  try {
                    await copyText(items.join('\n'));
                    logAction('Manual amendment checklist copied.');
                  } catch {
                    showError('Unable to copy manual checklist.');
                  }
                }}>
                  Copy Checklist
                </button>
              </div>
            )}

            {panel === 'ai' && (
              <div className="mt-4 rounded-2xl border border-violet-500/20 bg-black/20 p-4 space-y-3">
                <textarea
                  value={aiDraft}
                  onChange={(event) => setWorkspace((current) => ({ ...current, aiDraft: event.target.value }))}
                  className="w-full min-h-52 rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-zinc-200 outline-none focus:border-violet-400"
                />
                <div className="flex gap-2">
                  <button className="rounded-xl bg-violet-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-violet-300" onClick={() => {
                    setWorkspace((current) => ({ ...current, aiDraft: buildAiDraft(fileName, flagged) }));
                    logAction('AI amendment draft refreshed.');
                  }}>
                    Refresh Draft
                  </button>
                  <button className="rounded-xl border border-violet-500/30 px-4 py-2 text-sm font-bold text-violet-300 hover:bg-violet-500/10" onClick={async () => {
                    try {
                      await copyText(aiDraft);
                      logAction('AI amendment draft copied.');
                    } catch {
                      showError('Unable to copy AI amendment draft.');
                    }
                  }}>
                    Copy Draft
                  </button>
                </div>
              </div>
            )}

            {panel === 'audit' && (
              <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-black/20 p-4 space-y-3">
                {workspace.audit.length === 0 && <p className="text-sm text-zinc-400">No actions recorded yet.</p>}
                {workspace.audit.map((entry) => (
                  <div key={entry} className="rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">{entry}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function ActionButton({ label, icon, active = false, onClick }: { label: string; icon: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button className={`group w-full flex items-center justify-between p-3 rounded-xl ${active ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-white/5 hover:bg-white/10 border border-transparent'}`} onClick={onClick}>
      <span className="text-sm text-zinc-300">{label}</span>
      <span className={`${active ? 'text-cyan-300' : 'text-zinc-500'}`}>{icon}</span>
    </button>
  );
}

function MetaCard({ label, value, icon, toneClass }: { label: string; value: string; icon: React.ReactNode; toneClass: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-90">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-zinc-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xs font-bold text-white">{value}</span>
    </div>
  );
}

function buildAiDraft(fileName: string, flaggedIssues: any[]) {
  if (!flaggedIssues.length) {
    return `Amendment Draft for ${fileName}\n\nNo material compliance gaps were detected. Maintain the current draft and record approval notes.`;
  }

  return [
    `Amendment Draft for ${fileName}`,
    '',
    ...flaggedIssues.map((issue: any, index: number) => `${index + 1}. ${issue.clause}: ${issue.recommendation || issue.description}`),
    '',
    'Next step: update the redline, circulate for approval, and re-run compliance review.',
  ].join('\n');
}

export default Analysis;
