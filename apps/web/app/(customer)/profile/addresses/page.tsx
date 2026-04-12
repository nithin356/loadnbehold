'use client';

import { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, ChevronLeft, Navigation, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { reverseGeocode, stateAbbreviation } from '@/lib/geocode';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Address {
  _id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
}

const ZIP_REGEX = /^\d{5}(-\d{4})?$/;
const STATE_REGEX = /^[A-Z]{2}$/;

function validateAddress(data: { label: string; line1: string; city: string; state: string; zip: string }): string | null {
  if (!data.label.trim()) return 'Label is required';
  if (!data.line1.trim()) return 'Street address is required';
  if (!data.city.trim()) return 'City is required';
  if (!STATE_REGEX.test(data.state)) return 'State must be 2 uppercase letters (e.g. MI)';
  if (!ZIP_REGEX.test(data.zip)) return 'ZIP must be 5 digits (e.g. 48201) or ZIP+4 (e.g. 48201-1234)';
  return null;
}

export default function AddressesPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    label: '',
    line1: '',
    city: '',
    state: 'MI',
    zip: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [coordinates, setCoordinates] = useState<[number, number]>([-83.0458, 42.3314]);
  const [submitting, setSubmitting] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, [token]);

  const fetchAddresses = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response: any = await api.getAddresses(token);
      setAddresses(response.data || []);
    } catch {
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleDetectLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation not supported by your browser');
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const result = await reverseGeocode(latitude, longitude);
        if (result) {
          setFormData((prev) => ({
            ...prev,
            line1: result.line1,
            city: result.city,
            state: stateAbbreviation(result.state),
            zip: result.zip,
          }));
          setCoordinates(result.coordinates);
          toast.success('Address detected from your location');
        } else {
          toast.error('Could not determine address from location');
        }
        setDetecting(false);
      },
      () => {
        toast.error('Location access denied');
        setDetecting(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    if (!token) return;

    const validationError = validateAddress(formData);
    if (validationError) {
      toast.error(validationError);
      // Set field-level errors
      const errors: Record<string, string> = {};
      if (!formData.label.trim()) errors.label = 'Required';
      if (!formData.line1.trim()) errors.line1 = 'Required';
      if (!formData.city.trim()) errors.city = 'Required';
      if (!STATE_REGEX.test(formData.state)) errors.state = '2 uppercase letters';
      if (!ZIP_REGEX.test(formData.zip)) errors.zip = 'Invalid ZIP';
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      await api.addAddress(token, {
        ...formData,
        location: { type: 'Point', coordinates },
      });
      toast.success('Address added successfully');
      setFormData({ label: '', line1: '', city: '', state: 'MI', zip: '' });
      setCoordinates([-83.0458, 42.3314]);
      setShowForm(false);
      fetchAddresses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add address');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm('Delete this address?')) return;
    try {
      await api.deleteAddress(token, id);
      toast.success('Address deleted');
      fetchAddresses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete address');
    }
  };

  return (
    <div className="py-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-surface-secondary rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <h1 className="text-xl font-black text-text-primary">My Addresses</h1>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-surface-secondary rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Address List */}
      {!loading && (
        <div className="space-y-3 mb-6">
          {addresses.map((addr) => (
            <div key={addr._id} className="bg-surface border border-border rounded-2xl p-4 flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="font-bold text-sm text-text-primary mb-0.5">{addr.label}</p>
                  <p className="text-sm text-text-secondary">{addr.line1}</p>
                  {addr.line2 && <p className="text-sm text-text-secondary">{addr.line2}</p>}
                  <p className="text-sm text-text-secondary">{addr.city}, {addr.state} {addr.zip}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(addr._id)} className="p-2 text-text-tertiary hover:text-error hover:bg-error-light rounded-xl transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {!loading && addresses.length === 0 && (
            <div className="text-center py-10">
              <MapPin className="w-12 h-12 text-text-tertiary mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm text-text-secondary">No addresses saved yet</p>
              <p className="text-xs text-text-tertiary mt-0.5">Add one to make ordering faster</p>
            </div>
          )}
        </div>
      )}

      {/* Add Address Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 h-12 bg-brand text-white rounded-2xl text-sm font-semibold hover:bg-brand-hover transition-colors"
        >
          <Plus className="w-5 h-5" /> Add New Address
        </button>
      )}

      {/* Add Address Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="font-bold text-sm text-text-primary mb-4">New Address</h3>

          {/* Detect Location Button */}
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={detecting}
            className="w-full flex items-center gap-3 p-3 mb-4 rounded-xl border border-dashed border-brand/40 bg-brand-light/50 hover:bg-brand-light transition-colors disabled:opacity-60"
          >
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center flex-shrink-0">
              {detecting ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Navigation className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-brand">{detecting ? 'Detecting...' : 'Use Current Location'}</p>
              <p className="text-[11px] text-text-secondary">Auto-fill address from GPS</p>
            </div>
          </button>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1">Label</label>
              <div className="flex gap-2 mb-2">
                {['Home', 'Work', 'Other'].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setFormData({ ...formData, label: l })}
                    className={cn(
                      'flex-1 h-9 rounded-xl text-xs font-semibold border transition-all',
                      formData.label === l ? 'border-brand bg-brand-light text-brand' : 'border-border text-text-secondary hover:border-border-hover'
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Or type a custom label..."
                required
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1">Street Address</label>
              <input
                type="text"
                value={formData.line1}
                onChange={(e) => { setFormData({ ...formData, line1: e.target.value }); setFormErrors((prev) => ({ ...prev, line1: '' })); }}
                placeholder="123 Main St"
                required
                className={cn("w-full h-10 px-3 bg-surface-secondary border rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20", formErrors.line1 ? 'border-error' : 'border-border')}
              />
              {formErrors.line1 && <p className="text-xs text-error mt-1">{formErrors.line1}</p>}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => { setFormData({ ...formData, city: e.target.value }); setFormErrors((prev) => ({ ...prev, city: '' })); }}
                  placeholder="Detroit"
                  required
                  className={cn("w-full h-10 px-3 bg-surface-secondary border rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20", formErrors.city ? 'border-error' : 'border-border')}
                />
                {formErrors.city && <p className="text-xs text-error mt-1">{formErrors.city}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => { setFormData({ ...formData, state: e.target.value.toUpperCase() }); setFormErrors((prev) => ({ ...prev, state: '' })); }}
                  placeholder="MI"
                  required
                  maxLength={2}
                  className={cn("w-full h-10 px-3 bg-surface-secondary border rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20", formErrors.state ? 'border-error' : 'border-border')}
                />
                {formErrors.state && <p className="text-xs text-error mt-1">{formErrors.state}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1">ZIP</label>
                <input
                  type="text"
                  value={formData.zip}
                  onChange={(e) => { setFormData({ ...formData, zip: e.target.value }); setFormErrors((prev) => ({ ...prev, zip: '' })); }}
                  placeholder="48201"
                  required
                  maxLength={10}
                  className={cn("w-full h-10 px-3 bg-surface-secondary border rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20", formErrors.zip ? 'border-error' : 'border-border')}
                />
                {formErrors.zip && <p className="text-xs text-error mt-1">{formErrors.zip}</p>}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormData({ label: '', line1: '', city: '', state: 'MI', zip: '' }); }}
              className="flex-1 h-11 border border-border rounded-xl text-sm font-semibold text-text-secondary hover:bg-surface-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-11 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {submitting ? 'Adding...' : 'Add Address'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
