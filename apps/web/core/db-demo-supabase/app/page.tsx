'use client';

import { useState, useEffect } from 'react';
import { Button } from '@402systems/core-ui/components/ui/button';
import { Input } from '@402systems/core-ui/components/ui/input';
import { Label } from '@402systems/core-ui/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@402systems/core-ui/components/ui/card';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function Page() {
  // DB Demo State
  const [name, setName] = useState('');
  const [dbLoading, setDbLoading] = useState(false);

  // Auth Demo State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleDbSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setDbLoading(true);
    try {
      const { error } = await supabase.from('test').insert([
        {
          name: name.trim(),
          user: user?.id ?? null,
        },
      ]);

      if (error) {
        console.error('Supabase error:', error);
        alert(`Error: ${error.message}`);
      } else {
        const userInfo = user ? `linked to user ${user.id}` : 'anonymously';
        alert(`Successfully added "${name}" ${userInfo} to the test table!`);
        setName('');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred.');
    } finally {
      setDbLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) return;
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      alert('Check your email for the confirmation link!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error: ${message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) return;
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      alert('Logged in successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error: ${message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    alert('Signed out!');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      {/* Auth Card */}
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Supabase Auth Demo</CardTitle>
          <CardDescription>
            {user
              ? `Logged in as ${user.email}`
              : 'Sign in or create an account'}
          </CardDescription>
        </CardHeader>
        {!user ? (
          <>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-1.5 space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={authLoading}
                />
              </div>
              <div className="flex flex-col gap-1.5 space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={authLoading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSignUp}
                disabled={authLoading}
              >
                Sign Up
              </Button>
              <Button
                className="w-full"
                onClick={handleSignIn}
                disabled={authLoading}
              >
                {authLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </CardFooter>
          </>
        ) : (
          <CardFooter>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Database Card */}
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Supabase DB Demo</CardTitle>
          <CardDescription>
            Enter your name to save it to the &quot;test&quot; table.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleDbSubmit}>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1.5 space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={dbLoading}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={dbLoading}>
              {dbLoading ? 'Submitting...' : 'Submit to DB'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
