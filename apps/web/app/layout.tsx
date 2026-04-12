import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { ThemeToaster } from '@/components/ThemeToaster';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'LoadNBehold — Fresh clothes, delivered.',
  description: 'On-demand laundry pickup and delivery in Michigan. Schedule a pickup, track in real-time, and get fresh clothes delivered to your door.',
  keywords: ['laundry', 'delivery', 'pickup', 'Michigan', 'Detroit', 'wash and fold'],
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'LoadNBehold — Fresh clothes, delivered.',
    description: 'On-demand laundry pickup and delivery in Michigan.',
    siteName: 'LoadNBehold',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'LoadNBehold' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-background text-text-primary`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <ThemeToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
