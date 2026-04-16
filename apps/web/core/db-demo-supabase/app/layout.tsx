import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '@402systems/core-ui/styles/globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '402systems | DB Demo Supabase',
  description: 'A demo application for Supabase integration',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background min-h-screen antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
