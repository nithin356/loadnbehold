import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { View, Image, PanResponder, Text, StyleSheet, Dimensions } from 'react-native';

// ─── Tile math helpers ────────────────────────────────────────
const TILE_SIZE = 256;

function lon2tile(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function lat2tile(lat: number, zoom: number): number {
  return (
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
    Math.pow(2, zoom)
  );
}

function tile2lon(x: number, zoom: number): number {
  return (x / Math.pow(2, zoom)) * 360 - 180;
}

function tile2lat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

// Convert lat/lng to pixel position at a given zoom level
function latlngToPixel(lat: number, lng: number, zoom: number): { x: number; y: number } {
  return {
    x: lon2tile(lng, zoom) * TILE_SIZE,
    y: lat2tile(lat, zoom) * TILE_SIZE,
  };
}

// ─── MapView ──────────────────────────────────────────────────
interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export const MapView = forwardRef(function OSMMapView(props: any, ref: any) {
  const { initialRegion, style, children, ...rest } = props;
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [center, setCenter] = useState({
    lat: initialRegion?.latitude ?? 42.3314,
    lng: initialRegion?.longitude ?? -83.0458,
  });
  const [zoom, setZoom] = useState(() => {
    if (!initialRegion?.latitudeDelta) return 14;
    return Math.min(18, Math.max(2, Math.round(Math.log2(360 / initialRegion.latitudeDelta))));
  });

  useImperativeHandle(ref, () => ({
    fitToCoordinates: (
      coords: { latitude: number; longitude: number }[],
      options?: { edgePadding?: { top: number; right: number; bottom: number; left: number }; animated?: boolean }
    ) => {
      if (!coords || coords.length === 0) return;
      const lats = coords.map((c) => c.latitude);
      const lngs = coords.map((c) => c.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      const cLat = (minLat + maxLat) / 2;
      const cLng = (minLng + maxLng) / 2;

      // Calculate zoom to fit all points
      const latSpan = maxLat - minLat || 0.01;
      const lngSpan = maxLng - minLng || 0.01;
      const span = Math.max(latSpan, lngSpan);
      const z = Math.min(16, Math.max(2, Math.round(Math.log2(180 / span)) - 1));

      setCenter({ lat: cLat, lng: cLng });
      setZoom(z);
    },
  }));

  const onLayout = useCallback((e: any) => {
    const { width, height } = e.nativeEvent.layout;
    setDimensions({ width, height });
  }, []);

  // Pan gesture
  const panRef = useRef({ startLat: center.lat, startLng: center.lng });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        panRef.current = { startLat: center.lat, startLng: center.lng };
      },
      onPanResponderMove: (_, gestureState) => {
        if (dimensions.width === 0) return;
        const scale = Math.pow(2, zoom);
        const dLng = (-gestureState.dx / (TILE_SIZE * scale)) * 360;
        const dLat = (gestureState.dy / (TILE_SIZE * scale)) * 170;
        setCenter({
          lat: Math.max(-85, Math.min(85, panRef.current.startLat + dLat)),
          lng: panRef.current.startLng + dLng,
        });
      },
    })
  ).current;

  // Calculate visible tiles
  const renderTiles = () => {
    if (dimensions.width === 0 || dimensions.height === 0) return null;

    const centerTileX = lon2tile(center.lng, zoom);
    const centerTileY = lat2tile(center.lat, zoom);

    const tilesX = Math.ceil(dimensions.width / TILE_SIZE) + 2;
    const tilesY = Math.ceil(dimensions.height / TILE_SIZE) + 2;

    const startTileX = Math.floor(centerTileX - tilesX / 2);
    const startTileY = Math.floor(centerTileY - tilesY / 2);

    // Pixel offset of center tile relative to view center
    const centerPixelX = (centerTileX - Math.floor(centerTileX)) * TILE_SIZE;
    const centerPixelY = (centerTileY - Math.floor(centerTileY)) * TILE_SIZE;

    const offsetX = dimensions.width / 2 - (centerTileX - startTileX) * TILE_SIZE;
    const offsetY = dimensions.height / 2 - (centerTileY - startTileY) * TILE_SIZE;

    const maxTile = Math.pow(2, zoom);
    const tiles: React.ReactNode[] = [];

    for (let dy = 0; dy < tilesY; dy++) {
      for (let dx = 0; dx < tilesX; dx++) {
        const tileX = ((startTileX + dx) % maxTile + maxTile) % maxTile;
        const tileY = startTileY + dy;
        if (tileY < 0 || tileY >= maxTile) continue;

        const left = offsetX + dx * TILE_SIZE;
        const top = offsetY + dy * TILE_SIZE;
        const uri = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;

        tiles.push(
          <Image
            key={`${zoom}-${tileX}-${tileY}`}
            source={{ uri, headers: { 'User-Agent': 'LoadNBehold/1.0' } }}
            style={{
              position: 'absolute',
              left,
              top,
              width: TILE_SIZE,
              height: TILE_SIZE,
            }}
            fadeDuration={0}
          />
        );
      }
    }
    return tiles;
  };

  // Convert lat/lng to pixel position within the map view
  const toViewXY = (lat: number, lng: number) => {
    const cx = lon2tile(center.lng, zoom) * TILE_SIZE;
    const cy = lat2tile(center.lat, zoom) * TILE_SIZE;
    const px = lon2tile(lng, zoom) * TILE_SIZE;
    const py = lat2tile(lat, zoom) * TILE_SIZE;
    return {
      x: dimensions.width / 2 + (px - cx),
      y: dimensions.height / 2 + (py - cy),
    };
  };

  return (
    <View style={[{ overflow: 'hidden', backgroundColor: '#e8e4d8' }, style]} onLayout={onLayout} {...panResponder.panHandlers}>
      {renderTiles()}

      {/* Render children (Markers, Polylines) with coordinate conversion context */}
      {dimensions.width > 0 &&
        React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return null;
          return React.cloneElement(child as React.ReactElement<any>, {
            __toViewXY: toViewXY,
            __mapDimensions: dimensions,
            __zoom: zoom,
          });
        })}

      {/* OSM attribution */}
      <View style={s.attribution}>
        <Text style={s.attributionText}>OpenStreetMap</Text>
      </View>
    </View>
  );
}) as any;

// ─── Marker ───────────────────────────────────────────────────
export function Marker(props: any) {
  const { coordinate, title, children, anchor, __toViewXY, __mapDimensions } = props;
  if (!coordinate || !__toViewXY) return null;

  const pos = __toViewXY(coordinate.latitude, coordinate.longitude);
  const anchorX = anchor?.x ?? 0.5;
  const anchorY = anchor?.y ?? 0.5;

  // Don't render if off-screen
  if (
    pos.x < -50 || pos.x > (__mapDimensions?.width ?? 500) + 50 ||
    pos.y < -50 || pos.y > (__mapDimensions?.height ?? 500) + 50
  ) {
    return null;
  }

  return (
    <View
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        transform: [{ translateX: -20 * anchorX }, { translateY: -20 * anchorY }],
      }}
      pointerEvents="none"
    >
      {children || (
        <View style={s.defaultMarker}>
          <View style={s.defaultMarkerDot} />
        </View>
      )}
    </View>
  );
}

// ─── Polyline ─────────────────────────────────────────────────
export function Polyline(props: any) {
  const { coordinates, strokeColor = '#6366F1', strokeWidth = 3, __toViewXY } = props;
  if (!coordinates || coordinates.length < 2 || !__toViewXY) return null;

  // Convert coordinates to view positions and create SVG-like path using View borders
  const points = coordinates.map((c: any) => __toViewXY(c.latitude, c.longitude));

  // Render line segments as thin rotated Views
  const segments: React.ReactNode[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 1) continue;
    // Skip very long segments (off-screen jumps)
    if (length > 2000) continue;

    const angle = Math.atan2(dy, dx);

    segments.push(
      <View
        key={i}
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: p1.x,
          top: p1.y - strokeWidth / 2,
          width: length,
          height: strokeWidth,
          backgroundColor: strokeColor,
          borderRadius: strokeWidth / 2,
          transform: [
            { rotate: `${angle}rad` },
          ],
          transformOrigin: 'left center',
          opacity: 0.8,
        }}
      />
    );
  }

  return <>{segments}</>;
}

export const PROVIDER_GOOGLE = null;

const s = StyleSheet.create({
  attribution: {
    position: 'absolute',
    bottom: 2,
    left: 4,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  attributionText: {
    fontSize: 9,
    color: '#555',
  },
  defaultMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    borderWidth: 3,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  defaultMarkerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
});
