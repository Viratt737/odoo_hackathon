import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  TrashIcon,
  CalendarIcon,
  BanknotesIcon,
  DocumentArrowDownIcon,
  TagIcon,
  BookmarkSquareIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { assetService } from '../services/assetService';
import StatusBadge from '../components/assets/StatusBadge';
import AssetForm from '../components/assets/AssetForm';
import Modal from '../components/Modal';

// Transation rules from state machine
const ALLOWED_TRANSITIONS = {
  Available:        ['Allocated', 'Reserved', 'UnderMaintenance', 'Retired', 'Disposed'],
  Allocated:        ['Available', 'UnderMaintenance', 'Lost'],
  Reserved:         ['Available', 'Allocated'],
  UnderMaintenance: ['Available', 'Retired', 'Disposed'],
  Lost:             ['Available', 'Disposed'],
  Retired:          ['Disposed'],
  Disposed:         [],
};

const AssetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = ['Admin', 'AssetManager'].includes(user?.role);
  const isAdmin = user?.role === 'Admin';

  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  // Form states
  const [editOpen, setEditOpen] = useState(false);

  // Status update states
  const [transitioning, setTransitioning] = useState(false);

  // Delete states
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchAsset = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await assetService.getOne(id);
      setAsset(data.data.asset);
    } catch {
      navigate('/assets', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

  const handleEditSave = async (formData, files) => {
    await assetService.update(id, formData, files);
    fetchAsset();
  };

  const handleStatusChange = async (newStatus) => {
    setTransitioning(true);
    try {
      await assetService.updateStatus(id, newStatus);
      fetchAsset();
    } catch { /* Handled */ }
    finally { setTransitioning(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await assetService.remove(id);
      navigate('/assets');
    } catch { /* Handled */ }
    finally { setDeleting(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!asset) return null;

  const validNextStatuses = ALLOWED_TRANSITIONS[asset.status] || [];
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const formatCost = (val) => {
    if (!val) return '₹0.00';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Navigation bar */}
      <div className="flex items-center justify-between">
        <Link to="/assets" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeftIcon className="w-4 h-4" /> Back to Directory
        </Link>
        <div className="flex gap-2">
          {isManager && (
            <>
              {/* Status Transition Button/Dropdown */}
              {validNextStatuses.length > 0 && (
                <div className="relative group">
                  <button disabled={transitioning} className="btn-secondary h-9 text-xs flex items-center gap-1.5">
                    {transitioning ? 'Updating...' : 'Change Status ▾'}
                  </button>
                  <div className="absolute right-0 mt-1 w-48 bg-surface-card border border-surface-border rounded-xl shadow-xl py-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-10">
                    {validNextStatuses.map((st) => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(st)}
                        className="w-full text-left px-4 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => setEditOpen(true)} className="btn-secondary h-9 text-xs gap-1">
                <PencilSquareIcon className="w-3.5 h-3.5" /> Edit
              </button>
            </>
          )}
          {isAdmin && (
            <button
              onClick={() => setDeleteModal(true)}
              className="btn-ghost border border-red-950 text-red-500 hover:bg-red-950/20 h-9 text-xs gap-1"
            >
              <TrashIcon className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Main Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Images and Files */}
        <div className="space-y-6">
          <div className="card p-4 space-y-4">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Asset Photo</p>
            {asset.photos?.length > 0 ? (
              <div className="space-y-2">
                <img
                  src={`${apiUrl}${asset.photos[0]}`}
                  alt={asset.name}
                  className="w-full aspect-square object-cover rounded-xl border border-surface-border bg-surface"
                />
                {asset.photos.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {asset.photos.slice(1).map((photo, idx) => (
                      <img
                        key={idx}
                        src={`${apiUrl}${photo}`}
                        alt=""
                        className="w-full aspect-square object-cover rounded-lg border border-surface-border bg-surface cursor-pointer opacity-75 hover:opacity-100 transition-opacity"
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full aspect-square rounded-xl bg-surface border border-surface-border flex flex-col items-center justify-center text-slate-600 gap-2">
                <TagIcon className="w-12 h-12" />
                <span className="text-xs">No photos uploaded</span>
              </div>
            )}
          </div>

          {/* Documents Section */}
          <div className="card p-4 space-y-3">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Linked Documents</p>
            {asset.documents?.length > 0 ? (
              <div className="space-y-2">
                {asset.documents.map((doc, idx) => {
                  const filename = doc.split('-').slice(2).join('-');
                  return (
                    <a
                      key={idx}
                      href={`${apiUrl}${doc}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg bg-surface hover:bg-white/5 border border-surface-border text-slate-400 hover:text-slate-200 transition-colors text-xs font-medium"
                    >
                      <span className="truncate flex-1 pr-2">{filename || `document-${idx + 1}`}</span>
                      <DocumentArrowDownIcon className="w-4 h-4 shrink-0 text-slate-500" />
                    </a>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-600 py-2 text-center">No documents uploaded.</p>
            )}
          </div>
        </div>

        {/* Right Side: Key Metadata */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-100">{asset.name}</h1>
                <p className="text-xs text-slate-500 mt-1 font-mono">{asset.assetTag} · {asset.serialNumber || 'SN: None'}</p>
              </div>
              <StatusBadge status={asset.status} />
            </div>

            {/* Custom attributes grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-surface-border">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Category</p>
                <p className="text-sm font-semibold text-slate-300">{asset.category?.name || 'Unassigned'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Condition</p>
                <p className="text-sm font-semibold text-slate-300">{asset.condition}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Department</p>
                <p className="text-sm font-semibold text-slate-300">{asset.department?.name || 'Shared / Corporate'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Location</p>
                <p className="text-sm font-semibold text-slate-300">{asset.location || '—'}</p>
              </div>
            </div>

            {/* Acquisition data */}
            <div className="space-y-3">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Acquisition Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-surface-border">
                  <BanknotesIcon className="w-8 h-8 text-primary-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium">Acquisition Cost</p>
                    <p className="text-sm font-bold text-slate-300">{formatCost(asset.acquisitionCost)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-surface-border">
                  <CalendarIcon className="w-8 h-8 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium">Acquisition Date</p>
                    <p className="text-sm font-bold text-slate-300">
                      {asset.acquisitionDate ? new Date(asset.acquisitionDate).toLocaleDateString('en-IN') : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-surface-border">
                  <ClockIcon className="w-8 h-8 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium">Warranty Expiry</p>
                    <p className="text-sm font-bold text-slate-300">
                      {asset.warrantyExpiryDate ? new Date(asset.warrantyExpiryDate).toLocaleDateString('en-IN') : '—'}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 pl-1 mt-1">Vendor: <span className="text-slate-300 font-medium">{asset.vendor || 'Unknown'}</span></p>
            </div>

            {/* Description */}
            {asset.description && (
              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Asset Description</p>
                <p className="text-sm text-slate-400 leading-relaxed bg-surface p-3 rounded-xl border border-surface-border">{asset.description}</p>
              </div>
            )}
          </div>

          {/* Dynamic custom field values */}
          {asset.category?.customFields?.length > 0 && (
            <div className="card p-6 space-y-4">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Category Specifications</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {asset.category.customFields.map((cf) => {
                  const val = asset.customFieldValues?.[cf.fieldName] || (asset.customFieldValues instanceof Map ? asset.customFieldValues.get(cf.fieldName) : '') || '—';
                  return (
                    <div key={cf.fieldName} className="flex justify-between items-center p-2.5 rounded-lg bg-surface border border-surface-border text-xs">
                      <span className="text-slate-500 font-medium">{cf.fieldName}</span>
                      <span className="text-slate-300 font-semibold">
                        {cf.fieldType === 'date' && val !== '—'
                          ? new Date(val).toLocaleDateString('en-IN')
                          : val === 'true'
                          ? 'Yes'
                          : val === 'false'
                          ? 'No'
                          : val}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabs for Histories */}
          <div className="space-y-4">
            <div className="flex gap-1 bg-surface-card border border-surface-border rounded-xl p-1 w-fit">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'details' ? 'bg-primary-600/20 text-primary-300' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Information
              </button>
              <button
                onClick={() => setActiveTab('allocation')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'allocation' ? 'bg-primary-600/20 text-primary-300' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Allocation History ({asset.allocationHistory?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'maintenance' ? 'bg-primary-600/20 text-primary-300' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Maintenance History ({asset.maintenanceHistory?.length || 0})
              </button>
            </div>

            {/* Allocation history tab */}
            {activeTab === 'allocation' && (
              <div className="card p-0 overflow-hidden">
                {asset.allocationHistory?.length === 0 ? (
                  <p className="text-center text-slate-500 text-xs py-8">No allocation records for this asset.</p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-surface-border text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="px-4 py-3">Allocated To</th>
                        <th className="px-4 py-3">Allocated By</th>
                        <th className="px-4 py-3">From Date</th>
                        <th className="px-4 py-3">To Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {asset.allocationHistory.map((h, i) => (
                        <tr key={i} className="text-slate-400 hover:bg-white/[0.01]">
                          <td className="px-4 py-3 font-medium text-slate-200">
                            {h.allocatedTo?.name || 'Department'} ({h.allocatedModel})
                          </td>
                          <td className="px-4 py-3">{h.allocatedBy?.name || '—'}</td>
                          <td className="px-4 py-3">{h.fromDate ? new Date(h.fromDate).toLocaleDateString('en-IN') : '—'}</td>
                          <td className="px-4 py-3">
                            {h.toDate ? (
                              new Date(h.toDate).toLocaleDateString('en-IN')
                            ) : (
                              <span className="badge badge-success text-[10px]">Active</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Maintenance history tab */}
            {activeTab === 'maintenance' && (
              <div className="card p-0 overflow-hidden">
                {asset.maintenanceHistory?.length === 0 ? (
                  <p className="text-center text-slate-500 text-xs py-8">No maintenance records for this asset.</p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-surface-border text-slate-500 font-semibold uppercase">
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Cost</th>
                        <th className="px-4 py-3">Scheduled</th>
                        <th className="px-4 py-3">Completed</th>
                        <th className="px-4 py-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border text-slate-400">
                      {asset.maintenanceHistory.map((m, i) => (
                        <tr key={i} className="hover:bg-white/[0.01]">
                          <td className="px-4 py-3 font-semibold text-slate-200">{m.type}</td>
                          <td className="px-4 py-3">{formatCost(m.cost)}</td>
                          <td className="px-4 py-3">{m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString('en-IN') : '—'}</td>
                          <td className="px-4 py-3">{m.completedAt ? new Date(m.completedAt).toLocaleDateString('en-IN') : '—'}</td>
                          <td className="px-4 py-3 truncate max-w-xs">{m.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Info fallback */}
            {activeTab === 'details' && (
              <div className="card p-4 text-xs text-slate-500">
                Registered by <span className="text-slate-400 font-medium">{asset.registeredBy?.name || 'System'}</span> on{' '}
                {new Date(asset.createdAt).toLocaleString('en-IN')}. Last updated by{' '}
                <span className="text-slate-400 font-medium">{asset.lastUpdatedBy?.name || 'System'}</span> on{' '}
                {new Date(asset.updatedAt).toLocaleString('en-IN')}.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit drawer */}
      <AssetForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleEditSave}
        mode="edit"
        asset={asset}
      />

      {/* Delete confirmation */}
      <Modal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Asset"
        message={
          <span>
            Are you sure you want to permanently delete <span className="font-semibold text-slate-100">{asset.name}</span>?
            This action cannot be undone.
          </span>
        }
        confirmText="Delete permanently"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};

export default AssetDetail;
