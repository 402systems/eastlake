import '@402systems/lib-core-ui/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dobble',
  description: 'Worst Game Ever',
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
