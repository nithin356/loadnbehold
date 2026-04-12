'use client';

import { useState, useEffect } from 'react';
import { Tag, Plus, Edit, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

export default function OffersPage() {
  const { accessToken } = useAdminAuthStore();
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'percentage',
    value: 0,
    minOrder: 0,
    maxDiscount: 0,
    validUntil: '',
    isActive: true,
  });

  useEffect(() => {
    if (!accessToken) return;
    fetchOffers();
  }, [accessToken]);

  const fetchOffers = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await adminApi.getOffers(accessToken);
      setOffers(res.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch offers');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!accessToken) return;
    if (!formData.name || !formData.code) {
      toast.error('Name and code are required');
      return;
    }
    try {
      if (editingId) {
        await adminApi.updateOffer(accessToken, editingId, formData);
        toast.success('Offer updated');
      } else {
        await adminApi.createOffer(accessToken, formData);
        toast.success('Offer created');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', code: '', type: 'percentage', value: 0, minOrder: 0, maxDiscount: 0, validUntil: '', isActive: true });
      fetchOffers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save offer');
    }
  };

  const handleEdit = (offer: any) => {
    setFormData({
      name: offer.name,
      code: offer.code,
      type: offer.type,
      value: offer.value,
      minOrder: offer.minOrder,
      maxDiscount: offer.maxDiscount || 0,
      validUntil: offer.validUntil || '',
      isActive: offer.isActive,
    });
    setEditingId(offer._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this offer?')) return;
    if (!accessToken) return;
    try {
      await adminApi.deleteOffer(accessToken, id);
      toast.success('Offer deleted');
      fetchOffers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete offer');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Offers & Promotions</h1>
          <p className="text-sm text-text-secondary mt-0.5">Create and manage promotional offers</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) {
              setEditingId(null);
              setFormData({ name: '', code: '', type: 'percentage', value: 0, minOrder: 0, maxDiscount: 0, validUntil: '', isActive: true });
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Create Offer'}
        </button>
      </div>

      {showForm && (
        <div className="bg-surface border border-border rounded-lg p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-text-primary mb-4">{editingId ? 'Edit Offer' : 'Create New Offer'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Name *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Code *</label>
              <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Type</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm">
                <option value="percentage">Percentage</option>
                <option value="flat">Flat Amount</option>
                <option value="free_delivery">Free Delivery</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Value</label>
              <input type="number" value={formData.value} onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })} className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Min Order</label>
              <input type="number" value={formData.minOrder} onChange={(e) => setFormData({ ...formData, minOrder: parseFloat(e.target.value) })} className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Max Discount</label>
              <input type="number" value={formData.maxDiscount} onChange={(e) => setFormData({ ...formData, maxDiscount: parseFloat(e.target.value) })} className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Valid Until</label>
              <input type="date" value={formData.validUntil} onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })} className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm" />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
                <span className="text-sm text-text-primary">Active</span>
              </label>
            </div>
          </div>
          <button onClick={handleSave} className="mt-4 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90">
            {editingId ? 'Update' : 'Create'} Offer
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-lg p-5 animate-pulse">
              <div className="h-6 bg-surface-secondary rounded w-48 mb-2" />
              <div className="h-4 bg-surface-secondary rounded w-full" />
            </div>
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary">No offers found</div>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => (
            <div key={offer._id} className="bg-surface border border-border rounded-lg shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', offer.isActive ? 'bg-brand-light' : 'bg-surface-secondary')}>
                    <Tag className={cn('w-5 h-5', offer.isActive ? 'text-brand' : 'text-text-tertiary')} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">{offer.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <code className="text-sm font-mono px-2 py-0.5 bg-surface-secondary rounded text-brand font-bold">{offer.code}</code>
                      <span className={cn('inline-flex h-[22px] px-2 rounded-full text-[12px] font-semibold items-center', offer.isActive ? 'bg-success-light text-success' : 'bg-surface-secondary text-text-tertiary')}>
                        {offer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
                      <span>
                        {offer.type === 'percentage' ? `${offer.value}% off` : offer.type === 'flat' ? `$${offer.value} off` : 'Free delivery'}
                      </span>
                      <span>Min: ${offer.minOrder}</span>
                      {offer.maxDiscount && <span>Max discount: ${offer.maxDiscount}</span>}
                      <span>{offer.usageCount || 0} uses</span>
                      {offer.validUntil && <span>Expires: {new Date(offer.validUntil).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEdit(offer)} className="p-2 text-text-secondary hover:text-brand hover:bg-brand-light rounded-md">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(offer._id)} className="p-2 text-text-secondary hover:text-error hover:bg-error-light rounded-md">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
