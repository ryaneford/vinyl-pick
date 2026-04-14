import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vinyl Pick - Random Record Picker',
  description: 'Pick a random vinyl record from your Discogs collection',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#171717',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body className="min-h-screen flex flex-col items-center justify-center p-2 dark:bg-[#171717]">
        {children}
      </body>
    </html>
  );
}