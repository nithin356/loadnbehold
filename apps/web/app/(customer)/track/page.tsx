'use client';

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { MapPin, Phone, MessageCircle, Star, Check, Circle, Package, Truck, Clock, ArrowRight, Map, RefreshCw, UserSearch } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import { connectSocket, disconnectSocket, subscribeToOrder, unsubscribeFromOrder, getSocket } from '@/lib/socket';
import { ORDER_STATUS_LABELS, WS_EVENTS } from '@loadnbehold/constants';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TrackingMap = lazy(() => import('@/components/TrackingMap'));

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  driverId?: any;
  outletId?: { _id: string; name: string; address?: { location?: { coordinates?: [number, number] } } };
  pickupAddress?: { label?: string; line1?: string; location?: { coordinates?: [number, number] } };
  deliveryAddress?: { label?: string; line1?: string; location?: { coordinates?: [number, number] } };
}

interface Driver {
  name: string;
  phone: string;
  rating?: number;
  vehicle?: string;
  licensePlate?: string;
}

interface TimelineEntry {
  status: string;
  timestamp: string;
  note?: string;
}

interface TrackingData {
  orderId: string;
  orderNumber: string;
  status: string;
  timeline: TimelineEntry[];
  driverLocation?: { coordinates: [number, number]; speed?: number; heading?: number };
  driver?: Driver;
}

export default function TrackPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveOrders = useCallback(async () => {
    if (!token) return;
    try {
      const response: any = await api.getOrders(token, 1, 50);
      const orders = response.data || [];
      const active = orders.find((o: Order) => !['delivered', 'cancelled'].includes(o.status));
      if (active) {
        setActiveOrder(active);
        try {
          const trackRes: any = await api.getTracking(token, active._id);
          setTrackingData(trackRes.data);
        } catch {
          setTrackingData({
            orderId: active._id,
            orderNumber: active.orderNumber,
            status: active.status,
            timeline: [],
          });
        }
      } else {
        setActiveOrder(null);
        setTrackingData(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchActiveOrders(); }, [fetchActiveOrders]);

  // WebSocket for real-time driver location
  useEffect(() => {
    if (!activeOrder?.driverId) return;

    const driverId = typeof activeOrder.driverId === 'object' ? activeOrder.driverId._id : activeOrder.driverId;
    if (!driverId) return;

    connectSocket();
    subscribeToOrder(activeOrder._id, driverId);

    const socket = getSocket();

    const handleTracking = (data: any) => {
      if (data.driverId === driverId && data.location) {
        setTrackingData((prev) => prev ? {
          ...prev,
          driverLocation: {
            coordinates: data.location.coordinates,
            speed: data.speed,
            heading: data.heading,
          },
        } : prev);
      }
    };

    const handleStatusChange = (data: any) => {
      if (data.orderId === activeOrder._id) {
        fetchActiveOrders(); // Refresh full data on status change
      }
    };

    socket.on(WS_EVENTS.ORDER_TRACKING, handleTracking);
    socket.on(WS_EVENTS.ORDER_STATUS, handleStatusChange);

    return () => {
      socket.off(WS_EVENTS.ORDER_TRACKING, handleTracking);
      socket.off(WS_EVENTS.ORDER_STATUS, handleStatusChange);
      unsubscribeFromOrder(activeOrder._id, driverId);
    };
  }, [activeOrder?._id, activeOrder?.driverId, fetchActiveOrders]);

  // Fallback polling every 15s
  useEffect(() => {
    if (!activeOrder) return;
    const interval = setInterval(fetchActiveOrders, 15000);
    return () => clearInterval(interval);
  }, [activeOrder, fetchActiveOrders]);

  // Parse locations for map
  const driverLoc = trackingData?.driverLocation?.coordinates
    ? { lat: trackingData.driverLocation.coordinates[1], lng: trackingData.driverLocation.coordinates[0] }
    : null;

  const pickupLoc = activeOrder?.pickupAddress?.location?.coordinates
    ? { lat: activeOrder.pickupAddress.location.coordinates[1], lng: activeOrder.pickupAddress.location.coordinates[0] }
    : null;

  const deliveryLoc = activeOrder?.deliveryAddress?.location?.coordinates
    ? { lat: activeOrder.deliveryAddress.location.coordinates[1], lng: activeOrder.deliveryAddress.location.coordinates[0] }
    : null;

  const outletLoc = activeOrder?.outletId?.address?.location?.coordinates
    ? { lat: activeOrder.outletId.address.location.coordinates[1], lng: activeOrder.outletId.address.location.coordinates[0] }
    : null;

  if (loading) {
    return (
      <div className="py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="skeleton h-48 w-full rounded-2xl" />
            <div className="skeleton h-20 rounded-xl" />
            <div className="skeleton h-32 rounded-xl" />
          </div>
          <div className="skeleton h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 text-center">
        <div className="bg-surface border border-border rounded-2xl p-10 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-error-light flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-error" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-1">Error loading tracking</h3>
          <p className="text-sm text-text-secondary mb-5">{error}</p>
          <button onClick={fetchActiveOrders} className="px-5 py-2.5 bg-brand text-white font-bold rounded-xl hover:bg-brand-hover transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!activeOrder || !trackingData) {
    return (
      <div className="py-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface border border-border rounded-2xl p-10 max-w-md mx-auto"
        >
          <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-brand" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-1">No active orders</h3>
          <p className="text-sm text-text-secondary mb-5">Live tracking will appear here when you have an active order.</p>
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl shadow-xl shadow-brand/20 hover:-translate-y-0.5 transition-all"
          >
            <Package className="w-4 h-4" /> Place an Order
          </Link>
        </motion.div>
      </div>
    );
  }

  const currentStatus = trackingData.status;
  const driver = trackingData.driver;
  const timeline = trackingData.timeline || [];
  const isInTransit = currentStatus.includes('enroute') || currentStatus.includes('delivery');

  const getStatusIcon = () => {
    if (currentStatus.includes('pickup') || currentStatus.includes('delivery')) return <Truck className="w-8 h-8 text-white" />;
    if (currentStatus === 'processing') return <Package className="w-8 h-8 text-white" />;
    return <Clock className="w-8 h-8 text-white" />;
  };

  const getStatusDescription = () => {
    const labels: Record<string, string> = {
      placed: 'Your order has been placed and is being processed',
      driver_assigned: 'A driver has been assigned to your order',
      pickup_enroute: 'Driver is on the way to pick up your laundry',
      picked_up: 'Your laundry has been picked up',
      at_laundry: 'Your laundry has arrived at our facility',
      processing: 'Your laundry is being cleaned and processed',
      ready_for_delivery: 'Your laundry is ready for delivery',
      out_for_delivery: 'Driver is on the way to deliver your laundry',
    };
    return labels[currentStatus] || 'Tracking your order';
  };

  return (
    <div className="py-4 sm:py-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-text-primary">Track Order</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">{activeOrder.orderNumber}</p>
        </div>
        <button onClick={fetchActiveOrders} className="p-2 rounded-xl hover:bg-surface-secondary text-text-tertiary hover:text-text-primary transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Map — full width on mobile, right column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">

        {/* Map — shown first on mobile */}
        <div className="lg:col-span-3 lg:order-2">
          <div className="bg-surface border border-border rounded-2xl overflow-hidden relative z-0">
            <Suspense fallback={
              <div className="h-[280px] sm:h-[400px] lg:h-[520px] bg-surface-secondary flex items-center justify-center">
                <div className="text-center">
                  <Map className="w-8 h-8 text-text-tertiary mx-auto mb-2 animate-pulse" />
                  <p className="text-xs text-text-tertiary">Loading map...</p>
                </div>
              </div>
            }>
              <TrackingMap
                driverLocation={driverLoc}
                pickupLocation={pickupLoc}
                deliveryLocation={deliveryLoc}
                outletLocation={outletLoc}
                orderStatus={currentStatus}
                className="h-[280px] sm:h-[400px] lg:h-[520px]"
              />
            </Suspense>
            {/* Map legend */}
            <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4 text-[10px] text-text-tertiary flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand shadow-sm" /> Driver
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" /> Pickup
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-sm" /> Outlet
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-success shadow-sm" /> Delivery
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] text-text-tertiary">Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status + Driver + Timeline */}
        <div className="lg:col-span-2 lg:order-1 space-y-4">
          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-sm" />
            <div className="relative flex items-center gap-4">
              <div className={cn('w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm flex-shrink-0', isInTransit && 'animate-pulse')}>
                {getStatusIcon()}
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black">
                  {ORDER_STATUS_LABELS[currentStatus] || currentStatus}
                </h2>
                <p className="text-xs text-white/75 mt-0.5 leading-snug">{getStatusDescription()}</p>
              </div>
            </div>
          </motion.div>

          {/* Driver Card */}
          {driver ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-surface border border-border rounded-2xl p-4"
            >
              <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider mb-2.5">Your Driver</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {driver.name?.charAt(0) || 'D'}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-text-primary">
                      {driver.name}
                      {driver.rating && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-text-secondary font-normal ml-1.5">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />{driver.rating.toFixed(1)}
                        </span>
                      )}
                    </p>
                    {driver.vehicle && <p className="text-xs text-text-secondary">{driver.vehicle}</p>}
                    {driver.licensePlate && <p className="text-[10px] text-text-tertiary font-mono">{driver.licensePlate}</p>}
                    {driverLoc && trackingData?.driverLocation?.speed != null && (
                      <p className="text-[10px] text-text-tertiary mt-0.5">
                        {Math.round(trackingData.driverLocation.speed)} mph
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={`tel:${driver.phone}`} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-brand-light hover:border-brand/30 transition-all" title="Call driver">
                    <Phone className="w-4 h-4 text-text-secondary" />
                  </a>
                  <a href={`mailto:support@loadnbehold.com?subject=Order ${activeOrder?.orderNumber} — Driver Issue`} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-brand-light hover:border-brand/30 transition-all" title="Contact support">
                    <MessageCircle className="w-4 h-4 text-text-secondary" />
                  </a>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-surface border border-border rounded-2xl p-4"
            >
              <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider mb-2.5">Your Driver</p>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-surface-secondary flex items-center justify-center flex-shrink-0">
                  <UserSearch className="w-5 h-5 text-text-tertiary animate-pulse" />
                </div>
                <div>
                  <p className="font-bold text-sm text-text-primary">Finding a driver...</p>
                  <p className="text-xs text-text-secondary">We&apos;re assigning the best available driver to your order</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface border border-border rounded-2xl p-4 sm:p-5"
          >
            <h3 className="font-bold text-sm text-text-primary mb-3">Timeline</h3>
            {timeline.length > 0 ? (
              <div className="space-y-0">
                {timeline.map((entry, i) => {
                  const isCompleted = entry.timestamp !== '';
                  const isCurrent = entry.status === currentStatus;
                  return (
                    <div key={`${entry.status}-${i}`} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        {isCompleted ? (
                          <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        ) : isCurrent ? (
                          <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center animate-pulse shadow-brand">
                            <Circle className="w-2.5 h-2.5 text-white fill-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-border bg-surface" />
                        )}
                        {i < timeline.length - 1 && (
                          <div className={cn('w-0.5 h-6 my-0.5 rounded-full', isCompleted ? 'bg-success' : 'bg-border')} />
                        )}
                      </div>
                      <div className="pb-1 flex-1 min-w-0">
                        <p className={cn('text-xs font-semibold', isCompleted || isCurrent ? 'text-text-primary' : 'text-text-tertiary')}>
                          {ORDER_STATUS_LABELS[entry.status] || entry.status}
                        </p>
                        {entry.timestamp && (
                          <p className="text-[10px] text-text-secondary">{new Date(entry.timestamp).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-text-tertiary text-center py-3">Timeline will appear as your order progresses</p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
