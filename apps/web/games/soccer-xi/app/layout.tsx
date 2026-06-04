import '@eastlake/lib-core-ui/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Soccer XI',
  description: 'Build the perfect historical squad',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 antialiased">{children}</body>
    </html>
  );
}
