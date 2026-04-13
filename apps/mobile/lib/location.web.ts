export const Accuracy = { Balanced: 3, High: 4, Highest: 5, Low: 2, Lowest: 1, BestForNavigation: 6 } as const;

export async function requestForegroundPermissionsAsync(): Promise<{ status: string }> {
  if (!navigator.geolocation) return { status: 'denied' };
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve({ status: 'granted' }),
      () => resolve({ status: 'denied' }),
      { timeout: 5000 },
    );
  });
}

export async function getCurrentPositionAsync(_opts?: any): Promise<{ coords: { latitude: number; longitude: number; accuracy: number | null } }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not available'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy } }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  });
}

export async function getLastKnownPositionAsync(): Promise<{ coords: { latitude: number; longitude: number; accuracy: number | null } } | null> {
  return getCurrentPositionAsync().catch(() => null);
}

export async function reverseGeocodeAsync(_coords: { latitude: number; longitude: number }): Promise<any[]> {
  return [];
}

export async function watchPositionAsync(_opts: any, callback: (loc: any) => void): Promise<{ remove: () => void }> {
  if (!navigator.geolocation) return { remove: () => {} };
  const id = navigator.geolocation.watchPosition(
    (pos) => callback({ coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy } }),
    () => {},
    { enableHighAccuracy: false },
  );
  return { remove: () => navigator.geolocation.clearWatch(id) };
}
