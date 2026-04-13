import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'LoadNBehold',
  slug: 'loadnbehold',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  scheme: 'loadnbehold',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#2563EB',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.loadnbehold.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'We need your location to find nearby outlets and track deliveries.',
      NSCameraUsageDescription:
        'Camera access is needed to upload proof of delivery photos.',
    },
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#2563EB',
    },
    package: 'com.loadnbehold.app',
    googleServicesFile: '../../google-services.json',
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'CAMERA'],
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-notifications',
    'expo-image-picker',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'We need your location to find nearby outlets and track deliveries.',
      },
    ],
    [
      '@stripe/stripe-react-native',
      {
        merchantIdentifier: 'merchant.com.loadnbehold',
        enableGooglePay: true,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
