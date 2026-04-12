'use client';

import { useState, useEffect } from 'react';
import { Shirt, Plus, Pencil, Trash2, X, ArrowUpDown, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

interface ServiceItem {
  _id: string;
  key: string;
  label: string;
  icon: string;
  unit: 'lbs' | 'items';
  basePrice: number;
  isActive: boolean;
  sortOrder: number;
}

const ICON_OPTIONS = ['Shirt', 'Sparkles', 'Flame', 'Droplets', 'Bed'];
const UNIT_OPTIONS: { value: 'lbs' | 'items'; label: string }[] = [
  { value: 'lbs', label: 'Per Pound (lbs)' },
  { value: 'items', label: 'Per Item' },
];

const emptyForm = {
  key: '',
  label: '',
  icon: 'Shirt',
  unit: 'lbs' as 'lbs' | 'items',
  basePrice: 0,
  isActive: true,
  sortOrder: 0,
};

export default function ServicesPage() {
  const { accessToken } = useAdminAuthStore();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    fetchServices();
  }, [accessToken]);

  const fetchServices = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await adminApi.getServices(accessToken);
      setServices(res.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedServices = async () => {
    if (!accessToken) return;
    try {
      const res = await adminApi.seedServices(accessToken);
      toast.success(res.message || 'Services seeded');
      fetchServices();
    } catch (err: any) {
      toast.error(err.message || 'Failed to seed services');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormData({ ...emptyForm, sortOrder: services.length });
    setShowForm(true);
  };

  const openEdit = (svc: ServiceItem) => {
    setEditing(svc);
    setFormData({
      key: svc.key,
      label: svc.label,
      icon: svc.icon,
      unit: svc.unit,
      basePrice: svc.basePrice,
      isActive: svc.isActive,
      sortOrder: svc.sortOrder,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!accessToken) return;
    if (!formData.key.trim() || !formData.label.trim() || formData.basePrice <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await adminApi.updateService(accessToken, editing._id, formData);
        toast.success('Service updated');
      } else {
        await adminApi.createService(accessToken, formData);
        toast.success('Service created');
      }
      setShowForm(false);
      setEditing(null);
      fetchServices();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (svc: ServiceItem) => {
    if (!accessToken) return;
    if (!confirm(`Delete "${svc.label}"? This cannot be undone.`)) return;
    try {
      await adminApi.deleteService(accessToken, svc._id);
      toast.success('Service deleted');
      fetchServices();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete service');
    }
  };

  const toggleActive = async (svc: ServiceItem) => {
    if (!accessToken) return;
    try {
      await adminApi.updateService(accessToken, svc._id, { isActive: !svc.isActive });
      fetchServices();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update service');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Services & Pricing</h1>
          <p className="text-sm text-text-secondary mt-1">Manage laundry services and their prices</p>
        </div>
        <div className="flex items-center gap-2">
          {services.length === 0 && !loading && (
            <button
              onClick={handleSeedServices}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
            >
              <Download className="w-4 h-4" />
              Seed Defaults
            </button>
          )}
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Service
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-surface-secondary rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && services.length === 0 && (
        <div className="text-center py-16 bg-surface border border-border rounded-xl">
          <Shirt className="w-12 h-12 text-text-tertiary mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-lg font-medium text-text-primary">No services configured</p>
          <p className="text-sm text-text-secondary mt-1 mb-4">
            Click &quot;Seed Defaults&quot; to load the standard services, or add them manually.
          </p>
        </div>
      )}

      {/* Service List */}
      {!loading && services.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-secondary/50">
                <th className="text-left text-xs font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Service</th>
                <th className="text-left text-xs font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Key</th>
                <th className="text-left text-xs font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Unit</th>
                <th className="text-right text-xs font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Price</th>
                <th className="text-center text-xs font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((svc) => (
                <tr key={svc._id} className="border-b border-border last:border-0 hover:bg-surface-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-brand-light flex items-center justify-center">
                        <Shirt className="w-4 h-4 text-brand" />
                      </div>
                      <span className="font-medium text-sm text-text-primary">{svc.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-surface-secondary px-2 py-1 rounded text-text-secondary">{svc.key}</code>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {svc.unit === 'lbs' ? 'Per Pound' : 'Per Item'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-text-primary">${svc.basePrice.toFixed(2)}</span>
                    <span className="text-xs text-text-tertiary ml-1">/{svc.unit === 'lbs' ? 'lb' : 'item'}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(svc)}
                      className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                        svc.isActive
                          ? 'bg-success-light text-success hover:bg-success/20'
                          : 'bg-surface-secondary text-text-tertiary hover:bg-border'
                      )}
                    >
                      {svc.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(svc)}
                        className="p-2 text-text-secondary hover:text-brand hover:bg-brand-light rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(svc)}
                        className="p-2 text-text-secondary hover:text-error hover:bg-error-light rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary">
                {editing ? 'Edit Service' : 'New Service'}
              </h3>
              <button
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="p-1 hover:bg-surface-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Service Name</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    setFormData({
                      ...formData,
                      label,
                      key: editing ? formData.key : label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
                    });
                  }}
                  placeholder="e.g. Wash & Fold"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>

              {/* Key */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Key</label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="wash_fold"
                  disabled={!!editing}
                  className={cn(
                    'w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand/50',
                    editing && 'opacity-50 cursor-not-allowed'
                  )}
                />
                <p className="text-xs text-text-tertiary mt-1">Unique identifier (cannot be changed after creation)</p>
              </div>

              {/* Price + Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Price ($)</label>
                  <input
                    type="number"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as 'lbs' | 'items' })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/50"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Icon + Sort Order */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Icon</label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/50"
                  >
                    {ICON_OPTIONS.map((icon) => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/50"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-brand focus:ring-brand accent-[var(--brand)]"
                />
                <span className="text-sm text-text-primary">Active (visible to customers)</span>
              </label>
            </div>

            <div className="flex gap-2 p-4 border-t border-border">
              <button
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  'flex-1 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 transition-colors',
                  saving && 'opacity-50 cursor-not-allowed'
                )}
              >
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
