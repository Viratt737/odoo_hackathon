import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import {
  BuildingOfficeIcon, CubeIcon, UsersIcon,
  PlusIcon, MagnifyingGlassIcon, PencilSquareIcon,
  TrashIcon, CheckCircleIcon, XCircleIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { departmentService, categoryService, userService } from '../services/orgService';
import Modal from '../components/Modal';
import SlidePanel from '../components/SlidePanel';

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => (
  <span className={`badge ${status === 'Active' ? 'badge-success' : 'badge-muted'}`}>
    {status}
  </span>
);

// ─── Role badge ───────────────────────────────────────────────────────────────
const roleColors = {
  Admin:          'badge-info',
  AssetManager:   'badge-success',
  DepartmentHead: 'badge-warning',
  Employee:       'badge-muted',
};
const RoleBadge = ({ role }) => (
  <span className={`badge ${roleColors[role] || 'badge-muted'}`}>{role}</span>
);

// ─── Form field helpers ───────────────────────────────────────────────────────
const Field = ({ label, required, children }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-slate-400">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// TAB A — DEPARTMENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
const DepartmentTab = () => {
  const [departments, setDepartments] = useState([]);
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Panel state
  const [panel, setPanel]         = useState({ open: false, mode: 'create', dept: null });
  const [formData, setFormData]   = useState({ name: '', code: '', description: '', head: '', parentDepartment: '', location: '', budget: '' });
  const [formErr, setFormErr]     = useState('');
  const [saving, setSaving]       = useState(false);

  // Modal state
  const [modal, setModal] = useState({ open: false, dept: null });
  const [toggling, setToggling] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, uRes] = await Promise.all([
        departmentService.getAll({ search, status: statusFilter }),
        userService.getAll({ limit: 200 }),
      ]);
      setDepartments(dRes.data.data.departments);
      setUsers(uRes.data.data.users);
    } catch { /* error handled globally */ }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setFormData({ name: '', code: '', description: '', head: '', parentDepartment: '', location: '', budget: '' });
    setFormErr('');
    setPanel({ open: true, mode: 'create', dept: null });
  };

  const openEdit = (dept) => {
    setFormData({
      name:             dept.name,
      code:             dept.code,
      description:      dept.description || '',
      head:             dept.head?._id || '',
      parentDepartment: dept.parentDepartment?._id || '',
      location:         dept.location || '',
      budget:           dept.budget ?? '',
    });
    setFormErr('');
    setPanel({ open: true, mode: 'edit', dept });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { setFormErr('Name is required'); return; }
    setSaving(true); setFormErr('');
    try {
      const payload = {
        ...formData,
        head:             formData.head || null,
        parentDepartment: formData.parentDepartment || null,
        budget:           formData.budget ? Number(formData.budget) : 0,
      };
      if (panel.mode === 'create') {
        await departmentService.create(payload);
      } else {
        await departmentService.update(panel.dept._id, payload);
      }
      setPanel((p) => ({ ...p, open: false }));
      fetchData();
    } catch (err) {
      setFormErr(err.response?.data?.message || 'Failed to save department');
    } finally { setSaving(false); }
  };

  const handleToggleStatus = async () => {
    setToggling(true);
    try {
      await departmentService.toggleStatus(modal.dept._id);
      setModal({ open: false, dept: null });
      fetchData();
    } catch { /* handled */ }
    finally { setToggling(false); }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search departments…" className="input pl-9 text-sm h-9" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="input h-9 text-sm w-36">
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <button onClick={openCreate} className="btn-primary gap-1.5 shrink-0">
          <PlusIcon className="w-4 h-4" /> New Department
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : departments.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            No departments found.{' '}
            <button onClick={openCreate} className="text-primary-400 hover:underline">Create one</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  {['Name', 'Code', 'Head', 'Parent', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {departments.map((dept) => (
                  <tr key={dept._id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-200">{dept.name}</p>
                      {dept.location && <p className="text-xs text-slate-500 mt-0.5">{dept.location}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-surface px-1.5 py-0.5 rounded text-slate-400">{dept.code}</code>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {dept.head ? dept.head.name : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {dept.parentDepartment ? dept.parentDepartment.name : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={dept.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(dept)}
                          className="btn-ghost p-1.5 rounded-lg text-slate-500 hover:text-slate-200" title="Edit">
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => setModal({ open: true, dept })}
                          className={`btn-ghost p-1.5 rounded-lg ${dept.status === 'Active' ? 'text-amber-500 hover:text-amber-400' : 'text-emerald-500 hover:text-emerald-400'}`}
                          title={dept.status === 'Active' ? 'Deactivate' : 'Activate'}>
                          {dept.status === 'Active'
                            ? <XCircleIcon className="w-4 h-4" />
                            : <CheckCircleIcon className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide Panel */}
      <SlidePanel
        open={panel.open}
        onClose={() => setPanel((p) => ({ ...p, open: false }))}
        title={panel.mode === 'create' ? 'New Department' : 'Edit Department'}
        subtitle={panel.mode === 'edit' ? panel.dept?.name : 'Fill in the details below'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formErr && (
            <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">{formErr}</p>
          )}
          <Field label="Department Name" required>
            <input value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Engineering" className="input" required />
          </Field>
          <Field label="Code">
            <input value={formData.code} onChange={(e) => setFormData((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="Auto-generated if empty" className="input font-mono" maxLength={10} />
          </Field>
          <Field label="Description">
            <textarea value={formData.description} onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="Brief description…" className="input resize-none" />
          </Field>
          <Field label="Department Head">
            <select value={formData.head} onChange={(e) => setFormData((f) => ({ ...f, head: e.target.value }))} className="input">
              <option value="">— None —</option>
              {users.filter((u) => ['DepartmentHead', 'Admin'].includes(u.role)).map((u) => (
                <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </Field>
          <Field label="Parent Department">
            <select value={formData.parentDepartment} onChange={(e) => setFormData((f) => ({ ...f, parentDepartment: e.target.value }))} className="input">
              <option value="">— None (Top Level) —</option>
              {departments
                .filter((d) => d._id !== panel.dept?._id)
                .map((d) => <option key={d._id} value={d._id}>{d.name}</option>)
              }
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location">
              <input value={formData.location} onChange={(e) => setFormData((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Floor 3" className="input" />
            </Field>
            <Field label="Budget (₹)">
              <input type="number" min="0" value={formData.budget} onChange={(e) => setFormData((f) => ({ ...f, budget: e.target.value }))}
                placeholder="0" className="input" />
            </Field>
          </div>
          <div className="flex gap-3 pt-4 border-t border-surface-border">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</> : panel.mode === 'create' ? 'Create Department' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => setPanel((p) => ({ ...p, open: false }))} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </SlidePanel>

      {/* Confirmation Modal */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, dept: null })}
        onConfirm={handleToggleStatus}
        title={modal.dept?.status === 'Active' ? 'Deactivate Department' : 'Activate Department'}
        message={
          modal.dept?.status === 'Active'
            ? <><span className="font-medium text-slate-200">{modal.dept?.name}</span> will be marked Inactive. Existing allocations will not be affected.</>
            : <><span className="font-medium text-slate-200">{modal.dept?.name}</span> will be reactivated.</>
        }
        confirmText={modal.dept?.status === 'Active' ? 'Deactivate' : 'Activate'}
        variant={modal.dept?.status === 'Active' ? 'warning' : 'info'}
        loading={toggling}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB B — ASSET CATEGORY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
const CategoryTab = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [panel, setPanel]   = useState({ open: false, mode: 'create', cat: null });
  const [formData, setFormData] = useState({
    name: '', code: '', description: '', depreciationRate: '', usefulLifeYears: '', maintenanceIntervalDays: '',
    customFields: [],
  });
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving]   = useState(false);
  const [modal, setModal]     = useState({ open: false, cat: null });
  const [toggling, setToggling] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoryService.getAll({ search, status: statusFilter });
      setCategories(res.data.data.categories);
    } catch { /* handled */ }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const emptyForm = { name: '', code: '', description: '', depreciationRate: '', usefulLifeYears: '', maintenanceIntervalDays: '', customFields: [] };

  const openCreate = () => { setFormData(emptyForm); setFormErr(''); setPanel({ open: true, mode: 'create', cat: null }); };
  const openEdit   = (cat) => {
    setFormData({
      name:                    cat.name,
      code:                    cat.code,
      description:             cat.description || '',
      depreciationRate:        cat.depreciationRate ?? '',
      usefulLifeYears:         cat.usefulLifeYears ?? '',
      maintenanceIntervalDays: cat.maintenanceIntervalDays ?? '',
      customFields:            cat.customFields || [],
    });
    setFormErr('');
    setPanel({ open: true, mode: 'edit', cat });
  };

  const addCustomField  = () => setFormData((f) => ({ ...f, customFields: [...f.customFields, { fieldName: '', fieldType: 'text' }] }));
  const removeCustomField = (i) => setFormData((f) => ({ ...f, customFields: f.customFields.filter((_, idx) => idx !== i) }));
  const updateCustomField = (i, key, val) =>
    setFormData((f) => ({
      ...f,
      customFields: f.customFields.map((cf, idx) => idx === i ? { ...cf, [key]: val } : cf),
    }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { setFormErr('Name is required'); return; }
    // Validate custom fields
    for (const cf of formData.customFields) {
      if (!cf.fieldName.trim()) { setFormErr('All custom field names must be filled in'); return; }
    }
    setSaving(true); setFormErr('');
    try {
      const payload = {
        ...formData,
        depreciationRate:        formData.depreciationRate !== '' ? Number(formData.depreciationRate) : 0,
        usefulLifeYears:         formData.usefulLifeYears !== '' ? Number(formData.usefulLifeYears) : null,
        maintenanceIntervalDays: formData.maintenanceIntervalDays !== '' ? Number(formData.maintenanceIntervalDays) : null,
      };
      panel.mode === 'create'
        ? await categoryService.create(payload)
        : await categoryService.update(panel.cat._id, payload);
      setPanel((p) => ({ ...p, open: false }));
      fetchData();
    } catch (err) {
      setFormErr(err.response?.data?.message || 'Failed to save category');
    } finally { setSaving(false); }
  };

  const handleToggleStatus = async () => {
    setToggling(true);
    try { await categoryService.toggleStatus(modal.cat._id); setModal({ open: false, cat: null }); fetchData(); }
    catch { /* handled */ }
    finally { setToggling(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search categories…" className="input pl-9 text-sm h-9" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input h-9 text-sm w-36">
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <button onClick={openCreate} className="btn-primary gap-1.5 shrink-0">
          <PlusIcon className="w-4 h-4" /> New Category
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            No categories found. <button onClick={openCreate} className="text-primary-400 hover:underline">Create one</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  {['Name', 'Code', 'Custom Fields', 'Depreciation', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {categories.map((cat) => (
                  <tr key={cat._id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-200">{cat.name}</p>
                      {cat.description && <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[180px]">{cat.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-surface px-1.5 py-0.5 rounded text-slate-400">{cat.code}</code>
                    </td>
                    <td className="px-4 py-3">
                      {cat.customFields?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {cat.customFields.map((cf) => (
                            <span key={cf.fieldName} className="badge badge-info text-[10px]">{cf.fieldName}</span>
                          ))}
                        </div>
                      ) : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{cat.depreciationRate}%</td>
                    <td className="px-4 py-3"><StatusBadge status={cat.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(cat)} className="btn-ghost p-1.5 rounded-lg text-slate-500 hover:text-slate-200"><PencilSquareIcon className="w-4 h-4" /></button>
                        <button onClick={() => setModal({ open: true, cat })}
                          className={`btn-ghost p-1.5 rounded-lg ${cat.status === 'Active' ? 'text-amber-500 hover:text-amber-400' : 'text-emerald-500 hover:text-emerald-400'}`}>
                          {cat.status === 'Active' ? <XCircleIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SlidePanel open={panel.open} onClose={() => setPanel((p) => ({ ...p, open: false }))}
        title={panel.mode === 'create' ? 'New Asset Category' : 'Edit Category'}
        subtitle={panel.mode === 'edit' ? panel.cat?.name : undefined} width="max-w-xl">
        <form onSubmit={handleSave} className="space-y-4">
          {formErr && <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">{formErr}</p>}
          <Field label="Category Name" required>
            <input value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Electronics" className="input" required />
          </Field>
          <Field label="Code">
            <input value={formData.code} onChange={(e) => setFormData((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="Auto-generated" className="input font-mono" maxLength={10} />
          </Field>
          <Field label="Description">
            <textarea value={formData.description} onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Brief description…" className="input resize-none" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Depreciation %">
              <input type="number" min="0" max="100" step="0.01" value={formData.depreciationRate} onChange={(e) => setFormData((f) => ({ ...f, depreciationRate: e.target.value }))} placeholder="0" className="input" />
            </Field>
            <Field label="Useful Life (yrs)">
              <input type="number" min="0" value={formData.usefulLifeYears} onChange={(e) => setFormData((f) => ({ ...f, usefulLifeYears: e.target.value }))} placeholder="—" className="input" />
            </Field>
            <Field label="Maint. Interval (days)">
              <input type="number" min="0" value={formData.maintenanceIntervalDays} onChange={(e) => setFormData((f) => ({ ...f, maintenanceIntervalDays: e.target.value }))} placeholder="—" className="input" />
            </Field>
          </div>

          {/* Custom Fields Editor */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Custom Fields</p>
              <button type="button" onClick={addCustomField} className="btn-ghost text-xs py-1 px-2 text-primary-400 hover:text-primary-300">
                <PlusIcon className="w-3.5 h-3.5 inline mr-1" />Add field
              </button>
            </div>
            {formData.customFields.length === 0 && (
              <p className="text-xs text-slate-600 py-2 text-center bg-surface/50 rounded-lg border border-dashed border-surface-border">
                No custom fields. Click &quot;Add field&quot; to define category-specific attributes.
              </p>
            )}
            {formData.customFields.map((cf, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={cf.fieldName} onChange={(e) => updateCustomField(i, 'fieldName', e.target.value)}
                  placeholder="Field name" className="input flex-1 text-sm" />
                <select value={cf.fieldType} onChange={(e) => updateCustomField(i, 'fieldType', e.target.value)} className="input w-28 text-sm">
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="boolean">Yes/No</option>
                </select>
                <button type="button" onClick={() => removeCustomField(i)}
                  className="btn-ghost p-1.5 text-red-500 hover:text-red-400 rounded-lg shrink-0">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t border-surface-border">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</> : panel.mode === 'create' ? 'Create Category' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => setPanel((p) => ({ ...p, open: false }))} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </SlidePanel>

      <Modal open={modal.open} onClose={() => setModal({ open: false, cat: null })} onConfirm={handleToggleStatus}
        title={modal.cat?.status === 'Active' ? 'Deactivate Category' : 'Activate Category'}
        message={<><span className="font-medium text-slate-200">{modal.cat?.name}</span> will be marked {modal.cat?.status === 'Active' ? 'Inactive' : 'Active'}.</>}
        confirmText={modal.cat?.status === 'Active' ? 'Deactivate' : 'Activate'}
        variant={modal.cat?.status === 'Active' ? 'warning' : 'info'} loading={toggling} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB C — EMPLOYEE DIRECTORY
// ═══════════════════════════════════════════════════════════════════════════════
const EmployeeTab = () => {
  const [users, setUsers]             = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [roleFilter, setRoleFilter]   = useState('');
  const [deptFilter, setDeptFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [roleModal, setRoleModal]     = useState({ open: false, user: null, newRole: '' });
  const [statusModal, setStatusModal] = useState({ open: false, user: null });
  const [processing, setProcessing]   = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, dRes] = await Promise.all([
        userService.getAll({ search, role: roleFilter, department: deptFilter, status: statusFilter, limit: 100 }),
        departmentService.getAll({ status: 'Active', limit: 200 }),
      ]);
      setUsers(uRes.data.data.users);
      setDepartments(dRes.data.data.departments);
    } catch { /* handled */ }
    finally { setLoading(false); }
  }, [search, roleFilter, deptFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRoleChange = async () => {
    setProcessing(true);
    try {
      await userService.updateRole(roleModal.user._id, roleModal.newRole);
      setRoleModal({ open: false, user: null, newRole: '' });
      fetchData();
    } catch { /* handled */ }
    finally { setProcessing(false); }
  };

  const handleStatusToggle = async () => {
    setProcessing(true);
    try {
      await userService.updateStatus(statusModal.user._id);
      setStatusModal({ open: false, user: null });
      fetchData();
    } catch { /* handled */ }
    finally { setProcessing(false); }
  };

  const promotableRoles = ['Employee', 'AssetManager', 'DepartmentHead'];

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email…" className="input pl-9 text-sm h-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input h-9 text-sm w-36">
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="AssetManager">Asset Manager</option>
            <option value="DepartmentHead">Dept. Head</option>
            <option value="Employee">Employee</option>
          </select>
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="input h-9 text-sm w-44">
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input h-9 text-sm w-32">
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          {(search || roleFilter || deptFilter || statusFilter) && (
            <button onClick={() => { setSearch(''); setRoleFilter(''); setDeptFilter(''); setStatusFilter(''); }}
              className="btn-ghost text-xs text-slate-500 h-9 px-2">
              <FunnelIcon className="w-3.5 h-3.5 mr-1 inline" />Clear
            </button>
          )}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">No employees match the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  {['Employee', 'Email', 'Department', 'Role', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shrink-0">
                          <span className="text-[11px] font-bold text-white">{u.name?.[0]?.toUpperCase()}</span>
                        </div>
                        <span className="font-medium text-slate-200">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{u.email}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {u.department ? u.department.name : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Role promotion — only for non-Admin users */}
                        {u.role !== 'Admin' && (
                          <select
                            value={u.role}
                            onChange={(e) => {
                              if (e.target.value !== u.role) {
                                setRoleModal({ open: true, user: u, newRole: e.target.value });
                              }
                            }}
                            className="input text-xs h-7 py-0 w-36"
                            title="Change role"
                          >
                            {promotableRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        )}
                        {u.role === 'Admin' && (
                          <span className="text-xs text-slate-600 italic px-2">Admin (immutable)</span>
                        )}
                        {/* Activate/Deactivate */}
                        {u.role !== 'Admin' && (
                          <button onClick={() => setStatusModal({ open: true, user: u })}
                            className={`btn-ghost p-1.5 rounded-lg ${u.status === 'Active' ? 'text-amber-500 hover:text-amber-400' : 'text-emerald-500 hover:text-emerald-400'}`}
                            title={u.status === 'Active' ? 'Deactivate' : 'Activate'}>
                            {u.status === 'Active' ? <XCircleIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-surface-border text-xs text-slate-600">
              Showing {users.length} user{users.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      <Modal open={roleModal.open} onClose={() => setRoleModal({ open: false, user: null, newRole: '' })}
        onConfirm={handleRoleChange}
        title="Change Employee Role"
        message={
          <span>
            Promote <span className="font-medium text-slate-200">{roleModal.user?.name}</span> from{' '}
            <span className="text-primary-400">{roleModal.user?.role}</span> to{' '}
            <span className="text-emerald-400 font-medium">{roleModal.newRole}</span>?
            <br /><span className="text-slate-500 text-xs mt-1 block">This will change what they can access in the system.</span>
          </span>
        }
        confirmText="Yes, update role" variant="info" loading={processing} />

      {/* Status Toggle Modal */}
      <Modal open={statusModal.open} onClose={() => setStatusModal({ open: false, user: null })}
        onConfirm={handleStatusToggle}
        title={statusModal.user?.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
        message={
          <span>
            {statusModal.user?.status === 'Active'
              ? <><span className="font-medium text-slate-200">{statusModal.user?.name}</span> will be deactivated and lose access immediately.</>
              : <><span className="font-medium text-slate-200">{statusModal.user?.name}</span> will regain access to AssetFlow.</>}
          </span>
        }
        confirmText={statusModal.user?.status === 'Active' ? 'Deactivate' : 'Activate'}
        variant={statusModal.user?.status === 'Active' ? 'danger' : 'info'} loading={processing} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE — OrgSetup with 3 tabs
// ═══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'departments', label: 'Departments',     Icon: BuildingOfficeIcon, Component: DepartmentTab },
  { id: 'categories',  label: 'Asset Categories', Icon: CubeIcon,           Component: CategoryTab  },
  { id: 'employees',   label: 'Employee Directory', Icon: UsersIcon,         Component: EmployeeTab  },
];

const OrgSetup = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('departments');

  // Guard — redirect non-Admins
  if (user && user.role !== 'Admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.Component;

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Organisation Setup</h2>
        <p className="text-sm text-slate-500 mt-1">Manage departments, asset categories, and employee directory</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-card border border-surface-border rounded-xl p-1 w-fit">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === id
                ? 'bg-primary-600/20 text-primary-300 shadow-sm'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {ActiveComponent && <ActiveComponent />}
    </div>
  );
};

export default OrgSetup;
