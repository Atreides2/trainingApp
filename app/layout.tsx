import type { Metadata, Viewport } from 'next';
import './globals.css';
import { NavBar } from '@/components/nav-bar';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Training App',
  description: 'Track your Push/Pull/Legs workouts',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Training',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 min-h-screen" suppressHydrationWarning>
        <main className="max-w-lg mx-auto px-4 pt-6 pb-24">
          {children}
        </main>
        <NavBar />
      </body>
    </html>
  );
}
