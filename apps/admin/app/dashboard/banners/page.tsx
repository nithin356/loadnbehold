'use client';

import { useState, useEffect } from 'react';
import { Image, Plus, Edit, Trash2, ArrowUp, ArrowDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

export default function BannersPage() {
  const { accessToken } = useAdminAuthStore();
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    isActive: true,
  });

  useEffect(() => {
    if (!accessToken) return;
    fetchBanners();
  }, [accessToken]);

  const fetchBanners = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await adminApi.getBanners(accessToken);
      setBanners(res.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch banners');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!accessToken) return;
    if (!formData.title) {
      toast.error('Title is required');
      return;
    }
    try {
      if (editingId) {
        await adminApi.updateBanner(accessToken, editingId, formData);
        toast.success('Banner updated');
      } else {
        await adminApi.createBanner(accessToken, formData);
        toast.success('Banner created');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ title: '', subtitle: '', imageUrl: '', isActive: true });
      fetchBanners();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save banner');
    }
  };

  const handleEdit = (banner: any) => {
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || '',
      imageUrl: banner.imageUrl || '',
      isActive: banner.isActive,
    });
    setEditingId(banner._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this banner?')) return;
    if (!accessToken) return;
    try {
      await adminApi.deleteBanner(accessToken, id);
      toast.success('Banner deleted');
      fetchBanners();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete banner');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Banners</h1>
          <p className="text-sm text-text-secondary mt-0.5">Manage promotional banners shown to customers</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) {
              setEditingId(null);
              setFormData({ title: '', subtitle: '', imageUrl: '', isActive: true });
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Banner'}
        </button>
      </div>

      {showForm && (
        <div className="bg-surface border border-border rounded-lg p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-text-primary mb-4">{editingId ? 'Edit Banner' : 'Create New Banner'}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Title *</label>
              <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Subtitle</label>
              <input type="text" value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Image URL</label>
              <input type="text" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm" />
              <p className="text-xs text-text-tertiary mt-1">Recommended size: <span className="font-semibold">1200 x 400px</span> (3:1 ratio). Use JPG or PNG under 500KB for best results.</p>
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
                <span className="text-sm text-text-primary">Active</span>
              </label>
            </div>
          </div>
          <button onClick={handleSave} className="mt-4 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90">
            {editingId ? 'Update' : 'Create'} Banner
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
      ) : banners.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary">No banners found</div>
      ) : (
        <div className="space-y-4">
          {banners.map((banner) => (
            <div key={banner._id} className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
              <div className="flex">
                <div className="w-48 h-28 bg-surface-secondary flex items-center justify-center flex-shrink-0">
                  {banner.imageUrl ? (
                    <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-8 h-8 text-text-tertiary" />
                  )}
                </div>
                <div className="flex-1 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-text-primary">{banner.title}</h3>
                      <p className="text-sm text-text-secondary mt-0.5">{banner.subtitle || 'No subtitle'}</p>
                    </div>
                    <span className={cn('inline-flex h-[22px] px-2 rounded-full text-[12px] font-semibold items-center', banner.isActive ? 'bg-success-light text-success' : 'bg-surface-secondary text-text-tertiary')}>
                      {banner.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4 text-sm text-text-secondary">
                      <span>{banner.clicks || 0} clicks</span>
                      <span>{banner.impressions || 0} impressions</span>
                      {banner.impressions > 0 && <span>CTR: {(((banner.clicks || 0) / banner.impressions) * 100).toFixed(1)}%</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(banner)} className="p-1.5 text-text-secondary hover:text-brand"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(banner._id)} className="p-1.5 text-text-secondary hover:text-error"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
