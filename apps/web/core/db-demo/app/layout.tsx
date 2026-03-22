import '@402systems/lib-core-ui/globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from './ThemeProvider';
import { ThemeToggle } from '../components/ThemeToggle';

export const metadata: Metadata = {
  title: 'core/db-demo',
  description: 'Sample App',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="relative">
            <div className="absolute top-4 right-4">
              <ThemeToggle />
            </div>
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
