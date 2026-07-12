import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardDocumentCheckIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  UsersIcon,
  TagIcon,
  FunnelIcon,
  CalendarDaysIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { auditService } from '../services/auditService';
import { userService, departmentService } from '../services/orgService';
import SlidePanel from '../components/SlidePanel';
import Modal from '../components/Modal';

// Badge color configuration
const BADGE_STYLES = {
  Open:   'bg-blue-900/40 text-blue-300 ring-blue-800/60',
  Closed: 'bg-slate-800 text-slate-400 ring-slate-700/60',
};

const RESULT_STYLES = {
  Pending:  'bg-amber-900/20 text-amber-400 ring-amber-800/40',
  Verified: 'bg-emerald-950/40 text-emerald-400 ring-emerald-800/60',
  Missing:  'bg-red-950/40 text-red-400 ring-red-850/60',
  Damaged:  'bg-orange-950/40 text-orange-400 ring-orange-850/60',
};

const Audit = () => {
  const { user } = useAuth();
  const isManager = ['Admin', 'AssetManager'].includes(user?.role);

  // States
  const [cycles, setCycles]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [activeTab, setActiveTab] = useState('checklist'); // 'checklist' | 'discrepancies'

  // Dropdowns for form
  const [users, setUsers]       = useState([]);
  const [depts, setDepts]       = useState([]);

  // Form states
  const [panelOpen, setPanelOpen] = useState(false);
  const [formData, setFormData]   = useState({
    title: '',
    department: '',
    location: '',
    dateRangeStart: '',
    dateRangeEnd: '',
    assignedAuditors: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr]     = useState('');

  // Item verification states
  const [verifyModal, setVerifyModal] = useState({ open: false, item: null, result: '' });
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifying, setVerifying]     = useState(false);

  // Close cycle states
  const [closeModal, setCloseModal] = useState(false);
  const [closing, setClosing]       = useState(false);

  const fetchCycles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await auditService.getAll();
      setCycles(data.data.cycles);
      if (selectedCycle) {
        // Reload details for current selected cycle
        const updated = await auditService.getOne(selectedCycle._id);
        setSelectedCycle(updated.data.data.cycle);
      }
    } catch { /* Handled */ }
    finally { setLoading(false); }
  }, [selectedCycle]);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  const loadFormResources = async () => {
    try {
      const [uRes, dRes] = await Promise.all([
        userService.getAll({ limit: 500 }),
        departmentService.getAll({ status: 'Active', limit: 200 }),
      ]);
      setUsers(uRes.data.data.users);
      setDepts(dRes.data.data.departments);
    } catch { /* Handled */ }
  };

  const handleOpenPanel = () => {
    setFormErr('');
    setFormData({
      title: '',
      department: '',
      location: '',
      dateRangeStart: '',
      dateRangeEnd: '',
      assignedAuditors: [],
    });
    loadFormResources();
    setPanelOpen(true);
  };

  const handleAuditorSelect = (userId) => {
    setFormData((f) => {
      const exists = f.assignedAuditors.includes(userId);
      const updated = exists
        ? f.assignedAuditors.filter((id) => id !== userId)
        : [...f.assignedAuditors, userId];
      return { ...f, assignedAuditors: updated };
    });
  };

  const handleCreateCycle = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.dateRangeStart || !formData.dateRangeEnd) {
      setFormErr('Title and date range are required.');
      return;
    }
    setSubmitting(true);
    setFormErr('');
    try {
      await auditService.create(formData);
      setPanelOpen(false);
      fetchCycles();
    } catch (err) {
      setFormErr(err.response?.data?.message || 'Failed to create audit cycle.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectCycleForDetail = async (cycle) => {
    setLoading(true);
    try {
      const { data } = await auditService.getOne(cycle._id);
      setSelectedCycle(data.data.cycle);
      setActiveTab('checklist');
    } catch { /* Handled */ }
    finally { setLoading(false); }
  };

  const handleVerifyClick = (item, result) => {
    setVerifyNotes(item.notes || '');
    setVerifyModal({ open: true, item, result });
  };

  const handleVerifySubmit = async () => {
    if (!verifyModal.item || !verifyModal.result) return;
    setVerifying(true);
    try {
      await auditService.updateItem(selectedCycle._id, verifyModal.item._id, {
        result: verifyModal.result,
        notes:  verifyNotes,
      });
      setVerifyModal({ open: false, item: null, result: '' });
      setVerifyNotes('');
      // Reload cycle
      const { data } = await auditService.getOne(selectedCycle._id);
      setSelectedCycle(data.data.cycle);
    } catch { /* Handled */ }
    finally { setVerifying(false); }
  };

  const handleCloseConfirm = async () => {
    if (!selectedCycle) return;
    setClosing(true);
    try {
      await auditService.close(selectedCycle._id);
      setCloseModal(false);
      // Reload cycle
      const { data } = await auditService.getOne(selectedCycle._id);
      setSelectedCycle(data.data.cycle);
      fetchCycles();
    } catch { /* Handled */ }
    finally { setClosing(false); }
  };

  const getCompletionStats = (cycle) => {
    if (!cycle?.auditItems) return { pct: 0, verified: 0, pending: 0, discrepancies: 0 };
    const total = cycle.auditItems.length;
    if (total === 0) return { pct: 100, verified: 0, pending: 0, discrepancies: 0 };
    const verified = cycle.auditItems.filter((i) => i.result === 'Verified').length;
    const missing  = cycle.auditItems.filter((i) => i.result === 'Missing').length;
    const damaged  = cycle.auditItems.filter((i) => i.result === 'Damaged').length;
    const discrepancies = missing + damaged;
    const completed = verified + discrepancies;
    return {
      pct: Math.round((completed / total) * 100),
      verified,
      pending: total - completed,
      discrepancies,
      total,
    };
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Asset Audit Cycles</h2>
          <p className="text-sm text-slate-500 mt-1">Conduct physical item audits, track location discrepancies, and lock verified inventory lists</p>
        </div>
        {!selectedCycle && isManager && (
          <button onClick={handleOpenPanel} className="btn-primary gap-1.5 shrink-0">
            <PlusIcon className="w-4 h-4" /> Start Audit Cycle
          </button>
        )}
      </div>

      {selectedCycle ? (
        /* ── DETAIL VIEW ── */
        <div className="space-y-5 animate-fade-in">
          {/* Back Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedCycle(null)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" /> Back to Cycles List
            </button>
            {selectedCycle.status === 'Open' && isManager && (
              <button
                onClick={() => setCloseModal(true)}
                className="btn-ghost border border-red-950 text-red-500 hover:bg-red-950/20 text-xs py-1.5 px-3 rounded-lg"
              >
                Close & Lock Cycle
              </button>
            )}
          </div>

          {/* Metadata Card */}
          <div className="card p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100">{selectedCycle.title}</h3>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${BADGE_STYLES[selectedCycle.status]}`}>
                  {selectedCycle.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 font-mono">
                <CalendarDaysIcon className="w-4 h-4 shrink-0 text-slate-600" />
                {formatDate(selectedCycle.dateRangeStart)} - {formatDate(selectedCycle.dateRangeEnd)}
              </p>
              {selectedCycle.department && (
                <p className="text-xs text-slate-400">
                  Scope Department: <span className="text-slate-200 font-medium">{selectedCycle.department.name}</span>
                </p>
              )}
              {selectedCycle.location && (
                <p className="text-xs text-slate-400">
                  Scope Location: <span className="text-slate-200 font-medium">{selectedCycle.location}</span>
                </p>
              )}
            </div>

            {/* Auditors */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest flex items-center gap-1">
                <UsersIcon className="w-3.5 h-3.5 shrink-0" /> Assigned Auditors
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedCycle.assignedAuditors?.length === 0 && (
                  <span className="text-slate-600 text-xs italic">— None —</span>
                )}
                {selectedCycle.assignedAuditors?.map((aud) => (
                  <span key={aud._id} className="badge badge-muted text-[10px]">{aud.name}</span>
                ))}
              </div>
            </div>

            {/* Progress stats */}
            <div className="space-y-2.5">
              {(() => {
                const stats = getCompletionStats(selectedCycle);
                return (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold uppercase">Progress</span>
                      <span className="text-primary-400 font-bold">{stats.pct}% Completed</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-surface-border rounded-full h-1.5 overflow-hidden">
                      <div className="bg-primary-600 h-full transition-all duration-300" style={{ width: `${stats.pct}%` }} />
                    </div>
                    <div className="grid grid-cols-3 text-center text-[10px] text-slate-500 mt-1">
                      <div>
                        <p className="font-semibold text-slate-400">{stats.verified}</p>
                        <p>Verified</p>
                      </div>
                      <div className="text-red-400">
                        <p className="font-semibold">{stats.discrepancies}</p>
                        <p>Discrepancies</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-400">{stats.pending}</p>
                        <p>Pending</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-1 bg-surface-card border border-surface-border rounded-xl p-1 w-fit">
            <button
              onClick={() => setActiveTab('checklist')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'checklist' ? 'bg-primary-600/20 text-primary-300' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Auditor Checklist
            </button>
            <button
              onClick={() => setActiveTab('discrepancies')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'discrepancies' ? 'bg-primary-600/20 text-primary-300' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Discrepancy Report
            </button>
          </div>

          {/* Checklist Tab */}
          {activeTab === 'checklist' && (
            <div className="card p-0 overflow-hidden">
              {selectedCycle.auditItems?.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-16">No assets scoped in this cycle.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-surface-border text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-6 py-4">Asset Details</th>
                        <th className="px-6 py-4">Asset Tag</th>
                        <th className="px-6 py-4">Auditor Notes</th>
                        <th className="px-6 py-4">Verification</th>
                        <th className="px-6 py-4">Checklist Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {selectedCycle.auditItems.map((item) => {
                        const isAuditor = selectedCycle.assignedAuditors.some((a) => a._id === user?._id);
                        const canAudit  = selectedCycle.status === 'Open' && (isManager || isAuditor);
                        return (
                          <tr key={item._id} className="hover:bg-white/[0.01]">
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-200">{item.asset?.name || 'Deleted Asset'}</p>
                              <p className="text-xs text-slate-500 mt-0.5">SN: {item.asset?.serialNumber || '—'}</p>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-slate-400 font-semibold">{item.asset?.assetTag || '—'}</td>
                            <td className="px-6 py-4">
                              <p className="text-slate-300 text-xs max-w-xs truncate">{item.notes || '—'}</p>
                              {item.auditor && (
                                <p className="text-[10px] text-slate-500 mt-0.5">Logged by {item.auditor.name}</p>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`badge ${RESULT_STYLES[item.result] || RESULT_STYLES.Pending}`}>
                                {item.result}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {canAudit ? (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleVerifyClick(item, 'Verified')}
                                    className="btn-ghost border border-emerald-950 text-emerald-400 hover:bg-emerald-950/20 text-xs py-0.5 px-2 rounded-lg"
                                  >
                                    Verify
                                  </button>
                                  <button
                                    onClick={() => handleVerifyClick(item, 'Missing')}
                                    className="btn-ghost border border-red-950 text-red-400 hover:bg-red-950/20 text-xs py-0.5 px-2 rounded-lg"
                                  >
                                    Missing
                                  </button>
                                  <button
                                    onClick={() => handleVerifyClick(item, 'Damaged')}
                                    className="btn-ghost border border-orange-950 text-orange-400 hover:bg-orange-950/20 text-xs py-0.5 px-2 rounded-lg"
                                  >
                                    Damaged
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-600 text-xs">— Locked —</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Discrepancies Tab */}
          {activeTab === 'discrepancies' && (
            <div className="card p-0 overflow-hidden">
              {(() => {
                const discItems = selectedCycle.auditItems.filter((i) => ['Missing', 'Damaged'].includes(i.result));
                return discItems.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm py-16">No discrepancies reported in this cycle yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    {selectedCycle.status === 'Open' && (
                      <div className="bg-amber-950/20 border-b border-surface-border p-4 flex items-start gap-2.5">
                        <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-xs text-amber-400 font-semibold">Active Discrepancies Listed Below</p>
                          <p className="text-[10px] text-slate-500 leading-relaxed">
                            Once this audit cycle is Closed and locked, all assets labeled <span className="text-red-400 font-semibold">Missing</span> will have their statuses updated to <span className="text-red-400 font-semibold">Lost</span> in the database.
                          </p>
                        </div>
                      </div>
                    )}
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-surface-border text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="px-6 py-4">Asset Details</th>
                          <th className="px-6 py-4">Asset Tag</th>
                          <th className="px-6 py-4">Audited By</th>
                          <th className="px-6 py-4">Discrepancy State</th>
                          <th className="px-6 py-4">Auditor Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        {discItems.map((item) => (
                          <tr key={item._id} className="hover:bg-white/[0.01]">
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-200">{item.asset?.name || 'Deleted Asset'}</p>
                              <p className="text-xs text-slate-500 mt-0.5">Location: {item.asset?.location || '—'}</p>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-slate-400 font-semibold">{item.asset?.assetTag || '—'}</td>
                            <td className="px-6 py-4 text-slate-400 text-xs">{item.auditor?.name || '—'}</td>
                            <td className="px-6 py-4">
                              <span className={`badge ${item.result === 'Missing' ? RESULT_STYLES.Missing : RESULT_STYLES.Damaged}`}>
                                {item.result}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-300 text-xs">{item.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      ) : (
        /* ── CYCLES LIST ── */
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : cycles.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <ClipboardDocumentCheckIcon className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="font-medium">No audit cycles started yet</p>
              {isManager && (
                <button onClick={handleOpenPanel} className="text-primary-400 hover:underline text-sm mt-1">
                  Start the first audit cycle now
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-surface-border text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Cycle Details</th>
                    <th className="px-6 py-4">Date Range</th>
                    <th className="px-6 py-4">Scope Filters</th>
                    <th className="px-6 py-4">Completion Stats</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {cycles.map((cycle) => {
                    const stats = getCompletionStats(cycle);
                    return (
                      <tr
                        key={cycle._id}
                        onClick={() => selectCycleForDetail(cycle)}
                        className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-200">{cycle.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Created by {cycle.createdBy?.name || 'Manager'}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                          {formatDate(cycle.dateRangeStart)} - {formatDate(cycle.dateRangeEnd)}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs">
                          {cycle.department && <p>Dept: {cycle.department.name}</p>}
                          {cycle.location && <p>Location: {cycle.location}</p>}
                          {!cycle.department && !cycle.location && <p className="italic text-slate-600">Global (All Assets)</p>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {/* Small progress circle or stats */}
                            <span className="font-semibold text-slate-300">{stats.pct}%</span>
                            <span className="text-xs text-slate-500">({stats.verified}/{stats.total} assets)</span>
                          </div>
                          {stats.discrepancies > 0 && (
                            <span className="text-[10px] text-red-400 font-medium">➔ {stats.discrepancies} discrepancies</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${BADGE_STYLES[cycle.status]}`}>
                            {cycle.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SlidePanel: Start Audit Cycle */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="Start Audit Cycle" width="max-w-md">
        <form onSubmit={handleCreateCycle} className="space-y-4">
          {formErr && (
            <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg p-3">
              {formErr}
            </div>
          )}
          <Field label="Cycle Title" required>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Q3 Hardware Verification Cycle"
              className="input text-sm"
              required
              disabled={submitting}
            />
          </Field>

          <div className="bg-surface p-3 border border-surface-border rounded-xl space-y-3">
            <p className="text-[10px] text-slate-500 font-semibold uppercase">Verification Scope (Filters)</p>
            <Field label="Department Filter">
              <select
                value={formData.department}
                onChange={(e) => setFormData((f) => ({ ...f, department: e.target.value }))}
                className="input text-sm"
                disabled={submitting}
              >
                <option value="">All Departments</option>
                {depts.map((d) => (
                  <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </Field>
            <Field label="Location Filter">
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Floor 3, Lab A"
                className="input text-sm"
                disabled={submitting}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date" required>
              <input
                type="date"
                value={formData.dateRangeStart}
                onChange={(e) => setFormData((f) => ({ ...f, dateRangeStart: e.target.value }))}
                className="input text-sm font-mono"
                required
                disabled={submitting}
              />
            </Field>
            <Field label="End Date" required>
              <input
                type="date"
                value={formData.dateRangeEnd}
                onChange={(e) => setFormData((f) => ({ ...f, dateRangeEnd: e.target.value }))}
                className="input text-sm font-mono"
                required
                disabled={submitting}
              />
            </Field>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-surface-border">
            <p className="text-xs text-slate-500 font-semibold mb-1">Assign Auditors</p>
            <div className="max-h-36 overflow-y-auto border border-surface-border rounded-xl p-2 bg-surface/50 space-y-1">
              {users.map((u) => {
                const isSelected = formData.assignedAuditors.includes(u._id);
                return (
                  <label key={u._id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleAuditorSelect(u._id)}
                      className="w-3.5 h-3.5 text-primary-600 rounded border-surface-border bg-surface"
                      disabled={submitting}
                    />
                    <span className="text-slate-300">{u.name} ({u.role})</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-surface-border">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating Cycle...
                </span>
              ) : (
                'Generate Cycle'
              )}
            </button>
            <button type="button" onClick={() => setPanelOpen(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* Item Verification Modal */}
      <Modal
        open={verifyModal.open}
        onClose={() => setVerifyModal({ open: false, item: null, result: '' })}
        onConfirm={handleVerifySubmit}
        title={`Verification: ${verifyModal.result}`}
        message={
          <div className="space-y-3">
            <p>
              Verify <span className="font-semibold text-slate-200">{verifyModal.item?.asset?.name}</span>?
            </p>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Auditor Notes</label>
              <textarea
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                rows={2}
                placeholder="Enter notes about physical condition, location verification, etc."
                className="input text-xs resize-none"
              />
            </div>
          </div>
        }
        confirmText="Confirm Verification"
        variant={verifyModal.result === 'Missing' ? 'danger' : verifyModal.result === 'Damaged' ? 'warning' : 'info'}
        loading={verifying}
      />

      {/* Close Cycle Confirmation Modal */}
      <Modal
        open={closeModal}
        onClose={() => setCloseModal(false)}
        onConfirm={handleCloseConfirm}
        title="Lock & Close Audit Cycle"
        message={
          <div className="space-y-3">
            <p>Are you sure you want to close and lock the audit cycle?</p>
            <div className="bg-red-950/20 border border-red-800/40 rounded-xl p-3 flex gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="text-red-400 font-semibold">Important Warning</p>
                <p className="text-slate-400 leading-relaxed">
                  Closing this cycle locks all reports permanently. No further modifications will be allowed.
                  <br />
                  All confirmed <span className="text-red-400 font-bold">Missing</span> items will have their asset status updated to <span className="text-red-400 font-bold">Lost</span> in the database.
                </p>
              </div>
            </div>
          </div>
        }
        confirmText="Close Cycle & Mark Lost"
        variant="danger"
        loading={closing}
      />
    </div>
  );
};

export default Audit;
