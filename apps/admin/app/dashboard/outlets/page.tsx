'use client';

import { useState, useEffect } from 'react';
import { MapPin, Plus, Clock, Settings, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

export default function OutletsPage() {
  const { accessToken } = useAdminAuthStore();
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: { line1: '', city: '', state: '', zip: '' },
    phone: '',
    serviceRadius: 20,
    services: [] as string[],
  });
  const [editingOutlet, setEditingOutlet] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    address: { line1: '', city: '', state: '', zip: '' },
    phone: '',
    serviceRadius: 20,
    services: [] as string[],
  });

  useEffect(() => {
    if (!accessToken) return;
    fetchOutlets();
  }, [accessToken]);

  const fetchOutlets = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await adminApi.getOutlets(accessToken);
      setOutlets(res.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch outlets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOutlet = async () => {
    if (!accessToken) return;
    if (!formData.name || !formData.address.line1 || !formData.address.city) {
      toast.error('Please fill required fields');
      return;
    }
    try {
      await adminApi.createOutlet(accessToken, formData);
      toast.success('Outlet created');
      setShowForm(false);
      setFormData({
        name: '',
        address: { line1: '', city: '', state: '', zip: '' },
        phone: '',
        serviceRadius: 20,
        services: [],
      });
      fetchOutlets();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create outlet');
    }
  };

  const openEditModal = (outlet: any) => {
    setEditingOutlet(outlet);
    setEditFormData({
      name: outlet.name || '',
      address: outlet.address || { line1: '', city: '', state: '', zip: '' },
      phone: outlet.phone || '',
      serviceRadius: outlet.serviceRadius || 20,
      services: outlet.services || [],
    });
  };

  const handleUpdateOutlet = async () => {
    if (!accessToken || !editingOutlet) return;
    try {
      await adminApi.updateOutlet(accessToken, editingOutlet._id, editFormData);
      toast.success('Outlet updated');
      setEditingOutlet(null);
      fetchOutlets();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update outlet');
    }
  };

  const handleDeleteOutlet = async (id: string, name: string) => {
    if (!accessToken) return;
    if (!confirm(`Delete outlet "${name}"? This cannot be undone.`)) return;
    try {
      await adminApi.deleteOutlet(accessToken, id);
      toast.success('Outlet deleted');
      fetchOutlets();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete outlet');
    }
  };

  const availableServices = ['wash_fold', 'dry_clean', 'iron_press', 'shoe_clean', 'carpet_clean', 'express'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Outlets</h1>
          <p className="text-sm text-text-secondary mt-0.5">Manage laundry outlet locations and settings</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Outlet'}
        </button>
      </div>

      {/* Add Outlet Form */}
      {showForm && (
        <div className="bg-surface border border-border rounded-lg p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-text-primary mb-4">Create New Outlet</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1">Address Line 1 *</label>
              <input
                type="text"
                value={formData.address.line1}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, line1: e.target.value } })}
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">City *</label>
              <input
                type="text"
                value={formData.address.city}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">State</label>
              <input
                type="text"
                value={formData.address.state}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">ZIP</label>
              <input
                type="text"
                value={formData.address.zip}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, zip: e.target.value } })}
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Service Radius (km)</label>
              <input
                type="number"
                value={formData.serviceRadius}
                onChange={(e) => setFormData({ ...formData, serviceRadius: parseFloat(e.target.value) })}
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-2">Services</label>
              <div className="flex flex-wrap gap-2">
                {availableServices.map((svc) => (
                  <label key={svc} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.services.includes(svc)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, services: [...formData.services, svc] });
                        } else {
                          setFormData({ ...formData, services: formData.services.filter((s) => s !== svc) });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-text-primary">{svc.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={handleCreateOutlet}
            className="mt-4 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90"
          >
            Create Outlet
          </button>
        </div>
      )}

      {/* Outlet Cards */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-lg shadow-sm p-5">
              <div className="animate-pulse">
                <div className="h-6 bg-surface-secondary rounded w-32 mb-3" />
                <div className="h-4 bg-surface-secondary rounded w-full mb-2" />
                <div className="h-4 bg-surface-secondary rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : outlets.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary">No outlets found</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {outlets.map((outlet) => (
            <div key={outlet._id} className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
              {/* Map placeholder */}
              <div className="h-32 bg-surface-secondary flex items-center justify-center">
                <MapPin className="w-8 h-8 text-text-tertiary" />
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-text-primary">{outlet.name}</h3>
                  <span className={cn(
                    'inline-flex h-[22px] px-2 rounded-full text-[12px] font-semibold items-center',
                    outlet.isActive ? 'bg-success-light text-success' : 'bg-error-light text-error'
                  )}>
                    {outlet.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-sm text-text-secondary mb-3">
                  {outlet.address?.line1}, {outlet.address?.city}
                </p>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <MapPin className="w-3.5 h-3.5" />
                    {outlet.serviceRadius || 20} km radius
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Clock className="w-3.5 h-3.5" />
                    {outlet.services?.length || 0} services
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div>
                    <span className="text-[13px] text-text-secondary">{outlet.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(outlet)}
                      className="p-2 text-text-secondary hover:text-brand hover:bg-brand-light rounded-md transition-colors"
                      title="Edit outlet"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteOutlet(outlet._id, outlet.name)}
                      className="p-2 text-text-secondary hover:text-error hover:bg-error-light rounded-md transition-colors"
                      title="Delete outlet"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Edit Outlet Modal */}
      {editingOutlet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-text-primary">Edit Outlet</h3>
              <button onClick={() => setEditingOutlet(null)} className="p-1 text-text-tertiary hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Name *</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Phone</label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Address Line 1 *</label>
                <input
                  type="text"
                  value={editFormData.address.line1}
                  onChange={(e) => setEditFormData({ ...editFormData, address: { ...editFormData.address, line1: e.target.value } })}
                  className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">City *</label>
                <input
                  type="text"
                  value={editFormData.address.city}
                  onChange={(e) => setEditFormData({ ...editFormData, address: { ...editFormData.address, city: e.target.value } })}
                  className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">State</label>
                <input
                  type="text"
                  value={editFormData.address.state}
                  onChange={(e) => setEditFormData({ ...editFormData, address: { ...editFormData.address, state: e.target.value } })}
                  className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">ZIP</label>
                <input
                  type="text"
                  value={editFormData.address.zip}
                  onChange={(e) => setEditFormData({ ...editFormData, address: { ...editFormData.address, zip: e.target.value } })}
                  className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Service Radius (km)</label>
                <input
                  type="number"
                  value={editFormData.serviceRadius}
                  onChange={(e) => setEditFormData({ ...editFormData, serviceRadius: parseFloat(e.target.value) })}
                  className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-2">Services</label>
                <div className="flex flex-wrap gap-2">
                  {availableServices.map((svc) => (
                    <label key={svc} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editFormData.services.includes(svc)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditFormData({ ...editFormData, services: [...editFormData.services, svc] });
                          } else {
                            setEditFormData({ ...editFormData, services: editFormData.services.filter((s) => s !== svc) });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-text-primary">{svc.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditingOutlet(null)}
                className="flex-1 h-10 border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateOutlet}
                className="flex-1 h-10 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
