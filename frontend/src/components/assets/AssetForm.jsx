import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, PhotoIcon, DocumentIcon } from '@heroicons/react/24/outline';
import SlidePanel from '../SlidePanel';
import { categoryService } from '../../services/orgService';

const ALL_CONDITIONS = ['New', 'Good', 'Fair', 'Poor', 'Damaged'];

const Field = ({ label, required, children, hint }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-slate-400">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-[10px] text-slate-600">{hint}</p>}
  </div>
);

/**
 * AssetForm — SlidePanel-based create/edit form
 *
 * Props:
 *   open, onClose, onSave(data, files), mode ('create'|'edit'), asset (for edit)
 */
const AssetForm = ({ open, onClose, onSave, mode = 'create', asset = null }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [form, setForm] = useState({
    name: '', serialNumber: '', category: '', department: '',
    acquisitionDate: '', acquisitionCost: '', vendor: '', warrantyExpiryDate: '',
    location: '', description: '', condition: 'Good', isBookable: false,
    customFieldValues: {},
  });
  const [photoFiles,    setPhotoFiles]    = useState([]);
  const [documentFiles, setDocumentFiles] = useState([]);
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  // Load categories
  useEffect(() => {
    categoryService.getAll({ status: 'Active' })
      .then(({ data }) => setCategories(data.data.categories))
      .catch(() => {});
  }, []);

  // Pre-fill for edit mode
  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && asset) {
      const cfv = {};
      if (asset.customFieldValues instanceof Map) {
        asset.customFieldValues.forEach((v, k) => { cfv[k] = v; });
      } else if (asset.customFieldValues && typeof asset.customFieldValues === 'object') {
        Object.assign(cfv, asset.customFieldValues);
      }
      setForm({
        name:              asset.name             || '',
        serialNumber:      asset.serialNumber     || '',
        category:          asset.category?._id    || asset.category || '',
        department:        asset.department?._id  || asset.department || '',
        acquisitionDate:   asset.acquisitionDate  ? asset.acquisitionDate.slice(0, 10) : '',
        acquisitionCost:   asset.acquisitionCost  ?? '',
        vendor:            asset.vendor           || '',
        warrantyExpiryDate: asset.warrantyExpiryDate ? asset.warrantyExpiryDate.slice(0, 10) : '',
        location:          asset.location         || '',
        description:       asset.description      || '',
        condition:         asset.condition        || 'Good',
        isBookable:        asset.isBookable       || false,
        customFieldValues: cfv,
      });
      const cat = categories.find((c) => c._id === (asset.category?._id || asset.category));
      setSelectedCategory(cat || null);
    } else {
      setForm({
        name: '', serialNumber: '', category: '', department: '',
        acquisitionDate: '', acquisitionCost: '', vendor: '', warrantyExpiryDate: '',
        location: '', description: '', condition: 'Good', isBookable: false,
        customFieldValues: {},
      });
      setSelectedCategory(null);
      setPhotoFiles([]);
      setDocumentFiles([]);
    }
    setError('');
  }, [open, mode, asset]);

  // When category changes, find its custom fields
  const handleCategoryChange = (catId) => {
    setForm((f) => ({ ...f, category: catId, customFieldValues: {} }));
    const cat = categories.find((c) => c._id === catId);
    setSelectedCategory(cat || null);
  };

  const handleCustomField = (fieldName, value) => {
    setForm((f) => ({
      ...f,
      customFieldValues: { ...f.customFieldValues, [fieldName]: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim())  { setError('Asset name is required'); return; }
    if (!form.category)     { setError('Category is required'); return; }
    setError('');
    setSaving(true);
    try {
      await onSave(
        { ...form, isBookable: form.isBookable ? 'true' : 'false' },
        { photos: photoFiles, documents: documentFiles }
      );
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  const renderCustomField = (cf) => {
    const val = form.customFieldValues[cf.fieldName] || '';
    const inputProps = {
      value: val,
      onChange: (e) => handleCustomField(cf.fieldName, e.target.value),
      className: 'input',
      placeholder: cf.fieldName,
    };
    switch (cf.fieldType) {
      case 'number':  return <input type="number" {...inputProps} />;
      case 'date':    return <input type="date"   {...inputProps} />;
      case 'boolean': return (
        <select {...inputProps}>
          <option value="">—</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
      default:        return <input type="text" {...inputProps} />;
    }
  };

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Register New Asset' : 'Edit Asset'}
      subtitle={mode === 'edit' ? `Tag: ${asset?.assetTag}` : 'Tag is auto-generated (AF-XXXX)'}
      width="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* ── Identity ────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Identity</p>
          <Field label="Asset Name" required>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Dell Latitude 5520" className="input" required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Serial Number">
              <input value={form.serialNumber} onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                placeholder="SN-XXXXXXXX" className="input" />
            </Field>
            <Field label="Category" required>
              <select value={form.category} onChange={(e) => handleCategoryChange(e.target.value)} className="input" required>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* ── Category Custom Fields ───────────────────────────────────────── */}
        {selectedCategory?.customFields?.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-surface-border">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
              {selectedCategory.name} — Custom Fields
            </p>
            {selectedCategory.customFields.map((cf) => (
              <Field key={cf.fieldName} label={cf.fieldName}>
                {renderCustomField(cf)}
              </Field>
            ))}
          </div>
        )}

        {/* ── Location & Status ────────────────────────────────────────────── */}
        <div className="space-y-3 pt-2 border-t border-surface-border">
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Location & Condition</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location">
              <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Floor 2, Rack B" className="input" />
            </Field>
            <Field label="Condition">
              <select value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))} className="input">
                {ALL_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Description">
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="Brief description…" className="input resize-none" />
          </Field>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input type="checkbox" checked={form.isBookable}
              onChange={(e) => setForm((f) => ({ ...f, isBookable: e.target.checked }))}
              className="w-4 h-4 rounded border-surface-border bg-surface text-primary-600 focus:ring-primary-600" />
            <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
              Available for booking (shared resource)
            </span>
          </label>
        </div>

        {/* ── Acquisition ──────────────────────────────────────────────────── */}
        <div className="space-y-3 pt-2 border-t border-surface-border">
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Acquisition</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Acquisition Date">
              <input type="date" value={form.acquisitionDate}
                onChange={(e) => setForm((f) => ({ ...f, acquisitionDate: e.target.value }))} className="input" />
            </Field>
            <Field label="Acquisition Cost (₹)">
              <input type="number" min="0" step="0.01" value={form.acquisitionCost}
                onChange={(e) => setForm((f) => ({ ...f, acquisitionCost: e.target.value }))}
                placeholder="0.00" className="input" />
            </Field>
            <Field label="Vendor">
              <input value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                placeholder="Vendor name" className="input" />
            </Field>
            <Field label="Warranty Expiry">
              <input type="date" value={form.warrantyExpiryDate}
                onChange={(e) => setForm((f) => ({ ...f, warrantyExpiryDate: e.target.value }))} className="input" />
            </Field>
          </div>
        </div>

        {/* ── File Uploads ─────────────────────────────────────────────────── */}
        <div className="space-y-3 pt-2 border-t border-surface-border">
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Files</p>
          <Field label="Photos" hint="Max 5 images (jpg, png, webp) — 5MB each">
            <label className="flex items-center gap-2.5 cursor-pointer border border-dashed border-surface-border rounded-lg px-4 py-3 hover:border-primary-700 transition-colors">
              <PhotoIcon className="w-5 h-5 text-slate-500" />
              <span className="text-sm text-slate-500">{photoFiles.length > 0 ? `${photoFiles.length} file(s) selected` : 'Click to select photos'}</span>
              <input type="file" multiple accept="image/*" className="hidden"
                onChange={(e) => setPhotoFiles(Array.from(e.target.files).slice(0, 5))} />
            </label>
          </Field>
          <Field label="Documents" hint="Max 3 files (PDF, Word, Excel) — 5MB each">
            <label className="flex items-center gap-2.5 cursor-pointer border border-dashed border-surface-border rounded-lg px-4 py-3 hover:border-primary-700 transition-colors">
              <DocumentIcon className="w-5 h-5 text-slate-500" />
              <span className="text-sm text-slate-500">{documentFiles.length > 0 ? `${documentFiles.length} file(s) selected` : 'Click to select documents'}</span>
              <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" className="hidden"
                onChange={(e) => setDocumentFiles(Array.from(e.target.files).slice(0, 3))} />
            </label>
          </Field>
          {mode === 'edit' && asset?.photos?.length > 0 && (
            <p className="text-[10px] text-slate-600">
              {asset.photos.length} existing photo(s) — uploading new ones will append to them.
            </p>
          )}
        </div>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="flex gap-3 pt-4 border-t border-surface-border sticky bottom-0 bg-surface-card pb-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
              : mode === 'create' ? 'Register Asset' : 'Save Changes'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </SlidePanel>
  );
};

export default AssetForm;
