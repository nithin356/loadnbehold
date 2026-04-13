'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  House, ShoppingBag, MapPin, Wallet, User, Sun, Moon,
  ChevronDown, Navigation, Plus, X, AlertTriangle, CheckCircle2,
  Home, Briefcase, Building2, Loader2, Shield,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useLocationStore } from '@/lib/store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/home', label: 'Home', icon: House },
  { href: '/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/track', label: 'Track', icon: MapPin },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/profile', label: 'Profile', icon: User },
];

const LABEL_ICONS: Record<string, React.ElementType> = {
  Home, Work: Briefcase, Apartment: Building2,
};

export function TopNav() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const token = useAuthStore((s) => s.accessToken);
  const {
    selectedAddress, serviceable, nearestOutlet,
    setSelectedAddress, setCurrentCoords, setServiceability,
  } = useLocationStore();

  const [open, setOpen] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [checking, setChecking] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-detect location on first load if no address selected
  useEffect(() => {
    if (selectedAddress || !token || !mounted) return;
    detectCurrentLocation();
  }, [token, mounted]);

  // Fetch addresses when sheet opens
  useEffect(() => {
    if (!open || !token) return;
    setLoadingAddresses(true);
    api.getAddresses(token)
      .then((res: any) => setAddresses(res.data || []))
      .catch(() => { /* address fetch failed — non-critical for nav */ })
      .finally(() => setLoadingAddresses(false));
  }, [open, token]);

  const detectCurrentLocation = () => {
    if (!('geolocation' in navigator) || !token) return;
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentCoords(coords);
        checkServiceability(coords.lat, coords.lng);
        setDetectingLocation(false);
      },
      () => setDetectingLocation(false),
      { timeout: 10000 }
    );
  };

  const checkServiceability = async (lat: number, lng: number) => {
    if (!token) return;
    setChecking(true);
    try {
      const res: any = await api.getNearbyOutlets(token, lat, lng);
      const outlets = res.data || [];
      if (outlets.length > 0) {
        const item = outlets[0];
        setServiceability(true, { name: item.outlet?.name || item.name, distance: item.distance });
      } else {
        setServiceability(false, null);
      }
    } catch {
      setServiceability(false, null);
    } finally {
      setChecking(false);
    }
  };

  const selectAddress = (addr: any) => {
    setSelectedAddress(addr);
    setOpen(false);
    if (addr.location?.coordinates) {
      const [lng, lat] = addr.location.coordinates;
      setCurrentCoords({ lat, lng });
      checkServiceability(lat, lng);
    }
  };

  const useCurrentLocation = () => {
    setSelectedAddress(null);
    detectCurrentLocation();
    setOpen(false);
  };

  const displayLabel = selectedAddress
    ? selectedAddress.label
    : detectingLocation
    ? 'Detecting...'
    : 'Current Location';

  const displayDetail = selectedAddress
    ? `${selectedAddress.line1}, ${selectedAddress.city}`
    : nearestOutlet
    ? `Near ${nearestOutlet.name}`
    : 'Tap to set location';

  return (
    <>
      <header className="sticky top-0 z-30 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-2 flex-shrink-0">
            <div className="relative w-8 h-8 flex-shrink-0">
              <img
                src="/logo.png"
                alt="LoadNBehold"
                className="w-8 h-8 rounded-lg shadow-md"
                onError={(e) => {
                  const el = e.currentTarget;
                  el.style.display = 'none';
                  (el.nextElementSibling as HTMLElement)?.style.setProperty('display', 'flex');
                }}
              />
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white items-center justify-center text-[10px] font-black shadow-md absolute inset-0" style={{ display: 'none' }}>
                LNB
              </div>
            </div>
          </Link>

          {/* Divider */}
          <div className="w-px h-6 bg-border flex-shrink-0" />

          {/* Location Picker — inline in nav */}
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 min-w-0 flex-shrink group"
          >
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
              serviceable === false ? 'bg-red-50 dark:bg-red-950/40' : 'bg-brand-light'
            )}>
              {detectingLocation || checking ? (
                <Loader2 className="w-3.5 h-3.5 text-brand animate-spin" />
              ) : (
                <MapPin className={cn('w-3.5 h-3.5', serviceable === false ? 'text-error' : 'text-brand')} strokeWidth={2.25} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-0.5">
                <span className="text-sm font-bold text-text-primary truncate max-w-[100px] sm:max-w-[160px]">{displayLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0 group-hover:text-brand transition-colors" />
              </div>
              <p className="text-[10px] text-text-secondary truncate max-w-[120px] sm:max-w-[200px] leading-tight">{displayDetail}</p>
            </div>
          </button>

          {/* Serviceability badge — compact */}
          {serviceable === false && (
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-error bg-red-50 dark:bg-red-950/40 px-2 py-1 rounded-full flex-shrink-0">
              <AlertTriangle className="w-3 h-3" /> Unserviceable
            </span>
          )}
          {serviceable === true && (
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-success bg-success-light px-2 py-1 rounded-full flex-shrink-0">
              <CheckCircle2 className="w-3 h-3" /> Serviceable
            </span>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>

          {/* Theme toggle */}
          <div className="flex items-center gap-2">
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-all"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" strokeWidth={1.75} />
                ) : (
                  <Moon className="w-5 h-5" strokeWidth={1.75} />
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Unserviceable banner — mobile only, below nav */}
      {serviceable === false && (
        <div className="sm:hidden bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900 px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-error flex-shrink-0" />
          <p className="text-xs text-error font-semibold">We don't deliver to this area yet</p>
        </div>
      )}

      {/* Address Picker Sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              ref={sheetRef}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl max-h-[70vh] overflow-hidden flex flex-col shadow-2xl md:max-w-md md:mx-auto md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 md:hidden">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              {/* Sheet header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <h3 className="text-base font-black text-text-primary">Delivery Location</h3>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-full hover:bg-surface-secondary text-text-tertiary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Use current location */}
              <div className="px-5">
                <button
                  onClick={useCurrentLocation}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border border-dashed border-brand/40 bg-brand-light/50 hover:bg-brand-light transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center flex-shrink-0">
                    <Navigation className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-brand">Use Current Location</p>
                    <p className="text-[11px] text-text-secondary">Detect via GPS</p>
                  </div>
                </button>
              </div>

              {/* Saved addresses */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2">Saved Addresses</p>
                {loadingAddresses ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 text-text-tertiary animate-spin" />
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-6">
                    <MapPin className="w-8 h-8 text-text-tertiary mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-text-secondary">No saved addresses</p>
                    <p className="text-xs text-text-tertiary mt-0.5">Add one from your profile</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {addresses.map((addr: any) => {
                      const isSelected = selectedAddress?._id === addr._id;
                      const LabelIcon = LABEL_ICONS[addr.label] || MapPin;
                      return (
                        <button
                          key={addr._id}
                          onClick={() => selectAddress(addr)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left',
                            isSelected
                              ? 'border-brand bg-brand-light/50 shadow-sm'
                              : 'border-border hover:border-brand/30 hover:bg-surface-secondary'
                          )}
                        >
                          <div className={cn(
                            'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                            isSelected ? 'bg-brand' : 'bg-surface-secondary'
                          )}>
                            <LabelIcon className={cn('w-4 h-4', isSelected ? 'text-white' : 'text-text-tertiary')} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm font-bold', isSelected ? 'text-brand' : 'text-text-primary')}>{addr.label}</p>
                            <p className="text-[11px] text-text-secondary truncate">{addr.line1}, {addr.city} {addr.zip}</p>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4.5 h-4.5 text-brand flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add new address */}
              <div className="px-5 pb-5 pt-2 border-t border-border">
                <a
                  href="/profile/addresses"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 w-full h-11 bg-surface-secondary border border-border rounded-2xl text-sm font-semibold text-text-secondary hover:text-brand hover:border-brand/30 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add New Address
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all',
        isActive
          ? 'text-brand bg-brand-light'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
      )}
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
      {label}
    </Link>
  );
}

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-all px-3 py-1',
                isActive ? 'text-brand' : 'text-text-tertiary'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-xl transition-all',
                isActive && 'bg-brand-light'
              )}>
                <item.icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.75} />
              </div>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
