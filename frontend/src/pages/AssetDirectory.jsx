import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  MapPinIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { assetService } from '../services/assetService';
import { categoryService, departmentService } from '../services/orgService';
import StatusBadge from '../components/assets/StatusBadge';
import AssetForm from '../components/assets/AssetForm';

const AssetDirectory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isManager = ['Admin', 'AssetManager'].includes(user?.role);

  // Data states
  const [assets, setAssets]           = useState([]);
  const [categories, setCategories]   = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]         = useState(true);

  // Filter states
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus]         = useState('');
  const [location, setLocation]     = useState('');

  // Pagination states
  const [page, setPage]   = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  // Form states
  const [panelOpen, setPanelOpen] = useState(false);

  const fetchFilters = useCallback(async () => {
    try {
      const [catRes, deptRes] = await Promise.all([
        categoryService.getAll({ status: 'Active' }),
        departmentService.getAll({ status: 'Active' }),
      ]);
      setCategories(catRes.data.data.categories);
      setDepartments(deptRes.data.data.departments);
    } catch { /* Handled globally */ }
  }, []);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await assetService.getAll({
        search,
        category,
        department,
        status,
        location,
        page,
        limit,
      });
      setAssets(data.data.assets);
      setTotal(data.data.total);
    } catch { /* Handled */ }
    finally { setLoading(false); }
  }, [search, category, department, status, location, page]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAssets();
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setDepartment('');
    setStatus('');
    setLocation('');
    setPage(1);
  };

  const handleRegisterSave = async (formData, files) => {
    await assetService.create(formData, files);
    fetchAssets();
  };

  const formatCost = (val) => {
    if (!val) return '₹0.00';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Asset Directory</h2>
          <p className="text-sm text-slate-500 mt-1">Browse, filter, and manage enterprise hardware, software, and tools</p>
        </div>
        {isManager && (
          <button onClick={() => setPanelOpen(true)} className="btn-primary gap-1.5 shrink-0">
            <PlusIcon className="w-4 h-4" /> Register Asset
          </button>
        )}
      </div>

      {/* Filter panel */}
      <div className="card p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets..."
              className="input pl-9 text-sm h-10 w-full"
            />
          </div>
          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input text-sm h-10 w-full"
            >
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Allocated">Allocated</option>
              <option value="Reserved">Reserved</option>
              <option value="UnderMaintenance">Under Maintenance</option>
              <option value="Lost">Lost</option>
              <option value="Retired">Retired</option>
              <option value="Disposed">Disposed</option>
            </select>
          </div>
          <div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input text-sm h-10 w-full"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="input text-sm h-10 w-full"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location..."
              className="input text-sm h-10 flex-1 min-w-0"
            />
            {(search || status || category || department || location) && (
              <button
                type="button"
                onClick={clearFilters}
                className="btn-secondary h-10 px-3 shrink-0"
                title="Clear Filters"
              >
                <FunnelIcon className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Directory Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <TagIcon className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="font-medium">No assets registered yet</p>
            {isManager && (
              <button onClick={() => setPanelOpen(true)} className="text-primary-400 hover:underline text-sm mt-1">
                Register the first asset now
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-surface-border text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Asset Details</th>
                  <th className="px-6 py-4">Asset Tag</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Department / Location</th>
                  <th className="px-6 py-4">Acquisition Cost</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {assets.map((asset) => (
                  <tr
                    key={asset._id}
                    onClick={() => navigate(`/assets/${asset._id}`)}
                    className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {asset.photos?.length > 0 ? (
                          <img
                            src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${asset.photos[0]}`}
                            alt={asset.name}
                            className="w-10 h-10 object-cover rounded-lg bg-surface shrink-0 border border-surface-border"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center shrink-0 border border-surface-border">
                            <TagIcon className="w-5 h-5 text-slate-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-200">{asset.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{asset.serialNumber || 'No Serial No.'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400 font-semibold">
                      {asset.assetTag}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {asset.category?.name || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-400">{asset.department?.name || 'No Dept.'}</p>
                      {asset.location && (
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPinIcon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          {asset.location}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-medium">
                      {formatCost(asset.acquisitionCost)}
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <StatusBadge status={asset.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {total > limit && (
          <div className="flex items-center justify-between border-t border-surface-border px-6 py-4">
            <p className="text-xs text-slate-500">
              Showing {Math.min(total, (page - 1) * limit + 1)} to {Math.min(total, page * limit)} of {total} assets
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => (p * limit < total ? p + 1 : p))}
                disabled={page * limit >= total}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Asset Form drawer */}
      <AssetForm
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSave={handleRegisterSave}
        mode="create"
      />
    </div>
  );
};

export default AssetDirectory;
