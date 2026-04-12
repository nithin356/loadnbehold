'use client';

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Shirt, Sparkles, Flame, Droplets, Bed, ChevronRight, MapPin, Clock, Package, Star, Zap, ShieldCheck, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { SERVICES } from '@loadnbehold/constants';

const serviceIcons: Record<string, React.ElementType> = {
  Shirt, Sparkles, Flame, Droplets, Bed,
};

const serviceColors: Record<string, string> = {
  wash_fold: 'from-blue-500 to-cyan-500',
  dry_clean: 'from-purple-500 to-pink-500',
  iron: 'from-orange-500 to-red-500',
  stain_removal: 'from-green-500 to-emerald-500',
  bedding: 'from-indigo-500 to-violet-500',
};

const defaultBanners = [
  { title: 'First Order 20% OFF', description: 'Use code FIRST20', deepLink: '/order', color: '#2563EB' },
  { title: 'Free Delivery on $50+', description: 'Limited time offer', deepLink: '/order', color: '#7C3AED' },
];

const bannerGradients = [
  'from-blue-600 via-purple-600 to-pink-600',
  'from-emerald-600 via-teal-600 to-cyan-600',
  'from-orange-500 via-red-500 to-pink-500',
  'from-indigo-600 via-violet-600 to-purple-600',
];

const serviceLabels: Record<string, string> = {
  wash_fold: 'Wash & Fold',
  dry_clean: 'Dry Clean',
  iron: 'Iron & Press',
  stain_removal: 'Stain Removal',
  bedding: 'Bedding',
};

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [banners, setBanners] = useState<any[]>(defaultBanners);
  const [offers, setOffers] = useState<any[]>([]);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [nearestOutlet, setNearestOutlet] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((i) => (i + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  // Fetch banners from API
  useEffect(() => {
    if (!token) return;
    api.getBanners(token).then((res: any) => {
      const data = res.data || [];
      if (data.length > 0) setBanners(data);
    }).catch(() => { /* banners fetch failed — use defaults */ });
  }, [token]);

  // Fetch offers/recommendations
  useEffect(() => {
    if (!token) return;
    api.getRecommendations(token).then((res: any) => {
      const data = res.data || {};
      if (data.suggestedOffers?.length > 0) setOffers(data.suggestedOffers);
    }).catch(() => { /* recommendations fetch failed — non-critical */ });
  }, [token]);

  // Fetch last order for Quick Reorder
  useEffect(() => {
    if (!token) return;
    api.getOrders(token, 1, 1).then((res: any) => {
      const orders = res.data || [];
      if (orders.length > 0) setLastOrder(orders[0]);
    }).catch(() => { toast.error('Failed to load recent orders'); });
  }, [token]);

  // Fetch nearest outlet via geolocation
  useEffect(() => {
    if (!token) return;
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          api.getNearbyOutlets(token, pos.coords.longitude, pos.coords.latitude)
            .then((res: any) => {
              const outlets = res.data || [];
              if (outlets.length > 0) setNearestOutlet(outlets[0]);
            })
            .catch(() => { /* outlet fetch failed — non-critical */ });
        },
        () => { /* geolocation denied — non-critical */ }
      );
    }
  }, [token]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="py-8 space-y-10">
      {/* Hero Banner */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={bannerIndex}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className={`relative rounded-2xl overflow-hidden bg-gradient-to-r ${bannerGradients[bannerIndex % bannerGradients.length]} p-6 md:p-8 text-white min-h-[170px] flex flex-col justify-center`}
          >
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-sm" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />

            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1"
            >
              Limited time offer
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="text-2xl md:text-3xl font-black"
            >
              {banners[bannerIndex].title}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/80 mt-1 text-sm"
            >
              {banners[bannerIndex].description}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Link
                href={banners[bannerIndex].deepLink || '/order'}
                className="mt-4 inline-flex items-center gap-1.5 bg-white text-gray-900 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-white/90 transition-colors w-fit shadow-lg"
              >
                Order Now <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setBannerIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === bannerIndex ? 'w-6 bg-brand' : 'w-1.5 bg-border'}`}
            />
          ))}
        </div>
      </div>

      {/* Greeting + Quick CTA */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-black text-text-primary">
            {greeting()}, <span className="gradient-text">{user?.name?.split(' ')[0] || 'there'}</span>
          </h2>
          <p className="text-sm text-text-secondary mt-0.5">What do you need cleaned today?</p>
        </div>
        <Link
          href="/order"
          className="hidden sm:inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-brand/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          New Order <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Services Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-text-primary">Our Services</h3>
          <Link href="/order" className="text-xs text-brand font-semibold hover:underline flex items-center gap-0.5">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {SERVICES.map((service, i) => {
            const Icon = serviceIcons[service.icon] || Package;
            const gradient = serviceColors[service.key] || 'from-gray-500 to-gray-600';
            return (
              <motion.div
                key={service.key}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={`/order?service=${service.key}`}
                  className="group relative flex flex-col items-center gap-2.5 p-5 bg-surface border border-border rounded-2xl shadow-sm hover:shadow-xl hover:border-brand/30 hover:-translate-y-1.5 transition-all overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity`} />
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" strokeWidth={1.75} />
                  </div>
                  <div className="text-center relative">
                    <span className="text-sm font-bold text-text-primary block">{service.label}</span>
                    <span className="text-[11px] text-text-tertiary">
                      from ${service.basePrice}/{service.unit === 'lbs' ? 'lb' : 'item'}
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Trust Badges */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: ShieldCheck, label: 'Insured', sublabel: 'All garments' },
            { icon: Clock, label: '24hr', sublabel: 'Turnaround' },
            { icon: Star, label: nearestOutlet?.rating ? nearestOutlet.rating.toFixed(1) : '5.0', sublabel: 'Rating' },
            { icon: Zap, label: 'Fast', sublabel: 'Same-day' },
          ].map((badge, i) => (
            <motion.div
              key={badge.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="flex items-center gap-3 p-4 bg-surface border border-border rounded-2xl hover:shadow-sm transition-shadow"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center flex-shrink-0">
                <badge.icon className="w-5 h-5 text-brand" strokeWidth={1.75} />
              </div>
              <div>
                <span className="text-base font-black text-text-primary block leading-tight">{badge.label}</span>
                <span className="text-[11px] text-text-tertiary">{badge.sublabel}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Active Offers */}
      {offers.length > 0 && (
        <section>
          <h3 className="text-base font-bold text-text-primary mb-4">Active Offers</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {offers.map((offer: any, i: number) => {
              const colors = [
                { bg: 'from-brand-light to-blue-50 dark:from-brand-light dark:to-brand-muted', border: 'border-brand/20', badge: 'bg-brand', text: 'text-brand' },
                { bg: 'from-success-light to-emerald-50 dark:from-success-light dark:to-green-900/20', border: 'border-success/20', badge: 'bg-success', text: 'text-success' },
                { bg: 'from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20', border: 'border-purple-500/20', badge: 'bg-purple-500', text: 'text-purple-600' },
              ];
              const c = colors[i % colors.length];
              const discount = offer.config?.discountType === 'percentage'
                ? `${offer.config.discountValue}% Off`
                : `$${offer.config?.discountValue} Off`;
              return (
                <div key={offer._id} className={`bg-gradient-to-br ${c.bg} border ${c.border} rounded-2xl p-5 hover:shadow-md transition-shadow`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg ${c.badge} flex items-center justify-center`}>
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <span className={`text-xs font-bold ${c.text} uppercase tracking-wide`}>{offer.title || discount}</span>
                  </div>
                  <h4 className="font-bold text-text-primary text-lg">{offer.description || discount}</h4>
                  {offer.promoCode && (
                    <p className="text-sm text-text-secondary mt-1">Code: <span className={`font-mono font-bold ${c.text}`}>{offer.promoCode}</span></p>
                  )}
                  {offer.validUntil && (
                    <p className="text-[11px] text-text-tertiary mt-3">
                      Valid through {new Date(offer.validUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick Reorder + Nearest Outlet */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Reorder */}
        {lastOrder && (
          <section className="bg-surface border border-border rounded-2xl p-5 hover:shadow-md transition-shadow">
            <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3">Quick Reorder</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-brand-light flex items-center justify-center">
                  <Shirt className="w-5 h-5 text-brand" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-text-primary">
                    {serviceLabels[lastOrder.items?.[0]?.service] || lastOrder.items?.[0]?.service?.replace(/_/g, ' ') || 'Order'}
                    {lastOrder.items?.[0]?.weight ? ` \u00b7 ${lastOrder.items[0].weight} ${lastOrder.items[0].unit || 'lbs'}` : ''}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {new Date(lastOrder.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {lastOrder.pricing?.total ? ` \u2014 $${lastOrder.pricing.total.toFixed(2)}` : ''}
                  </p>
                </div>
              </div>
              <Link
                href={`/order?reorder=${lastOrder._id}`}
                className="px-4 py-2.5 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-hover transition-colors flex items-center gap-1.5 shadow-brand flex-shrink-0"
              >
                Reorder <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>
        )}

        {/* Nearest Outlet */}
        <section className="bg-surface border border-border rounded-2xl p-5 hover:shadow-md transition-shadow">
          <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3">Nearest Outlet</p>
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-md">
              <MapPin className="w-5 h-5 text-white" strokeWidth={1.75} />
            </div>
            {nearestOutlet ? (
              <div>
                <p className="font-bold text-sm text-text-primary">{nearestOutlet.name}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-text-secondary">
                  {nearestOutlet.distance != null && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {nearestOutlet.distance.toFixed(1)} miles
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Open
                  </span>
                  {nearestOutlet.rating && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      {nearestOutlet.rating}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="font-bold text-sm text-text-primary">Finding your nearest outlet...</p>
                <p className="text-xs text-text-secondary mt-1">Allow location access to see nearby outlets</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* How It Works */}
      <section className="pb-4">
        <h3 className="text-base font-bold text-text-primary mb-4">How It Works</h3>

        {(() => {
          const steps = [
            { step: '1', title: 'Schedule', desc: 'Pick a convenient time slot for your pickup', gradient: 'from-blue-500 to-cyan-500' },
            { step: '2', title: 'We Pickup', desc: 'Our driver collects your laundry at your door', gradient: 'from-purple-500 to-pink-500' },
            { step: '3', title: 'Delivered', desc: 'Fresh, clean, and folded — right back to you', gradient: 'from-green-500 to-emerald-500' },
          ];
          const lineColors = [
            'bg-gradient-to-r from-cyan-400 to-purple-400 dark:from-cyan-600 dark:to-purple-600',
            'bg-gradient-to-r from-pink-400 to-green-400 dark:from-pink-600 dark:to-green-600',
          ];
          const lineColorsV = [
            'bg-gradient-to-b from-cyan-400 to-purple-400 dark:from-cyan-600 dark:to-purple-600',
            'bg-gradient-to-b from-pink-400 to-green-400 dark:from-pink-600 dark:to-green-600',
          ];
          return (
            <>
              {/* Desktop: horizontal with inline connectors */}
              <div className="hidden sm:flex items-start">
                {steps.map((item, i) => (
                  <Fragment key={item.step}>
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className="flex-1 text-center p-5 bg-surface border border-border rounded-2xl hover:shadow-md transition-shadow"
                    >
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mx-auto mb-3 text-white font-black text-lg shadow-lg`}>
                        {item.step}
                      </div>
                      <p className="text-sm font-bold text-text-primary">{item.title}</p>
                      <p className="text-xs text-text-tertiary mt-1 leading-relaxed">{item.desc}</p>
                    </motion.div>
                    {i < steps.length - 1 && (
                      <div className="flex-shrink-0 w-6 mt-[45px]">
                        <div className={`h-[2px] w-full rounded-full ${lineColors[i]}`} />
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>

              {/* Mobile: vertical stack with connectors */}
              <div className="sm:hidden">
                {steps.map((item, i) => (
                  <Fragment key={item.step}>
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className="flex items-center gap-4 p-4 bg-surface border border-border rounded-2xl"
                    >
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center flex-shrink-0 text-white font-black text-lg shadow-lg`}>
                        {item.step}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-text-primary">{item.title}</p>
                        <p className="text-xs text-text-tertiary mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </motion.div>
                    {i < steps.length - 1 && (
                      <div className="flex justify-center py-0.5">
                        <div className={`w-[2px] h-4 rounded-full ${lineColorsV[i]}`} />
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>
            </>
          );
        })()}
      </section>
    </div>
  );
}
