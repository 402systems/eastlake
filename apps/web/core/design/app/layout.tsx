import '@402systems/lib-core-ui/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'core/design',
  description: '402systems design test',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
