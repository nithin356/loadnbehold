declare const process: { env: Record<string, string | undefined> };

export interface ClientConfig {
  apiBaseUrl: string;
  wsBaseUrl: string;
  mapboxToken: string;
  stripePublishableKey: string;
  googleMapsKey: string;
  firebaseConfig: {
    apiKey: string;
    projectId: string;
    messagingSenderId: string;
    appId: string;
  };
}

export function getClientConfig(): ClientConfig {
  return {
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1',
    wsBaseUrl: process.env.NEXT_PUBLIC_WS_BASE_URL || 'http://localhost:5000',
    mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '',
    stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_KEY || '',
    googleMapsKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    firebaseConfig: {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    },
  };
}
