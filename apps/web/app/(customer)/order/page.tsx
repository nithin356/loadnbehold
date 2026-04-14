'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Shirt, Sparkles, Flame, Droplets, Bed, Package, Plus, Minus, MapPin, CreditCard, Calendar, Heart, FileText, AlertTriangle, Trash2, Shield, Navigation, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { reverseGeocode, stateAbbreviation } from '@/lib/geocode';
import { SERVICES as DEFAULT_SERVICES } from '@loadnbehold/constants';
import { cn } from '@/lib/utils';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

const icons: Record<string, React.ElementType> = { Shirt, Sparkles, Flame, Droplets, Bed };

const STEPS = ['Select', 'Schedule', 'Address', 'Payment', 'Confirm', 'Pay'];
const TIP_PRESETS = [0, 2, 5, 10];

function getTomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

interface SelectedItem {
  service: string;
  label: string;
  quantity: number;
  weight: number;
  unit: string;
  basePrice: number;
  instructions: string;
}

function OrderFlowInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuthStore((s) => s.accessToken);

  const [step, setStep] = useState(0);
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [schedule, setSchedule] = useState({ date: getTomorrowDate(), from: '10:00', to: '11:00' });
  const [address, setAddress] = useState({ label: 'Home', line1: '', city: '', state: 'MI', zip: '', instructions: '' });
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod' | 'wallet'>('online');
  const [promoCode, setPromoCode] = useState('');
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [codRequired, setCodRequired] = useState(false);
  const [codInfo, setCodInfo] = useState<{ forceCodForFirstNOrders: number; userTotalOrders: number } | null>(null);
  const [taxRate, setTaxRate] = useState(6.0);
  const [deliveryFeeBase, setDeliveryFeeBase] = useState(4.99);
  const [freeDeliveryAbove, setFreeDeliveryAbove] = useState(50);
  const [services, setServices] = useState<typeof DEFAULT_SERVICES[number][]>([...DEFAULT_SERVICES]);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [saveCard, setSaveCard] = useState(true);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<any[]>([]);
  const [selectedSavedMethod, setSelectedSavedMethod] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [addressCoordinates, setAddressCoordinates] = useState<[number, number]>([-83.0458, 42.3314]);
  const [addressServiceable, setAddressServiceable] = useState<boolean | null>(null); // null = not checked
  const [checkingServiceability, setCheckingServiceability] = useState(false);

  const checkServiceability = async (coords: [number, number]) => {
    if (!token) return;
    setCheckingServiceability(true);
    try {
      const [lng, lat] = coords;
      const res: any = await api.getNearbyOutlets(token, lat, lng);
      const outlets = res.data || [];
      setAddressServiceable(outlets.length > 0);
      if (outlets.length === 0) {
        toast.error('Sorry, we don\'t deliver to this area yet');
      }
    } catch {
      setAddressServiceable(null);
    } finally {
      setCheckingServiceability(false);
    }
  };

  const handleDetectLocation = () => {
    if (!('geolocation' in navigator)) { toast.error('Geolocation not supported'); return; }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const result = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (result) {
          setAddress((prev) => ({ ...prev, line1: result.line1, city: result.city, state: stateAbbreviation(result.state), zip: result.zip }));
          setAddressCoordinates(result.coordinates);
          checkServiceability(result.coordinates);
          toast.success('Address auto-filled from your location');
        } else {
          toast.error('Could not detect address');
        }
        setDetectingLocation(false);
      },
      () => { toast.error('Location access denied'); setDetectingLocation(false); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Fetch dynamic service prices
  useEffect(() => {
    if (!token) return;
    api.getServices(token).then((res: any) => {
      const data = res.data;
      if (Array.isArray(data) && data.length > 0) {
        setServices(data);
      }
    }).catch(() => { toast.error('Failed to load services'); });
  }, [token]);

  // Handle reorder — pre-fill items from a previous order
  useEffect(() => {
    if (!token) return;
    const reorderId = searchParams.get('reorder');
    if (!reorderId) return;
    api.getOrder(token, reorderId).then((res: any) => {
      const order = res.data;
      if (order?.items?.length) {
        const reorderItems: SelectedItem[] = order.items.map((item: any) => {
          const svc = services.find((s) => s.key === item.service);
          return {
          service: item.service,
          label: svc?.label || item.service?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || item.service,
          quantity: item.quantity || 1,
          weight: item.weight || (item.unit === 'lbs' ? 5 : 0),
          unit: item.unit || 'lbs',
          basePrice: item.price || svc?.basePrice || 0,
          instructions: item.specialInstructions || '',
        };
        });
        setItems(reorderItems);
        toast.success('Previous order loaded — review and place again');
      }
    }).catch(() => { toast.error('Failed to load previous order'); });
  }, [token, searchParams]);

  // Handle service pre-select from home page (e.g. /order?service=wash_fold)
  useEffect(() => {
    const serviceKey = searchParams.get('service');
    if (!serviceKey || items.length > 0) return;
    const svc = services.find((s) => s.key === serviceKey);
    if (svc) addItem(svc);
  }, [services, searchParams]);

  // Fetch saved payment methods
  useEffect(() => {
    if (!token) return;
    api.getSavedPaymentMethods(token).then((res: any) => {
      const methods = res.data || [];
      setSavedPaymentMethods(methods);
      const defaultMethod = methods.find((m: any) => m.isDefault);
      if (defaultMethod) setSelectedSavedMethod(defaultMethod._id);
    }).catch(() => { toast.error('Failed to load payment methods'); });
  }, [token]);

  // Fetch COD config
  useEffect(() => {
    if (!token) return;
    api.getOrderConfig(token).then((res: any) => {
      const data = res.data;
      if (data?.codRequired) {
        setCodRequired(true);
        setPaymentMethod('cod');
      }
      setCodInfo({ forceCodForFirstNOrders: data.forceCodForFirstNOrders, userTotalOrders: data.userTotalOrders });
      if (data.taxRate != null) setTaxRate(data.taxRate);
      if (data.deliveryFee != null) setDeliveryFeeBase(data.deliveryFee);
      if (data.freeDeliveryAbove != null) setFreeDeliveryAbove(data.freeDeliveryAbove);
    }).catch(() => { toast.error('Failed to load order config'); });
  }, [token]);

  // Fetch saved addresses
  useEffect(() => {
    if (!token) return;
    api.getAddresses(token)
      .then((res: any) => {
        const addrs = res.data || [];
        setSavedAddresses(addrs);
        // Auto-select first saved address
        if (addrs.length > 0 && !address.line1) {
          const a = addrs[0];
          setAddress({ label: a.label || 'Home', line1: a.line1, city: a.city, state: a.state, zip: a.zip, instructions: a.instructions || '' });
        }
      })
      .catch(() => { toast.error('Failed to load addresses'); });
  }, [token]);

  const addItem = (service: typeof DEFAULT_SERVICES[number]) => {
    const existing = items.find((i) => i.service === service.key);
    if (existing) {
      setItems(items.map((i) => i.service === service.key ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, {
        service: service.key,
        label: service.label,
        quantity: 1,
        weight: service.unit === 'lbs' ? 5 : 0,
        unit: service.unit,
        basePrice: service.basePrice,
        instructions: '',
      }]);
    }
  };

  const updateQuantity = (key: string, delta: number) => {
    setItems(items.map((i) => {
      if (i.service !== key) return i;
      const qty = Math.max(0, i.quantity + delta);
      return { ...i, quantity: qty };
    }).filter((i) => i.quantity > 0));
  };

  const subtotal = items.reduce((sum, i) => sum + i.quantity * (i.unit === 'lbs' ? i.weight : 1) * i.basePrice, 0);
  const deliveryFee = subtotal >= freeDeliveryAbove ? 0 : deliveryFeeBase;
  const tax = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
  const activeTip = customTip ? parseFloat(customTip) || 0 : tip;
  const total = parseFloat((subtotal + deliveryFee + tax + activeTip).toFixed(2));

  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});

  const ZIP_REGEX = /^\d{5}(-\d{4})?$/;
  const STATE_REGEX = /^[A-Z]{2}$/;

  const validateAddressFields = (): boolean => {
    const errors: Record<string, string> = {};
    if (!address.line1.trim()) errors.line1 = 'Street address is required';
    if (!address.city.trim()) errors.city = 'City is required';
    if (!STATE_REGEX.test(address.state)) errors.state = '2 uppercase letters';
    if (!ZIP_REGEX.test(address.zip)) errors.zip = 'Invalid ZIP code';
    setAddressErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix address errors before continuing');
      return false;
    }
    return true;
  };

  const canProceed = () => {
    if (step === 0) return items.length > 0;
    if (step === 1) return schedule.date !== '';
    if (step === 2) return address.line1 !== '' && address.city !== '' && address.zip !== '' && addressServiceable !== false && !checkingServiceability;
    return true;
  };

  const handleSubmit = async () => {
    if (!token) { toast.error('Please log in'); return; }
    if (!agreedToTerms) { toast.error('Please agree to the Terms & Conditions'); return; }
    setLoading(true);
    try {
      const orderData = {
        items: items.map((i) => ({
          service: i.service,
          quantity: i.quantity,
          weight: i.weight,
          unit: i.unit,
          price: i.basePrice,
          specialInstructions: i.instructions,
        })),
        pickupAddress: {
          ...address,
          location: { type: 'Point', coordinates: addressCoordinates },
        },
        deliveryAddress: {
          ...address,
          location: { type: 'Point', coordinates: addressCoordinates },
        },
        schedule: { pickupSlot: schedule },
        paymentMethod,
        promoCode: promoCode || undefined,
        tip: activeTip,
      };

      const orderRes: any = await api.createOrder(token, orderData);
      const order = orderRes.data;

      // For online payments, create payment intent then show card form
      if (paymentMethod === 'online' && order?._id) {
        const intentOpts: { saveCard?: boolean; savedPaymentMethodId?: string } = {};
        if (saveCard && !selectedSavedMethod) intentOpts.saveCard = true;
        if (selectedSavedMethod) intentOpts.savedPaymentMethodId = selectedSavedMethod;

        const intentRes: any = await api.createPaymentIntent(token, order._id, order.pricing?.total || total, intentOpts);
        const { clientSecret, gateway } = intentRes.data || {};

        if (clientSecret && gateway === 'stripe') {
          setPendingOrderId(order._id);
          setStripeClientSecret(clientSecret);
          setStep(5); // Go to payment step
        } else {
          toast.success('Order placed! Payment is pending.');
          router.push('/orders');
        }
      } else {
        toast.success('Order placed successfully!');
        router.push('/orders');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-6 max-w-2xl mx-auto overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => step > 0 ? setStep(step - 1) : router.back()} className="p-2 rounded-full hover:bg-surface-secondary text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Place Order</h1>
          <p className="text-xs text-text-tertiary">{step < 5 ? `Step ${step + 1} of 5` : 'Payment'}</p>
        </div>
      </div>

      {/* Compact Step Indicator — show first 5 steps only */}
      <div className="flex items-center mb-8 overflow-hidden">
        {STEPS.slice(0, 5).map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none min-w-0">
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all flex-shrink-0',
                i < step ? 'bg-success text-white' : i === step ? 'bg-brand text-white shadow-brand' : 'bg-surface-secondary text-text-tertiary'
              )}>
                {i < step ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className={cn(
                'text-[11px] font-medium hidden sm:inline truncate',
                i === step ? 'text-brand' : i < step ? 'text-success' : 'text-text-tertiary'
              )}>{s}</span>
            </div>
            {i < 4 && (
              <div className={cn('flex-1 h-[2px] mx-1 sm:mx-2 rounded-full transition-colors min-w-[8px]', i < step ? 'bg-success' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

          {/* Step 1: Select Services */}
          {step === 0 && (
            <div className="space-y-3">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-text-primary">Select Services</h2>
                <p className="text-sm text-text-secondary">Choose what you need cleaned</p>
              </div>
              {services.map((service) => {
                const Icon = icons[service.icon] || Package;
                const item = items.find((i) => i.service === service.key);
                return (
                  <motion.div key={service.key} whileTap={{ scale: 0.98 }} className={cn(
                    'flex items-center justify-between p-4 bg-surface border rounded-xl transition-all',
                    item ? 'border-brand/50 bg-brand-light/30 shadow-sm' : 'border-border hover:border-border-hover'
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center transition-colors',
                        item ? 'bg-brand text-white' : 'bg-brand-light text-brand'
                      )}>
                        <Icon className="w-5 h-5" strokeWidth={1.75} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-text-primary">{service.label}</p>
                        <p className="text-xs text-text-secondary">${service.basePrice}/{service.unit === 'lbs' ? 'lb' : 'item'}</p>
                      </div>
                    </div>
                    {item ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(service.key, -1)} className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center hover:bg-border transition-colors">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-brand">{item.quantity}</span>
                        <button onClick={() => updateQuantity(service.key, 1)} className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand-hover transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => addItem(service)} className="px-4 py-1.5 text-xs font-bold text-brand border border-brand rounded-full hover:bg-brand-light transition-colors">
                        ADD
                      </button>
                    )}
                  </motion.div>
                );
              })}
              {items.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 bg-brand-light/50 border border-brand/20 rounded-xl text-center">
                  <p className="text-sm text-brand font-semibold">{items.length} service(s) selected &middot; Subtotal: ${subtotal.toFixed(2)}</p>
                </motion.div>
              )}
            </div>
          )}

          {/* Step 2: Schedule */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2"><Calendar className="w-5 h-5 text-brand" /> Schedule Pickup</h2>
                <p className="text-sm text-text-secondary">When should we pick up your laundry?</p>
              </div>

              {/* Date + Time in a card */}
              <div className="bg-surface border border-border rounded-2xl p-4 space-y-4">
                {/* Quick-select date chips */}
                <div>
                  <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2">Pickup Date</label>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {(() => {
                      const chips: { label: string; sub: string; value: string }[] = [];
                      for (let d = 0; d < 7; d++) {
                        const date = new Date();
                        date.setDate(date.getDate() + d);
                        const value = date.toISOString().split('T')[0];
                        const label = d === 0 ? 'Today' : d === 1 ? 'Tmrw' : date.toLocaleDateString('en-US', { weekday: 'short' });
                        const sub = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        chips.push({ label, sub, value });
                      }
                      return chips.map((chip) => (
                        <button
                          key={chip.value}
                          type="button"
                          onClick={() => setSchedule({ ...schedule, date: chip.value })}
                          className={cn(
                            'flex-shrink-0 w-16 py-2 rounded-xl text-center transition-all border',
                            schedule.date === chip.value
                              ? 'bg-brand text-white border-brand shadow-brand'
                              : 'bg-surface-secondary border-transparent text-text-primary hover:border-brand/40'
                          )}
                        >
                          <span className="block text-xs font-bold">{chip.label}</span>
                          <span className={cn('block text-[10px] mt-0.5', schedule.date === chip.value ? 'text-white/80' : 'text-text-tertiary')}>{chip.sub}</span>
                        </button>
                      ));
                    })()}
                  </div>
                </div>

                {/* Or pick from calendar */}
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Or pick a date</label>
                  <input
                    type="date"
                    value={schedule.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSchedule({ ...schedule, date: e.target.value })}
                    className="w-full max-w-full h-11 px-3 bg-surface-secondary border border-border rounded-xl text-base text-text-primary focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none transition-all appearance-none [&::-webkit-date-and-time-value]:text-left"
                  />
                </div>

                {/* Divider */}
                <div className="border-t border-border" />

                {/* Time slot */}
                <div>
                  <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2">Pickup Window</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0 overflow-hidden">
                      <span className="block text-xs text-text-secondary mb-1">From</span>
                      <input type="time" value={schedule.from} onChange={(e) => setSchedule({ ...schedule, from: e.target.value })} className="w-full max-w-full h-11 px-2 sm:px-3 bg-surface-secondary border border-border rounded-xl text-base text-text-primary focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none transition-all appearance-none" />
                    </div>
                    <div className="min-w-0 overflow-hidden">
                      <span className="block text-xs text-text-secondary mb-1">To</span>
                      <input type="time" value={schedule.to} onChange={(e) => setSchedule({ ...schedule, to: e.target.value })} className="w-full max-w-full h-11 px-2 sm:px-3 bg-surface-secondary border border-border rounded-xl text-base text-text-primary focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none transition-all appearance-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary card */}
              {schedule.date && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-brand-light/50 border border-brand/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">
                        {new Date(schedule.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-text-secondary">{schedule.from} &ndash; {schedule.to}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Step 3: Address */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2"><MapPin className="w-5 h-5 text-brand" /> Pickup Address</h2>
                <p className="text-sm text-text-secondary">Where should the driver collect your items?</p>
              </div>

              {/* Detect Location */}
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={detectingLocation}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-brand/40 bg-brand-light/50 hover:bg-brand-light transition-colors disabled:opacity-60"
              >
                <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
                  {detectingLocation ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Navigation className="w-4 h-4 text-white" />}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-brand">{detectingLocation ? 'Detecting...' : 'Use Current Location'}</p>
                  <p className="text-[11px] text-text-secondary">Auto-fill address from GPS</p>
                </div>
              </button>

              {/* Serviceability Status */}
              {checkingServiceability && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-secondary border border-border">
                  <Loader2 className="w-4 h-4 text-brand animate-spin" />
                  <span className="text-sm text-text-secondary">Checking if we deliver to this area...</span>
                </div>
              )}
              {addressServiceable === false && !checkingServiceability && (
                <div className="flex items-start gap-3 p-4 bg-error/10 border border-error/30 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Area not serviceable</p>
                    <p className="text-xs text-text-secondary mt-0.5">Sorry, we don&apos;t deliver to this location yet. Please try a different address.</p>
                  </div>
                </div>
              )}
              {addressServiceable === true && !checkingServiceability && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/30">
                  <Check className="w-4 h-4 text-success" />
                  <span className="text-sm text-success font-medium">We deliver to this area!</span>
                </div>
              )}

              {/* Saved Addresses */}
              {savedAddresses.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2">Saved Addresses</p>
                  <div className="space-y-2">
                    {savedAddresses.map((a: any, i: number) => {
                      const isSelected = address.line1 === a.line1 && address.zip === a.zip;
                      return (
                        <button
                          key={a._id || i}
                          type="button"
                          onClick={() => {
                            setAddress({ label: a.label || 'Home', line1: a.line1, city: a.city, state: a.state, zip: a.zip, instructions: a.instructions || '' });
                            if (a.location?.coordinates) {
                              setAddressCoordinates(a.location.coordinates);
                              checkServiceability(a.location.coordinates);
                            } else {
                              setAddressServiceable(null);
                            }
                          }}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                            isSelected ? 'border-brand bg-brand-light/30 shadow-sm' : 'border-border bg-surface hover:border-border-hover'
                          )}
                        >
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', isSelected ? 'bg-brand text-white' : 'bg-surface-secondary text-text-tertiary')}>
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-primary">{a.label || 'Address'}</p>
                            <p className="text-xs text-text-secondary truncate">{a.line1}, {a.city}, {a.state} {a.zip}</p>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-[11px]"><span className="bg-background px-3 text-text-tertiary">or enter a new address</span></div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Street Address</label>
                <input type="text" value={address.line1} onChange={(e) => { setAddress({ ...address, line1: e.target.value }); setAddressErrors((prev) => ({ ...prev, line1: '' })); }} placeholder="123 Main St" className={cn("w-full h-12 px-4 bg-surface border rounded-xl text-text-primary placeholder:text-text-tertiary focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none transition-all", addressErrors.line1 ? 'border-error' : 'border-border')} />
                {addressErrors.line1 && <p className="text-xs text-error mt-1">{addressErrors.line1}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">City</label>
                  <input type="text" value={address.city} onChange={(e) => { setAddress({ ...address, city: e.target.value }); setAddressErrors((prev) => ({ ...prev, city: '' })); }} placeholder="Detroit" className={cn("w-full h-12 px-4 bg-surface border rounded-xl text-text-primary placeholder:text-text-tertiary focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none transition-all", addressErrors.city ? 'border-error' : 'border-border')} />
                  {addressErrors.city && <p className="text-xs text-error mt-1">{addressErrors.city}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">ZIP Code</label>
                  <input type="text" value={address.zip} onChange={(e) => { setAddress({ ...address, zip: e.target.value }); setAddressErrors((prev) => ({ ...prev, zip: '' })); }} placeholder="48201" className={cn("w-full h-12 px-4 bg-surface border rounded-xl text-text-primary placeholder:text-text-tertiary focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none transition-all", addressErrors.zip ? 'border-error' : 'border-border')} />
                  {addressErrors.zip && <p className="text-xs text-error mt-1">{addressErrors.zip}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Delivery Instructions <span className="text-text-tertiary">(optional)</span></label>
                <textarea value={address.instructions} onChange={(e) => setAddress({ ...address, instructions: e.target.value })} placeholder="Gate code, leave at door, etc." rows={2} className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-tertiary focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none transition-all resize-none" />
              </div>
            </div>
          )}

          {/* Step 4: Payment + Tip */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2"><CreditCard className="w-5 h-5 text-brand" /> Payment</h2>
                <p className="text-sm text-text-secondary">Choose how you'd like to pay</p>
              </div>

              {/* COD Required Notice */}
              {codRequired && codInfo && (
                <div className="flex items-start gap-3 p-4 bg-warning-light border border-warning/30 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Cash on Delivery Required</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Your first {codInfo.forceCodForFirstNOrders} orders must use Cash on Delivery.
                      You have completed {codInfo.userTotalOrders} order(s) so far.
                    </p>
                  </div>
                </div>
              )}

              {/* Payment Methods */}
              <div className="space-y-2">
                {([
                  { key: 'online' as const, label: 'Pay Online', desc: 'Credit/debit card via Stripe', emoji: '💳' },
                  { key: 'wallet' as const, label: 'Wallet', desc: 'Pay from wallet balance', emoji: '👛' },
                  { key: 'cod' as const, label: 'Cash on Delivery', desc: 'Pay cash to driver', emoji: '💵' },
                ]).map((method) => {
                  const disabled = codRequired && method.key !== 'cod';
                  return (
                    <button
                      key={method.key}
                      onClick={() => !disabled && setPaymentMethod(method.key)}
                      disabled={disabled}
                      className={cn(
                        'w-full flex items-center gap-3 p-4 bg-surface border rounded-xl transition-all text-left',
                        disabled && 'opacity-40 cursor-not-allowed',
                        paymentMethod === method.key ? 'border-brand bg-brand-light/30 shadow-sm' : 'border-border hover:border-border-hover'
                      )}
                    >
                      <span className="text-xl">{method.emoji}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-text-primary">{method.label}</p>
                        <p className="text-xs text-text-secondary">{method.desc}</p>
                      </div>
                      <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center', paymentMethod === method.key ? 'border-brand' : 'border-border')}>
                        {paymentMethod === method.key && <div className="w-2.5 h-2.5 rounded-full bg-brand" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Saved Cards (when online selected) */}
              {paymentMethod === 'online' && savedPaymentMethods.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Saved Cards</p>
                  {savedPaymentMethods.map((method: any) => {
                    const isSelected = selectedSavedMethod === method._id;
                    return (
                      <button
                        key={method._id}
                        onClick={() => setSelectedSavedMethod(isSelected ? null : method._id)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                          isSelected ? 'border-brand bg-brand-light/30 shadow-sm' : 'border-border bg-surface hover:border-border-hover'
                        )}
                      >
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', isSelected ? 'bg-brand text-white' : 'bg-surface-secondary text-text-tertiary')}>
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary capitalize">{method.card?.brand || method.gateway} ****{method.card?.last4}</p>
                          <p className="text-xs text-text-secondary">Expires {method.card?.expMonth}/{method.card?.expYear} &middot; {method.gateway}</p>
                        </div>
                        {method.isDefault && (
                          <span className="text-[10px] font-bold text-brand bg-brand-light px-2 py-0.5 rounded-full">DEFAULT</span>
                        )}
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                  <p className="text-xs text-text-tertiary">{selectedSavedMethod ? 'Using saved card. Click again to enter a new card.' : 'Or enter a new card at checkout.'}</p>
                </div>
              )}

              {/* Save Card Checkbox (when online + no saved method selected) */}
              {paymentMethod === 'online' && !selectedSavedMethod && (
                <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-surface-secondary transition-colors border border-border bg-surface">
                  <input
                    type="checkbox"
                    checked={saveCard}
                    onChange={(e) => setSaveCard(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-brand focus:ring-brand accent-[var(--brand)]"
                  />
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-brand" />
                    <span className="text-sm text-text-primary font-medium">Save card for future orders</span>
                  </div>
                </label>
              )}

              {/* Tip Section */}
              <div className="border border-border rounded-xl p-4 bg-surface">
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="w-4 h-4 text-pink-500" />
                  <span className="text-sm font-semibold text-text-primary">Tip your driver</span>
                </div>
                <p className="text-xs text-text-secondary mb-3">100% of tips go directly to the driver</p>
                <div className="flex gap-2 mb-3">
                  {TIP_PRESETS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => { setTip(amount); setCustomTip(''); }}
                      className={cn(
                        'flex-1 h-10 rounded-lg text-sm font-semibold transition-all',
                        tip === amount && !customTip
                          ? 'bg-brand text-white shadow-brand'
                          : 'bg-surface-secondary text-text-primary hover:bg-border'
                      )}
                    >
                      {amount === 0 ? 'None' : `$${amount}`}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary">$</span>
                  <input
                    type="number"
                    placeholder="Custom amount"
                    value={customTip}
                    min="0"
                    step="0.50"
                    onChange={(e) => { setCustomTip(e.target.value); setTip(0); }}
                    className="w-full h-10 pl-7 pr-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Promo Code */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Promo Code</label>
                <input type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="FIRST20" className="w-full h-12 px-4 bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-tertiary focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none uppercase transition-all" />
              </div>
            </div>
          )}

          {/* Step 5: Confirm */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-text-primary">Order Summary</h2>
                <p className="text-sm text-text-secondary">Review your order before placing</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Items + Pricing */}
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                  {items.map((item, i) => (
                    <div key={item.service} className={cn('flex justify-between p-4', i < items.length - 1 && 'border-b border-border')}>
                      <div>
                        <span className="text-sm font-medium text-text-primary">{item.label}</span>
                        <span className="text-xs text-text-secondary ml-1">x{item.quantity}</span>
                      </div>
                      <span className="text-sm font-semibold">${(item.quantity * (item.unit === 'lbs' ? item.weight : 1) * item.basePrice).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="p-4 bg-surface-secondary/50 space-y-2 text-sm">
                    <div className="flex justify-between text-text-secondary"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-text-secondary"><span>Delivery Fee</span><span className={deliveryFee === 0 ? 'text-success font-medium' : ''}>{deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)}`}</span></div>
                    <div className="flex justify-between text-text-secondary"><span>Tax ({taxRate}%)</span><span>${tax.toFixed(2)}</span></div>
                    {activeTip > 0 && (
                      <div className="flex justify-between text-text-secondary"><span>Driver Tip</span><span className="text-pink-500 font-medium">${activeTip.toFixed(2)}</span></div>
                    )}
                    <div className="flex justify-between font-bold text-text-primary pt-2 border-t border-border text-base"><span>Total</span><span>${total.toFixed(2)}</span></div>
                  </div>
                </div>

                {/* Right: Order Details */}
                <div className="space-y-4">
                  <div className="bg-surface border border-border rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-text-tertiary mt-0.5 flex-shrink-0" />
                      <div><span className="text-text-secondary">Pickup:</span> <span className="font-medium text-text-primary">{schedule.date} &middot; {schedule.from}&#8211;{schedule.to}</span></div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-text-tertiary mt-0.5 flex-shrink-0" />
                      <div><span className="text-text-secondary">Address:</span> <span className="font-medium text-text-primary">{address.line1}, {address.city}, {address.state} {address.zip}</span></div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CreditCard className="w-4 h-4 text-text-tertiary mt-0.5 flex-shrink-0" />
                      <div><span className="text-text-secondary">Payment:</span> <span className="font-medium text-text-primary">{paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'wallet' ? 'Wallet' : 'Online'}</span></div>
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <label className="flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:bg-surface-secondary transition-colors">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-border text-brand focus:ring-brand accent-[var(--brand)]"
                    />
                    <span className="text-xs text-text-secondary leading-relaxed">
                      I agree to the{' '}
                      <a href="/terms" target="_blank" className="text-brand hover:underline font-medium">Terms & Conditions</a>
                      {' '}and{' '}
                      <a href="/privacy" target="_blank" className="text-brand hover:underline font-medium">Privacy Policy</a>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Stripe Card Payment */}
          {step === 5 && stripeClientSecret && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2"><CreditCard className="w-5 h-5 text-brand" /> Enter Card Details</h2>
                <p className="text-sm text-text-secondary">Complete your payment securely via Stripe</p>
              </div>

              <div className="bg-surface border border-border rounded-xl p-4 mb-2">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-text-secondary">Amount to pay</span>
                  <span className="text-xl font-bold text-text-primary">${total.toFixed(2)}</span>
                </div>
                <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#6366f1' } } }}>
                  <StripeCardForm
                    clientSecret={stripeClientSecret}
                    orderId={pendingOrderId!}
                    token={token!}
                    saveCard={saveCard && !selectedSavedMethod}
                    onSuccess={() => {
                      toast.success('Payment successful! Order placed.');
                      router.push('/orders');
                    }}
                    onError={(msg) => {
                      toast.error(msg);
                    }}
                  />
                </Elements>
              </div>

              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                <span>Secured by Stripe. Your card details never touch our servers.</span>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      {step !== 5 && (
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="flex-1 h-12 border border-border bg-surface rounded-xl font-medium text-text-primary hover:bg-surface-secondary transition-colors">
              Back
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={() => {
                if (step === 2 && !validateAddressFields()) return;
                setStep(step + 1);
              }}
              disabled={!canProceed()}
              className="flex-1 h-12 bg-brand text-white font-semibold rounded-xl shadow-brand hover:bg-brand-hover transition-all disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-1.5"
            >
              {checkingServiceability && step === 2 ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Checking area...</>
              ) : addressServiceable === false && step === 2 ? (
                <>Not Serviceable</>
              ) : (
                <>Continue <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          ) : step === 4 ? (
            <button
              onClick={handleSubmit}
              disabled={loading || !agreedToTerms}
              className="flex-1 h-12 bg-brand text-white font-semibold rounded-xl shadow-brand hover:bg-brand-hover transition-all disabled:opacity-40 disabled:shadow-none flex items-center justify-center"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : paymentMethod === 'online' ? `Proceed to Pay \u00B7 $${total.toFixed(2)}` : `Place Order \u00B7 $${total.toFixed(2)}`}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Stripe Card Form Component ─────────────────────────────
function StripeCardForm({ clientSecret, orderId, token, saveCard, onSuccess, onError }: {
  clientSecret: string;
  orderId: string;
  token: string;
  saveCard?: boolean;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    setPaying(true);
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (error) {
        onError(error.message || 'Payment failed');
        setPaying(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        await api.confirmPayment(token, paymentIntent.id, orderId, saveCard);
        onSuccess();
      } else {
        onSuccess(); // Order created, payment processing
      }
    } catch (err: any) {
      onError(err.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-background border border-border rounded-lg p-4">
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#e2e8f0',
              '::placeholder': { color: '#64748b' },
            },
            invalid: { color: '#f87171' },
          },
        }} />
      </div>
      <button
        onClick={handlePay}
        disabled={paying || !stripe}
        className="w-full h-12 bg-brand text-white font-semibold rounded-xl shadow-brand hover:bg-brand-hover transition-all disabled:opacity-40 disabled:shadow-none flex items-center justify-center"
      >
        {paying ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Pay Now'}
      </button>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="py-6"><div className="skeleton h-8 w-48 mb-4" /><div className="skeleton h-64 w-full" /></div>}>
      <OrderFlowInner />
    </Suspense>
  );
}
