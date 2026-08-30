import type { Metadata, Viewport } from 'next';
import { Inter, Newsreader } from 'next/font/google';
import './globals.css';
import { PwaRegister } from '@/components/pwa/PwaRegister';
import { PwaInstallBanner } from '@/components/pwa/PwaInstallBanner';
import { ToastContainer } from '@/components/ui/ToastContainer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-newsreader',
  display: 'swap',
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'Zlelin — Cozy Collaborative Spatial Workspace',
  description: 'A peaceful digital sanctuary combining real-time jigsaw puzzles, spatial voice, synchronized music, and seamless collaboration over a cozy wooden cafe table.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Zlelin',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#FAF8F5',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body className="min-h-screen flex flex-col antialiased selection:bg-sage-100 selection:text-sage-600">
        <PwaRegister />
        {children}
        <PwaInstallBanner />
        <ToastContainer />
      </body>
    </html>
  );
}
