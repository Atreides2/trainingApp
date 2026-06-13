import type { Metadata, Viewport } from 'next';
import { Oswald, Inter } from 'next/font/google';
import './globals.css';
import { NavBar } from '@/components/nav-bar';

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
};

export const metadata: Metadata = {
  title: 'Training App',
  description: 'Track your Push/Pull/Legs workouts',
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
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
    <html lang="en" className={`${oswald.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="bg-background text-ink min-h-screen font-sans" suppressHydrationWarning>
        <main className="max-w-lg mx-auto px-4 pt-6 pb-28">
          {children}
        </main>
        <NavBar />
      </body>
    </html>
  );
}
