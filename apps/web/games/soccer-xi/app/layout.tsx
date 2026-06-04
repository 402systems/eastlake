import '@eastlake/lib-core-ui/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Soccer XI',
  description: 'Build the perfect historical squad',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 min-h-screen antialiased">{children}</body>
    </html>
  );
}
