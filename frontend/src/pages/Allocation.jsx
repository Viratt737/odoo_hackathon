import { useState, useEffect, useCallback } from 'react';
import {
  ArrowsRightLeftIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { allocationService } from '../services/allocationService';
import { assetService } from '../services/assetService';
import { userService, departmentService } from '../services/orgService';
import SlidePanel from '../components/SlidePanel';
import Modal from '../components/Modal';

const Allocation = () => {
  const { user } = useAuth();
  const isManager = ['Admin', 'AssetManager'].includes(user?.role);
  const isDeptHead = user?.role === 'DepartmentHead';

  // Tabs
  const [activeTab, setActiveTab] = useState('allocations');

  // Lists
  const [allocations, setAllocations]   = useState([]);
  const [transfers, setTransfers]       = useState([]);
  const [overdueList, setOverdueList]   = useState([]);
  const [loading, setLoading]           = useState(true);

  // Form states
  const [panelOpen, setPanelOpen] = useState(false);
  const [assets, setAssets]       = useState([]);
  const [users, setUsers]         = useState([]);
  const [depts, setDepts]         = useState([]);
  const [formData, setFormData]   = useState({
    asset: '',
    allocatedModel: 'User',
    allocatedTo: '',
    expectedReturnDate: '',
    notes: '',
  });

  // Conflict handling
  const [conflict, setConflict] = useState(null); // { message, holderName, activeAllocationId }
  const [submitting, setSubmitting] = useState(false);
  const [transferRequesting, setTransferRequesting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Return modal states
  const [returnModal, setReturnModal] = useState({ open: false, alloc: null });
  const [returnNotes, setReturnNotes] = useState('');
  const [returning, setReturning]     = useState(false);

  // Transfer approvals states
  const [approveModal, setApproveModal] = useState({ open: false, transfer: null, action: '' });
  const [approving, setApproving]       = useState(false);

  const fetchAllocationsAndTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, tRes, oRes] = await Promise.all([
        allocationService.getAll(),
        allocationService.getTransfers(),
        allocationService.getOverdue(),
      ]);
      setAllocations(aRes.data.data.allocations);
      setTransfers(tRes.data.data.transfers);
      setOverdueList(oRes.data.data.overdue);
    } catch { /* Handled */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAllocationsAndTransfers();
  }, [fetchAllocationsAndTransfers]);

  // Load dropdown resources for form
  const loadFormResources = async () => {
    try {
      const [asRes, usRes, deRes] = await Promise.all([
        assetService.getAll({ limit: 500 }), // Load assets
        userService.getAll({ limit: 500 }),  // Load users
        departmentService.getAll({ status: 'Active', limit: 200 }), // Load depts
      ]);
      setAssets(asRes.data.data.assets);
      setUsers(usRes.data.data.users);
      setDepts(deRes.data.data.departments);
    } catch { /* Handled */ }
  };

  const handleOpenPanel = () => {
    setConflict(null);
    setSuccessMsg('');
    setFormData({
      asset: '',
      allocatedModel: 'User',
      allocatedTo: '',
      expectedReturnDate: '',
      notes: '',
    });
    loadFormResources();
    setPanelOpen(true);
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    setConflict(null);
    setSuccessMsg('');
    if (!formData.asset || !formData.allocatedTo) return;

    setSubmitting(true);
    try {
      await allocationService.create(formData);
      setSuccessMsg('Asset allocated successfully!');
      setTimeout(() => {
        setPanelOpen(false);
        fetchAllocationsAndTransfers();
      }, 1500);
    } catch (err) {
      if (err.response?.status === 409) {
        // Double allocation conflict!
        setConflict({
          message: err.response.data.message,
          holderName: err.response.data.holderName || 'Another employee',
          activeAllocationId: err.response.data.activeAllocationId,
        });
      } else {
        setConflict({
          message: err.response?.data?.message || 'Failed to allocate asset.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestTransfer = async () => {
    if (!conflict || !formData.asset) return;
    setTransferRequesting(true);
    try {
      await allocationService.requestTransfer({
        assetId: formData.asset,
        requestedTo: formData.allocatedTo,
        requestedToModel: formData.allocatedModel,
        notes: `Automated request: Transfer initiated due to allocation conflict. Requester notes: ${formData.notes}`,
      });
      setSuccessMsg('Transfer request submitted successfully!');
      setTimeout(() => {
        setPanelOpen(false);
        fetchAllocationsAndTransfers();
      }, 1500);
    } catch (err) {
      setConflict({
        message: err.response?.data?.message || 'Failed to create transfer request.',
      });
    } finally {
      setTransferRequesting(false);
    }
  };

  const handleReturnSubmit = async () => {
    if (!returnModal.alloc) return;
    setReturning(true);
    try {
      await allocationService.return(returnModal.alloc._id, returnNotes);
      setReturnModal({ open: false, alloc: null });
      setReturnNotes('');
      fetchAllocationsAndTransfers();
    } catch { /* Handled */ }
    finally { setReturning(false); }
  };

  const handleApproveSubmit = async () => {
    if (!approveModal.transfer || !approveModal.action) return;
    setApproving(true);
    try {
      await allocationService.approveTransfer(approveModal.transfer._id, approveModal.action);
      setApproveModal({ open: false, transfer: null, action: '' });
      fetchAllocationsAndTransfers();
    } catch { /* Handled */ }
    finally { setApproving(false); }
  };

  const isOverdue = (alloc) => {
    if (alloc.status !== 'Active' || !alloc.expectedReturnDate) return false;
    return new Date(alloc.expectedReturnDate) < new Date();
  };

  const isUserOverdue = (allocId) => {
    return overdueList.some((o) => o._id === allocId);
  };

  // Find holder name of an asset tag/name from active allocation
  const getAssetHolder = (assetId) => {
    const active = allocations.find((a) => a.asset?._id === assetId && a.status === 'Active');
    return active?.allocatedTo?.name || 'Department';
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Allocations & Transfers</h2>
          <p className="text-sm text-slate-500 mt-1">Assign assets, check in returns, and manage cross-department transfers</p>
        </div>
        {isManager && (
          <button onClick={handleOpenPanel} className="btn-primary gap-1.5 shrink-0">
            <PlusIcon className="w-4 h-4" /> Allocate Asset
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-card border border-surface-border rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('allocations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'allocations'
              ? 'bg-primary-600/20 text-primary-300 shadow-sm'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
          }`}
        >
          Active Allocations & Returns
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'transfers'
              ? 'bg-primary-600/20 text-primary-300 shadow-sm'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
          }`}
        >
          Transfer Requests ({transfers.filter((t) => t.status === 'Requested').length})
        </button>
      </div>

      {/* Main content area */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'allocations' ? (
        /* ── Active Allocations ── */
        <div className="card p-0 overflow-hidden animate-fade-in">
          {allocations.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-16">No allocations registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-surface-border text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Asset</th>
                    <th className="px-6 py-4">Allocated To</th>
                    <th className="px-6 py-4">Allocation Date</th>
                    <th className="px-6 py-4">Expected Return</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {allocations.map((alloc) => {
                    const overdue = isOverdue(alloc) || isUserOverdue(alloc._id);
                    return (
                      <tr key={alloc._id} className="hover:bg-white/[0.01]">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-200">{alloc.asset?.name || 'Deleted Asset'}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{alloc.asset?.assetTag || '—'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-300 font-medium">{alloc.allocatedTo?.name || 'Department'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{alloc.allocatedModel}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-400">
                          {new Date(alloc.allocationDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-6 py-4">
                          {alloc.expectedReturnDate ? (
                            <span className={overdue ? 'text-red-400 font-semibold' : 'text-slate-400'}>
                              {new Date(alloc.expectedReturnDate).toLocaleDateString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {alloc.status === 'Active' ? (
                            overdue ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 bg-red-950/40 text-red-400 ring-red-800/60 animate-pulse">
                                <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                                Overdue
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 bg-blue-900/40 text-blue-300 ring-blue-800/60">
                                Active
                              </span>
                            )
                          ) : alloc.status === 'Returned' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 bg-emerald-900/40 text-emerald-300 ring-emerald-800/60">
                              Returned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 bg-slate-800 text-slate-400 ring-slate-700/60">
                              Transferred
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {alloc.status === 'Active' && isManager && (
                            <button
                              onClick={() => setReturnModal({ open: true, alloc })}
                              className="btn-ghost border border-primary-900 text-primary-400 hover:bg-primary-900/20 text-xs py-1 px-2.5 rounded-lg"
                            >
                              Check In / Return
                            </button>
                          )}
                          {alloc.status !== 'Active' && (
                            <span className="text-slate-600 text-xs">—</span>
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
      ) : (
        /* ── Transfer Requests ── */
        <div className="card p-0 overflow-hidden animate-fade-in">
          {transfers.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-16">No transfer requests submitted.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-surface-border text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Asset</th>
                    <th className="px-6 py-4">Requested By</th>
                    <th className="px-6 py-4">Requested Target</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {transfers.map((req) => {
                    const isApprover = isManager || isDeptHead; // Enforced at backend level too
                    return (
                      <tr key={req._id} className="hover:bg-white/[0.01]">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-200">{req.asset?.name || 'Deleted Asset'}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{req.asset?.assetTag || '—'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-300 font-medium">{req.requestedBy?.name || '—'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{req.requestedBy?.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-300 font-medium">{req.requestedTo?.name || 'Department'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{req.requestedToModel}</p>
                        </td>
                        <td className="px-6 py-4">
                          {req.status === 'Requested' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 bg-amber-900/40 text-amber-300 ring-amber-800/60 animate-pulse">
                              Pending
                            </span>
                          ) : req.status === 'Reallocated' || req.status === 'Approved' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 bg-emerald-900/40 text-emerald-300 ring-emerald-800/60">
                              Transferred
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 bg-red-900/40 text-red-400 ring-red-800/60">
                              Rejected
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {req.status === 'Requested' && isApprover ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setApproveModal({ open: true, transfer: req, action: 'Approve' })}
                                className="btn-ghost border border-emerald-950 text-emerald-400 hover:bg-emerald-950/20 text-xs py-1 px-2.5 rounded-lg flex items-center gap-1"
                              >
                                <CheckCircleIcon className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => setApproveModal({ open: true, transfer: req, action: 'Reject' })}
                                className="btn-ghost border border-red-950 text-red-400 hover:bg-red-950/20 text-xs py-1 px-2.5 rounded-lg flex items-center gap-1"
                              >
                                <XCircleIcon className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
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

      {/* Allocation slide-in Panel */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="Allocate Asset" width="max-w-lg">
        <form onSubmit={handleAllocate} className="space-y-4">
          {successMsg && (
            <p className="text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-800/40 rounded-lg px-3 py-2">{successMsg}</p>
          )}

          {conflict && (
            <div className="space-y-2.5 bg-red-900/20 border border-red-800/40 rounded-xl p-4">
              <p className="text-xs text-red-400 font-semibold flex items-center gap-1.5">
                <ExclamationTriangleIcon className="w-4 h-4" /> Conflict Detected
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                This asset is currently allocated and held by <span className="text-slate-200 font-semibold">{conflict.holderName}</span>.
                You cannot allocate it directly.
              </p>
              <button
                type="button"
                onClick={handleRequestTransfer}
                disabled={transferRequesting}
                className="btn-primary w-full text-xs py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 border-none shadow"
              >
                {transferRequesting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting Request...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <ArrowPathIcon className="w-4 h-4 animate-spin-reverse" />
                    Request Transfer from {conflict.holderName}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Form inputs */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Select Asset</label>
            <select
              value={formData.asset}
              onChange={(e) => {
                setFormData((f) => ({ ...f, asset: e.target.value }));
                setConflict(null);
              }}
              disabled={submitting || transferRequesting}
              className="input text-sm"
              required
            >
              <option value="">Select asset</option>
              {assets.map((asset) => (
                <option key={asset._id} value={asset._id}>
                  {asset.name} ({asset.assetTag}) - [{asset.status}]
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Allocation Target</label>
            <select
              value={formData.allocatedModel}
              onChange={(e) => setFormData((f) => ({ ...f, allocatedModel: e.target.value, allocatedTo: '' }))}
              disabled={submitting || transferRequesting}
              className="input text-sm"
            >
              <option value="User">Employee / User</option>
              <option value="Department">Department</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Select Target Entity</label>
            <select
              value={formData.allocatedTo}
              onChange={(e) => setFormData((f) => ({ ...f, allocatedTo: e.target.value }))}
              disabled={submitting || transferRequesting}
              className="input text-sm"
              required
            >
              <option value="">Select target</option>
              {formData.allocatedModel === 'User'
                ? users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email})
                    </option>
                  ))
                : depts.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Expected Return Date (Optional)</label>
            <input
              type="date"
              value={formData.expectedReturnDate}
              onChange={(e) => setFormData((f) => ({ ...f, expectedReturnDate: e.target.value }))}
              disabled={submitting || transferRequesting}
              className="input text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Notes / Purpose</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
              disabled={submitting || transferRequesting}
              rows={2}
              placeholder="e.g. Allocation for client project work..."
              className="input text-sm resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-surface-border">
            {!conflict && (
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Allocating...
                  </span>
                ) : (
                  'Allocate Asset'
                )}
              </button>
            )}
            <button type="button" onClick={() => setPanelOpen(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* Return Modal */}
      <Modal
        open={returnModal.open}
        onClose={() => setReturnModal({ open: false, alloc: null })}
        onConfirm={handleReturnSubmit}
        title="Check In Asset / Close Allocation"
        message={
          <div className="space-y-3">
            <p>
              Close active allocation for{' '}
              <span className="font-semibold text-slate-200">{returnModal.alloc?.asset?.name}</span>?
            </p>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Condition notes on return</label>
              <textarea
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                rows={2}
                placeholder="Describe condition on return, e.g. returned in good shape with charger..."
                className="input text-xs resize-none"
              />
            </div>
          </div>
        }
        confirmText="Confirm Return"
        variant="info"
        loading={returning}
      />

      {/* Approve Modal */}
      <Modal
        open={approveModal.open}
        onClose={() => setApproveModal({ open: false, transfer: null, action: '' })}
        onConfirm={handleApproveSubmit}
        title={`${approveModal.action} Transfer Request`}
        message={
          <span>
            Are you sure you want to <span className="font-semibold">{approveModal.action?.toLowerCase()}</span> this transfer request?
            {approveModal.action === 'Approve' && (
              <> This will close the current holder's allocation and instantly assign it to the new target.</>
            )}
          </span>
        }
        confirmText={approveModal.action}
        variant={approveModal.action === 'Approve' ? 'info' : 'danger'}
        loading={approving}
      />
    </div>
  );
};

export default Allocation;
