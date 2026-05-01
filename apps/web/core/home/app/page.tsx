'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@eastlake/core-ui/components/ui/card';
import { Badge } from '@eastlake/core-ui/components/ui/badge';
import { Gamepad2, Wrench, Target, PartyPopper } from 'lucide-react';
import { AuthHeader } from './components/AuthHeader';

interface AppTile {
  name: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  gradient: string;
  category: 'games' | 'tools';
}

const apps: AppTile[] = [
  {
    name: 'Dobble',
    description: 'Test your reflexes in this fast-paced symbol matching game',
    href: '/games-dobble',
    icon: <Target className="h-8 w-8" />,
    gradient: 'from-rose-500 to-orange-500',
    category: 'games',
  },
  {
    name: 'New Year Bingo',
    description: 'A fun party bingo game perfect for celebrations',
    href: '/misc/bingo',
    icon: <PartyPopper className="h-8 w-8" />,
    gradient: 'from-violet-500 to-purple-500',
    category: 'tools',
  },
];

function CategorySection({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: AppTile[];
}) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-secondary rounded-lg p-2">{icon}</div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((app, index) => (
          <a href={app.href} key={app.name} className="group block">
            <Card
              className="hover:shadow-primary/5 border-border/50 hover:border-primary/20 h-full overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              <div
                className={`h-2 bg-gradient-to-r ${app.gradient} opacity-80 transition-opacity group-hover:opacity-100`}
              />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div
                    className={`rounded-xl bg-gradient-to-br p-3 ${app.gradient} text-white shadow-lg`}
                  >
                    {app.icon}
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {app.category}
                  </Badge>
                </div>
                <CardTitle className="group-hover:text-primary mt-4 text-xl transition-colors">
                  {app.name}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {app.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground group-hover:text-primary flex items-center gap-2 text-sm transition-colors">
                  <span>Launch app</span>
                  <span className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </section>
  );
}

export default function Page() {
  const games = apps.filter((app) => app.category === 'games');
  const tools = apps.filter((app) => app.category === 'tools');

  return (
    <div className="min-h-screen">
      <AuthHeader />
      {/* Animated background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="bg-primary/5 absolute top-1/4 -left-20 h-72 w-72 animate-pulse rounded-full blur-3xl" />
        <div
          className="absolute -right-20 bottom-1/4 h-96 w-96 animate-pulse rounded-full bg-violet-500/5 blur-3xl"
          style={{ animationDelay: '1s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-gradient-to-br from-rose-500/5 to-orange-500/5 blur-3xl"
          style={{ animationDelay: '2s' }}
        />
      </div>

      {/* Hero Section */}
      <header className="relative px-6 pt-20 pb-16">
        <div className="mx-auto max-w-4xl space-y-6 text-center">
          <div className="bg-secondary/50 border-border/50 text-muted-foreground animate-fade-in inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            Welcome to 402systems
          </div>

          <h1 className="animate-fade-in text-5xl font-bold tracking-tight md:text-7xl">
            <span className="from-primary bg-gradient-to-r via-violet-400 to-rose-400 bg-clip-text text-transparent">
              Games & Tools
            </span>
          </h1>

          <p
            className="text-muted-foreground animate-fade-in mx-auto max-w-2xl text-xl"
            style={{ animationDelay: '200ms' }}
          >
            A curated collection of interactive experiences and useful utilities
            — built with care, designed for fun.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl space-y-16 px-6 pb-20">
        <CategorySection
          title="Games"
          icon={<Gamepad2 className="h-5 w-5" />}
          items={games}
        />

        <CategorySection
          title="Tools"
          icon={<Wrench className="h-5 w-5" />}
          items={tools}
        />
      </main>

      {/* Footer */}
      <footer className="border-border/50 border-t px-6 py-8">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm md:flex-row">
          <p>© 2026 402systems. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with <span className="text-rose-500">♥</span> and modern web
            tech
          </p>
        </div>
      </footer>
    </div>
  );
}
