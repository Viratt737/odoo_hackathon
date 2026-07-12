import { useState, useEffect, useCallback } from 'react';
import {
  WrenchScrewdriverIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  PhotoIcon,
  TagIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
  BanknotesIcon,
  ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { maintenanceService } from '../services/maintenanceService';
import { assetService } from '../services/assetService';
import SlidePanel from '../components/SlidePanel';
import Modal from '../components/Modal';

// Status styling mapping
const BADGE_STYLES = {
  Pending:            'bg-amber-900/40 text-amber-300 ring-amber-800/60',
  Approved:           'bg-blue-900/40 text-blue-300 ring-blue-800/60',
  Rejected:           'bg-red-900/40 text-red-300 ring-red-800/60',
  TechnicianAssigned: 'bg-indigo-900/40 text-indigo-300 ring-indigo-800/60',
  InProgress:         'bg-orange-900/40 text-orange-300 ring-orange-800/60 animate-pulse',
  Resolved:           'bg-emerald-900/40 text-emerald-300 ring-emerald-800/60',
};

const PRIORITY_BADGES = {
  Low:    'bg-slate-800 text-slate-400 ring-slate-700/60',
  Medium: 'bg-amber-900/20 text-amber-400 ring-amber-800/40',
  High:   'bg-red-900/20 text-red-400 ring-red-800/40',
};

const STEPS = ['Pending', 'Approved', 'TechnicianAssigned', 'InProgress', 'Resolved'];

const STEP_LABELS = {
  Pending:            'Pending Approval',
  Approved:           'Approved',
  TechnicianAssigned: 'Tech Assigned',
  InProgress:         'In Progress',
  Resolved:           'Resolved',
};

const Field = ({ label, required, children, hint }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-slate-400">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-[10px] text-slate-600">{hint}</p>}
  </div>
);

const Maintenance = () => {
  const { user } = useAuth();
  const isManager = ['Admin', 'AssetManager'].includes(user?.role);

  // Lists
  const [requests, setRequests] = useState([]);
  const [assets, setAssets]     = useState([]);
  const [loading, setLoading]   = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Selected item detail view
  const [selectedReq, setSelectedReq] = useState(null);

  // Form states
  const [panelOpen, setPanelOpen] = useState(false);
  const [formData, setFormData]   = useState({ asset: '', issueDescription: '', priority: 'Medium' });
  const [photoFile, setPhotoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr]     = useState('');

  // Modal actions
  const [confirmModal, setConfirmModal] = useState({ open: false, action: '', title: '', message: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // Inline forms
  const [techName, setTechName] = useState('');
  const [resolveForm, setResolveForm] = useState({ resolutionNotes: '', cost: '' });

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await maintenanceService.getAll({
        status: statusFilter,
        priority: priorityFilter,
      });
      setRequests(data.data.requests);
      // Keep detail view synchronized if open
      if (selectedReq) {
        const updated = data.data.requests.find((r) => r._id === selectedReq._id);
        setSelectedReq(updated || null);
      }
    } catch { /* Handled */ }
    finally { setLoading(false); }
  }, [statusFilter, priorityFilter, selectedReq]);

  const loadAssets = async () => {
    try {
      const { data } = await assetService.getAll({ limit: 500 });
      // Exclude retired and disposed assets
      const activeAssets = data.data.assets.filter((a) => !['Retired', 'Disposed'].includes(a.status));
      setAssets(activeAssets);
    } catch { /* Handled */ }
  };

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleOpenPanel = () => {
    setFormErr('');
    setFormData({ asset: '', issueDescription: '', priority: 'Medium' });
    setPhotoFile(null);
    loadAssets();
    setPanelOpen(true);
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!formData.asset || !formData.issueDescription.trim()) {
      setFormErr('Asset and issue description are required.');
      return;
    }
    setSubmitting(true);
    setFormErr('');
    try {
      await maintenanceService.create(formData, photoFile);
      setPanelOpen(false);
      fetchRequests();
    } catch (err) {
      setFormErr(err.response?.data?.message || 'Failed to raise request.');
    } finally {
      setSubmitting(false);
    }
  };

  const triggerActionModal = (action, title, message) => {
    setConfirmModal({ open: true, action, title, message });
  };

  const handleWorkflowAction = async () => {
    if (!selectedReq || !confirmModal.action) return;
    setActionLoading(true);
    try {
      const id = selectedReq._id;
      switch (confirmModal.action) {
        case 'Approve':
          await maintenanceService.approve(id);
          break;
        case 'Reject':
          await maintenanceService.reject(id);
          break;
        case 'AssignTech':
          await maintenanceService.assignTechnician(id, techName);
          setTechName('');
          break;
        case 'Start':
          await maintenanceService.start(id);
          break;
        case 'Resolve':
          await maintenanceService.resolve(id, {
            resolutionNotes: resolveForm.resolutionNotes,
            cost: resolveForm.cost ? Number(resolveForm.cost) : 0,
          });
          setResolveForm({ resolutionNotes: '', cost: '' });
          break;
        default:
          break;
      }
      setConfirmModal({ open: false, action: '', title: '', message: '' });
      fetchRequests();
    } catch (err) {
      // Could capture error and show in modal
    } finally {
      setActionLoading(false);
    }
  };

  const getStepIndex = (status) => {
    if (status === 'Rejected') return -1;
    return STEPS.indexOf(status);
  };

  const formatCost = (val) => {
    if (!val) return '₹0.00';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const stepIdx = selectedReq ? getStepIndex(selectedReq.status) : -1;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Maintenance Management</h2>
          <p className="text-sm text-slate-500 mt-1">Track diagnostic reports, approve work orders, and log resolved maintenance events</p>
        </div>
        <button onClick={handleOpenPanel} className="btn-primary gap-1.5 shrink-0">
          <PlusIcon className="w-4 h-4" /> Raise Request
        </button>
      </div>

      {/* Toolbar filters */}
      <div className="card p-4 flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input text-sm h-10 w-44"
        >
          <option value="">All Workflow Stages</option>
          <option value="Pending">Pending Approval</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="TechnicianAssigned">Tech Assigned</option>
          <option value="InProgress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="input text-sm h-10 w-36"
        >
          <option value="">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>

      {/* Layout Split: Left - Requests Table, Right - Selected Detail Stepper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table list */}
        <div className="lg:col-span-2 card p-0 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-center text-slate-500 py-16 text-sm">No maintenance requests found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-surface-border text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-4">Asset / Request</th>
                    <th className="px-5 py-4">Priority</th>
                    <th className="px-5 py-4">Reported By</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {requests.map((req) => (
                    <tr
                      key={req._id}
                      onClick={() => setSelectedReq(req)}
                      className={`hover:bg-white/[0.01] cursor-pointer transition-colors ${
                        selectedReq?._id === req._id ? 'bg-white/[0.02]' : ''
                      }`}
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-200">{req.asset?.name}</p>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">{req.issueDescription}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ring-1 ${PRIORITY_BADGES[req.priority] || PRIORITY_BADGES.Medium}`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs">
                        <p className="font-medium text-slate-300">{req.raisedBy?.name}</p>
                        <p className="text-slate-500 mt-0.5">{new Date(req.createdAt).toLocaleDateString('en-IN')}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${BADGE_STYLES[req.status] || BADGE_STYLES.Pending}`}>
                          {req.status === 'TechnicianAssigned' ? 'Tech Assigned' : req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Workflow Detail Sidepanel */}
        <div className="space-y-6">
          {selectedReq ? (
            <div className="card p-6 space-y-6 animate-fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-100 text-base">{selectedReq.asset?.name}</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedReq.asset?.assetTag}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${BADGE_STYLES[selectedReq.status]}`}>
                  {selectedReq.status === 'TechnicianAssigned' ? 'Tech Assigned' : selectedReq.status}
                </span>
              </div>

              {/* Progress Stepper Visualiser */}
              {selectedReq.status === 'Rejected' ? (
                <div className="bg-red-950/20 border border-red-800/40 rounded-xl p-3 text-center">
                  <p className="text-xs text-red-400 font-semibold">🚫 Request Rejected</p>
                  <p className="text-[10px] text-slate-500 mt-1">This request has been denied by the Asset Manager.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Workflow Progress</p>
                  <div className="space-y-3 pl-2">
                    {STEPS.map((step, idx) => {
                      const active = idx <= stepIdx;
                      return (
                        <div key={step} className="flex items-center gap-3 relative">
                          {/* Stepper Dot */}
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border z-10 ${
                            active
                              ? 'bg-primary-600/20 border-primary-500 text-primary-400 font-bold text-xs'
                              : 'bg-surface border-surface-border text-slate-600 text-xs'
                          }`}>
                            {active ? '✓' : idx + 1}
                          </div>
                          <span className={`text-xs ${active ? 'text-slate-200 font-semibold' : 'text-slate-600'}`}>
                            {STEP_LABELS[step]}
                          </span>
                          {/* Connector line */}
                          {idx < STEPS.length - 1 && (
                            <div className={`absolute left-2.5 top-5 w-0.5 h-4 -z-0 ${
                              idx < stepIdx ? 'bg-primary-500' : 'bg-surface-border'
                            }`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Description & Attachments */}
              <div className="space-y-2.5 pt-4 border-t border-surface-border">
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Issue Details</p>
                <p className="text-xs text-slate-400 leading-relaxed bg-surface p-2.5 rounded-xl border border-surface-border">
                  {selectedReq.issueDescription}
                </p>
                {selectedReq.attachedPhoto && (
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium mb-1 block">Attachment</p>
                    <a
                      href={`${apiUrl}${selectedReq.attachedPhoto}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                    >
                      <PhotoIcon className="w-4 h-4 shrink-0" />
                      View uploaded diagnostic image
                    </a>
                  </div>
                )}
              </div>

              {/* Stepper Work actions */}
              <div className="space-y-3 pt-4 border-t border-surface-border">
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Control Actions</p>
                
                {/* 1. Pending approval */}
                {selectedReq.status === 'Pending' && isManager && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => triggerActionModal('Approve', 'Approve Work Order', 'Approve this maintenance work? The asset will automatically transition to "Under Maintenance" state.')}
                      className="btn-primary flex-1 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 border-none flex items-center justify-center gap-1"
                    >
                      <CheckCircleIcon className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => triggerActionModal('Reject', 'Reject Work Order', 'Are you sure you want to reject this request?')}
                      className="btn-ghost flex-1 py-1.5 text-xs border border-red-950 text-red-400 hover:bg-red-950/20 flex items-center justify-center gap-1"
                    >
                      <XCircleIcon className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}

                {/* 2. Approved -> Technician Assignment */}
                {selectedReq.status === 'Approved' && isManager && (
                  <div className="space-y-2">
                    <Field label="Assign Technician (Company/Name)">
                      <input
                        type="text"
                        value={techName}
                        onChange={(e) => setTechName(e.target.value)}
                        placeholder="e.g. John Doe, Dell Service Team"
                        className="input text-xs h-9"
                      />
                    </Field>
                    <button
                      onClick={() => triggerActionModal('AssignTech', 'Assign Technician', `Assign '${techName}' to handle this maintenance order?`)}
                      disabled={!techName.trim()}
                      className="btn-primary w-full py-1.5 text-xs flex items-center justify-center gap-1"
                    >
                      Assign Technician
                    </button>
                  </div>
                )}

                {/* 3. Tech Assigned -> Start work */}
                {selectedReq.status === 'TechnicianAssigned' && (
                  <button
                    onClick={() => triggerActionModal('Start', 'Start Maintenance Work', 'Set work status to "In Progress" and log technician start?')}
                    className="btn-primary w-full py-1.5 text-xs bg-orange-600 hover:bg-orange-500 border-none flex items-center justify-center gap-1"
                  >
                    Start Diagnostics & Repair
                  </button>
                )}

                {/* 4. In Progress -> Resolve */}
                {selectedReq.status === 'InProgress' && isManager && (
                  <div className="space-y-3 bg-surface p-3 border border-surface-border rounded-xl">
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Resolution Details</p>
                    <div className="space-y-2.5">
                      <Field label="Resolution Notes" required>
                        <textarea
                          value={resolveForm.resolutionNotes}
                          onChange={(e) => setResolveForm((f) => ({ ...f, resolutionNotes: e.target.value }))}
                          rows={2}
                          placeholder="Describe the solution, e.g. replaced power cable..."
                          className="input text-xs resize-none"
                        />
                      </Field>
                      <Field label="Repair Cost (₹)">
                        <input
                          type="number"
                          min="0"
                          value={resolveForm.cost}
                          onChange={(e) => setResolveForm((f) => ({ ...f, cost: e.target.value }))}
                          placeholder="0.00"
                          className="input text-xs h-9"
                        />
                      </Field>
                      <button
                        onClick={() => triggerActionModal('Resolve', 'Resolve Maintenance Order', 'Resolve request? Asset status will revert to "Available".')}
                        disabled={!resolveForm.resolutionNotes.trim()}
                        className="btn-primary w-full py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 border-none flex items-center justify-center gap-1"
                      >
                        Resolve & Set Available
                      </button>
                    </div>
                  </div>
                )}

                {/* Status-specific read-only displays */}
                {selectedReq.status === 'TechnicianAssigned' && (
                  <p className="text-[10px] text-slate-500 pl-1">Assigned Tech: <span className="text-slate-300 font-medium">{selectedReq.assignedTechnician}</span></p>
                )}
                {selectedReq.status === 'InProgress' && (
                  <p className="text-[10px] text-slate-500 pl-1">Assigned Tech: <span className="text-slate-300 font-medium">{selectedReq.assignedTechnician}</span> (Diagnostic In-Progress)</p>
                )}
                {selectedReq.status === 'Resolved' && (
                  <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-3 space-y-2">
                    <p className="text-xs text-emerald-400 font-semibold">Completed Details</p>
                    <p className="text-[10px] text-slate-400">Notes: {selectedReq.resolutionNotes}</p>
                    <p className="text-[10px] text-slate-400">Total Cost: <span className="text-emerald-400 font-bold">{formatCost(selectedReq.cost)}</span></p>
                  </div>
                )}
                {!isManager && ['Pending', 'Approved', 'InProgress'].includes(selectedReq.status) && (
                  <p className="text-[10px] text-slate-500 italic pl-1">Awaiting manager actions to progress step.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-6 text-center text-slate-500 text-xs py-12">
              Select a maintenance order to visualize its workflow progress and trigger state transitions.
            </div>
          )}
        </div>
      </div>

      {/* SlidePanel Form: Raise Request */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="Raise Maintenance Request" width="max-w-md">
        <form onSubmit={handleCreateRequest} className="space-y-4">
          {formErr && (
            <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg p-3">
              {formErr}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Select Asset</label>
            <select
              value={formData.asset}
              onChange={(e) => setFormData((f) => ({ ...f, asset: e.target.value }))}
              className="input text-sm"
              required
              disabled={submitting}
            >
              <option value="">Choose asset</option>
              {assets.map((a) => (
                <option key={a._id} value={a._id}>{a.name} ({a.assetTag}) - [{a.status}]</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Priority Level</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData((f) => ({ ...f, priority: e.target.value }))}
              className="input text-sm"
              disabled={submitting}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Issue / Diagnostic Description</label>
            <textarea
              value={formData.issueDescription}
              onChange={(e) => setFormData((f) => ({ ...f, issueDescription: e.target.value }))}
              rows={3}
              placeholder="Describe what is broken, e.g. laptop keyboard keys not working..."
              className="input text-sm resize-none"
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Upload photo (Optional)</label>
            <label className="flex items-center gap-2 border border-dashed border-surface-border rounded-lg p-3 hover:border-primary-700 cursor-pointer text-xs">
              <PhotoIcon className="w-5 h-5 text-slate-500" />
              <span className="text-slate-500">{photoFile ? photoFile.name : 'Choose diagnostic picture'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                disabled={submitting}
              />
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-surface-border">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Submit Request'
              )}
            </button>
            <button type="button" onClick={() => setPanelOpen(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* Confirmation Modal */}
      <Modal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, action: '', title: '', message: '' })}
        onConfirm={handleWorkflowAction}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Execute Transition"
        variant={confirmModal.action === 'Reject' ? 'danger' : 'info'}
        loading={actionLoading}
      />
    </div>
  );
};

export default Maintenance;
