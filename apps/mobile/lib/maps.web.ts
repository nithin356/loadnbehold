import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

// Dynamically load Leaflet CSS + JS on web
let leafletLoaded = false;
let leafletPromise: Promise<any> | null = null;

function loadLeaflet(): Promise<any> {
  if ((window as any).L) return Promise.resolve((window as any).L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve) => {
    // CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      leafletLoaded = true;
      resolve((window as any).L);
    };
    document.head.appendChild(script);
  });
  return leafletPromise;
}

// ─── MapView ───────────────────────────────────────────────
export const MapView = forwardRef(function WebMapView(props: any, ref: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);

  useImperativeHandle(ref, () => ({
    fitToCoordinates: (coords: { latitude: number; longitude: number }[], options?: any) => {
      if (!mapRef.current || !coords.length) return;
      const L = (window as any).L;
      const bounds = L.latLngBounds(coords.map((c: any) => [c.latitude, c.longitude]));
      const pad = options?.edgePadding || { top: 50, right: 50, bottom: 50, left: 50 };
      mapRef.current.fitBounds(bounds, {
        padding: [pad.top, pad.right],
        animate: options?.animated !== false,
        maxZoom: 16,
      });
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;
    let map: any = null;

    loadLeaflet().then((L) => {
      if (!containerRef.current || mapRef.current) return;

      const region = props.initialRegion || { latitude: 37.78, longitude: -122.43, latitudeDelta: 0.02 };
      const zoom = region.latitudeDelta ? Math.round(Math.log2(360 / region.latitudeDelta)) : 13;

      map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([region.latitude, region.longitude], Math.min(zoom, 18));

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapRef.current = map;

      // Force a resize after mount
      setTimeout(() => map.invalidateSize(), 100);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync children (Markers / Polylines) via context
  const childContext = { mapRef, markersRef, polylinesRef };

  return React.createElement('div', {
    style: {
      flex: 1,
      position: 'relative',
      ...(props.style || {}),
      // Flatten RN style array if needed
      ...(Array.isArray(props.style) ? Object.assign({}, ...props.style) : {}),
    },
  },
    React.createElement('div', {
      ref: containerRef,
      style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    }),
    React.createElement(MapContext.Provider, { value: childContext },
      props.children
    ),
  );
}) as any;

const MapContext = React.createContext<any>(null);

// ─── Marker ────────────────────────────────────────────────
export const Marker = function WebMarker(props: any) {
  const ctx = React.useContext(MapContext);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!ctx?.mapRef?.current) {
      // Map not ready yet, retry
      const timer = setInterval(() => {
        if (ctx?.mapRef?.current) {
          clearInterval(timer);
          createMarker();
        }
      }, 200);
      return () => clearInterval(timer);
    }
    createMarker();

    function createMarker() {
      const L = (window as any).L;
      if (!L || !ctx.mapRef.current) return;

      const { coordinate, title, children } = props;
      if (!coordinate) return;

      // Remove old marker
      if (markerRef.current) {
        markerRef.current.remove();
      }

      // Create custom icon from children if provided
      let icon;
      if (children) {
        // Render children to HTML for custom markers
        const colors: Record<string, string> = {
          Driver: '#3B82F6',
          Pickup: '#F59E0B',
          Delivery: '#10B981',
        };
        const color = colors[title] || '#6366F1';
        const symbols: Record<string, string> = {
          Driver: '🚗',
          Pickup: '📍',
          Delivery: '🏠',
        };
        const symbol = symbols[title] || '📍';

        icon = L.divIcon({
          className: '',
          html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:14px;">${symbol}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
      }

      const marker = L.marker([coordinate.latitude, coordinate.longitude], icon ? { icon } : {}).addTo(ctx.mapRef.current);
      if (title) marker.bindTooltip(title, { direction: 'top', offset: [0, -16] });

      markerRef.current = marker;
      ctx.markersRef.current.push(marker);
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [props.coordinate?.latitude, props.coordinate?.longitude]);

  return null;
};

// ─── Polyline ──────────────────────────────────────────────
export const Polyline = function WebPolyline(props: any) {
  const ctx = React.useContext(MapContext);
  const lineRef = useRef<any>(null);

  useEffect(() => {
    if (!ctx?.mapRef?.current) {
      const timer = setInterval(() => {
        if (ctx?.mapRef?.current) {
          clearInterval(timer);
          createPolyline();
        }
      }, 200);
      return () => clearInterval(timer);
    }
    createPolyline();

    function createPolyline() {
      const L = (window as any).L;
      if (!L || !ctx.mapRef.current) return;

      const { coordinates, strokeColor, strokeWidth, lineDashPattern } = props;
      if (!coordinates || coordinates.length < 2) return;

      if (lineRef.current) lineRef.current.remove();

      const latlngs = coordinates.map((c: any) => [c.latitude, c.longitude]);
      const line = L.polyline(latlngs, {
        color: strokeColor || '#6366F1',
        weight: strokeWidth || 3,
        opacity: 0.9,
        dashArray: lineDashPattern ? lineDashPattern.join(', ') : undefined,
      }).addTo(ctx.mapRef.current);

      lineRef.current = line;
      ctx.polylinesRef.current.push(line);
    }

    return () => {
      if (lineRef.current) {
        lineRef.current.remove();
        lineRef.current = null;
      }
    };
  }, [props.coordinates, props.strokeColor]);

  return null;
};

export const PROVIDER_GOOGLE = null;
