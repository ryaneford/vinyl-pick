import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vinyl Pick - Random Record Picker',
  description: 'Pick a random vinyl record from your Discogs collection',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body className="min-h-screen flex flex-col items-center justify-center p-4 dark:bg-[#171717]">
        {children}
      </body>
    </html>
  );
}