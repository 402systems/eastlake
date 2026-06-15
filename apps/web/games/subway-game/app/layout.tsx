import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Subway Game',
  description: 'Name every stop on a random NYC subway line',
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
