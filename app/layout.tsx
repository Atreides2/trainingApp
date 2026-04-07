import type { Metadata } from 'next';
import './globals.css';
import { NavBar } from '@/components/nav-bar';

export const metadata: Metadata = {
  title: 'Training App',
  description: 'Track your Push/Pull/Legs workouts',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
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
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <main className="max-w-lg mx-auto px-4 pt-6 pb-24">
          {children}
        </main>
        <NavBar />
      </body>
    </html>
  );
}
