import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IPL V',
  description: 'Pick 5 players from random IPL squads across history',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white antialiased">{children}</body>
    </html>
  );
}
