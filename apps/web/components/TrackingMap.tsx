'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LatLng {
  lat: number;
  lng: number;
}

interface TrackingMapProps {
  driverLocation?: LatLng | null;
  pickupLocation?: LatLng | null;
  deliveryLocation?: LatLng | null;
  outletLocation?: LatLng | null;
  orderStatus?: string;
  className?: string;
}

// ─── Custom Markers ─────────────────────────────────────────
function createIcon(html: string, size: [number, number], anchor: [number, number]) {
  return L.divIcon({ className: '', html, iconSize: size, iconAnchor: anchor });
}

const DRIVER_ICON = createIcon(
  `<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#7c3aed);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(37,99,235,0.45);border:3px solid white;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
  </div>`,
  [40, 40], [20, 20]
);

const PICKUP_ICON = createIcon(
  `<div style="width:32px;height:32px;border-radius:50%;background:#f59e0b;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(245,158,11,0.4);border:2.5px solid white;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`,
  [32, 32], [16, 32]
);

const DELIVERY_ICON = createIcon(
  `<div style="width:32px;height:32px;border-radius:50%;background:#16a34a;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(22,163,74,0.4);border:2.5px solid white;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
  </div>`,
  [32, 32], [16, 32]
);

const OUTLET_ICON = createIcon(
  `<div style="width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg,#ec4899,#f43f5e);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(244,63,94,0.4);border:2.5px solid white;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
  </div>`,
  [36, 36], [18, 36]
);

// ─── OSRM free routing ─────────────────────────────────────
async function fetchRoute(from: LatLng, to: LatLng): Promise<L.LatLngExpression[]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return [[from.lat, from.lng], [to.lat, to.lng]];
    const data = await res.json();
    const coords = data.routes?.[0]?.geometry?.coordinates;
    if (!coords?.length) return [[from.lat, from.lng], [to.lat, to.lng]];
    // GeoJSON is [lng, lat], Leaflet needs [lat, lng]
    return coords.map((c: [number, number]) => [c[1], c[0]] as L.LatLngExpression);
  } catch {
    // Fallback: straight line
    return [[from.lat, from.lng], [to.lat, to.lng]];
  }
}

// Route line styles
const ACTIVE_ROUTE_STYLE: L.PolylineOptions = {
  color: '#6366f1',
  weight: 4,
  opacity: 0.9,
  dashArray: '12, 8',
  lineCap: 'round',
};

const DIM_ROUTE_STYLE: L.PolylineOptions = {
  color: '#6366f1',
  weight: 3,
  opacity: 0.25,
  dashArray: '6, 10',
  lineCap: 'round',
};

// Distance between two points in meters (Haversine)
function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export default function TrackingMap({ driverLocation, pickupLocation, deliveryLocation, outletLocation, orderStatus, className }: TrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const deliveryMarkerRef = useRef<L.Marker | null>(null);
  const outletMarkerRef = useRef<L.Marker | null>(null);
  const routeLinesRef = useRef<L.Polyline[]>([]);
  const hasFittedRef = useRef(false);
  const routeCacheRef = useRef<Map<string, L.LatLngExpression[]>>(new Map());
  const lastRouteDriverLocRef = useRef<LatLng | null>(null);
  const lastRouteStatusRef = useRef<string>('');
  const [mapReady, setMapReady] = useState(false);

  const recenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const points: L.LatLngExpression[] = [];
    if (driverLocation) points.push([driverLocation.lat, driverLocation.lng]);
    if (pickupLocation) points.push([pickupLocation.lat, pickupLocation.lng]);
    if (deliveryLocation) points.push([deliveryLocation.lat, deliveryLocation.lng]);
    if (outletLocation) points.push([outletLocation.lat, outletLocation.lng]);
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 15, animate: true });
    } else if (points.length === 1) {
      map.setView(points[0], 15, { animate: true });
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([42.3314, -83.0458], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    if (outletLocation) {
      if (!outletMarkerRef.current) {
        outletMarkerRef.current = L.marker([outletLocation.lat, outletLocation.lng], { icon: OUTLET_ICON }).addTo(map);
        outletMarkerRef.current.bindTooltip('LoadNBehold Outlet', { direction: 'top', offset: [0, -18] });
      } else {
        outletMarkerRef.current.setLatLng([outletLocation.lat, outletLocation.lng]);
      }
    }

    if (pickupLocation) {
      if (!pickupMarkerRef.current) {
        pickupMarkerRef.current = L.marker([pickupLocation.lat, pickupLocation.lng], { icon: PICKUP_ICON }).addTo(map);
        pickupMarkerRef.current.bindTooltip('Pickup', { direction: 'top', offset: [0, -16] });
      } else {
        pickupMarkerRef.current.setLatLng([pickupLocation.lat, pickupLocation.lng]);
      }
    }

    if (deliveryLocation) {
      if (!deliveryMarkerRef.current) {
        deliveryMarkerRef.current = L.marker([deliveryLocation.lat, deliveryLocation.lng], { icon: DELIVERY_ICON }).addTo(map);
        deliveryMarkerRef.current.bindTooltip('Delivery', { direction: 'top', offset: [0, -16] });
      } else {
        deliveryMarkerRef.current.setLatLng([deliveryLocation.lat, deliveryLocation.lng]);
      }
    }

    if (driverLocation) {
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], { icon: DRIVER_ICON, zIndexOffset: 1000 }).addTo(map);
        driverMarkerRef.current.bindTooltip('Driver', { direction: 'top', offset: [0, -22] });
      } else {
        driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
      }
    }

    // Fit bounds
    const points: L.LatLngExpression[] = [];
    if (driverLocation) points.push([driverLocation.lat, driverLocation.lng]);
    if (pickupLocation) points.push([pickupLocation.lat, pickupLocation.lng]);
    if (deliveryLocation) points.push([deliveryLocation.lat, deliveryLocation.lng]);
    if (outletLocation) points.push([outletLocation.lat, outletLocation.lng]);

    if (points.length > 0 && !hasFittedRef.current) {
      if (points.length >= 2) {
        map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 15 });
      } else {
        map.setView(points[0], 15);
      }
      hasFittedRef.current = true;
    }
  }, [mapReady, driverLocation, pickupLocation, deliveryLocation, outletLocation]);

  // Route lines — throttled: only re-fetch when driver moves >100m or status changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const status = orderStatus || '';
    const statusChanged = status !== lastRouteStatusRef.current;
    const driverMoved = driverLocation && lastRouteDriverLocRef.current
      ? distanceMeters(driverLocation, lastRouteDriverLocRef.current) > 100
      : !!driverLocation;
    const isFirstDraw = routeLinesRef.current.length === 0;

    if (!isFirstDraw && !statusChanged && !driverMoved) return;

    lastRouteStatusRef.current = status;
    if (driverLocation) lastRouteDriverLocRef.current = { ...driverLocation };

    // Clear previous routes
    routeLinesRef.current.forEach((line) => line.remove());
    routeLinesRef.current = [];

    // Determine route segments based on order status
    // Laundry flow: Home(pickup) → Outlet → Outlet(processing) → Home(delivery)
    // pickup_enroute: Driver → Pickup
    // picked_up: Driver → Outlet (carrying laundry to shop)
    // at_laundry / processing / ready_for_delivery: Pickup → Outlet (dim, parked)
    // out_for_delivery: Driver → Delivery

    interface RouteSegment {
      from: LatLng;
      to: LatLng;
      active: boolean;
      key: string;
    }

    const segments: RouteSegment[] = [];

    // Background route: full journey path (Home → Outlet → Home)
    if (pickupLocation && outletLocation) {
      segments.push({
        from: pickupLocation,
        to: outletLocation,
        active: false,
        key: `pickup-outlet-${pickupLocation.lat}-${outletLocation.lat}`,
      });

      // If we have delivery location different from pickup, show outlet → delivery
      if (deliveryLocation) {
        segments.push({
          from: outletLocation,
          to: deliveryLocation,
          active: false,
          key: `outlet-delivery-${outletLocation.lat}-${deliveryLocation.lat}`,
        });
      }
    }

    // Active route: driver's current segment (bright, dashed, animated)
    if (driverLocation) {
      if (['pickup_enroute', 'driver_assigned'].includes(status) && pickupLocation) {
        segments.push({
          from: driverLocation,
          to: pickupLocation,
          active: true,
          key: `driver-pickup-${driverLocation.lat}-${pickupLocation.lat}`,
        });
      } else if (['picked_up'].includes(status) && outletLocation) {
        segments.push({
          from: driverLocation,
          to: outletLocation,
          active: true,
          key: `driver-outlet-${driverLocation.lat}-${outletLocation.lat}`,
        });
      } else if (['out_for_delivery'].includes(status) && deliveryLocation) {
        segments.push({
          from: driverLocation,
          to: deliveryLocation,
          active: true,
          key: `driver-delivery-${driverLocation.lat}-${deliveryLocation.lat}`,
        });
      }
    }

    // Fetch and draw all routes
    const drawRoutes = async () => {
      for (const seg of segments) {
        const cache = routeCacheRef.current;
        let routeCoords = cache.get(seg.key);

        if (!routeCoords) {
          routeCoords = await fetchRoute(seg.from, seg.to);
          cache.set(seg.key, routeCoords);
        }

        const style = seg.active ? ACTIVE_ROUTE_STYLE : DIM_ROUTE_STYLE;
        const line = L.polyline(routeCoords, style).addTo(map);
        routeLinesRef.current.push(line);
      }
    };

    drawRoutes();
  }, [mapReady, driverLocation, pickupLocation, deliveryLocation, outletLocation, orderStatus]);

  return (
    <div className={`relative ${className || ''}`} style={{ minHeight: '300px' }}>
      <div ref={mapRef} className="absolute inset-0" />
      <button
        onClick={recenter}
        title="Recenter map"
        className="absolute top-3 right-3 z-[1000] w-9 h-9 rounded-lg bg-[#1a1a2e]/90 hover:bg-[#1a1a2e] border border-white/10 flex items-center justify-center transition-colors cursor-pointer shadow-lg backdrop-blur-sm"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4" />
          <path d="M12 18v4" />
          <path d="M2 12h4" />
          <path d="M18 12h4" />
        </svg>
      </button>
    </div>
  );
}
