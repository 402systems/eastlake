'use client';

import { useState } from 'react';
import { Button } from '@402systems/lib-core-ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@402systems/lib-core-ui/components/ui/dialog';
import { Input } from '@402systems/lib-core-ui/components/ui/input';
import { Label } from '@402systems/lib-core-ui/components/ui/label';
import { Loader2 } from 'lucide-react';

interface AuthButtonsProps {
  onSignIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;
  onSignUp: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;
}

export function AuthButtons({ onSignIn, onSignUp }: AuthButtonsProps) {
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    const { error: signInError } = await onSignIn(email, password);

    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
    } else {
      setSuccess('Successfully signed in!');
      setIsSubmitting(false);
      setTimeout(() => {
        setShowSignIn(false);
        setEmail('');
        setPassword('');
        setSuccess('');
      }, 1000);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    const { error: signUpError } = await onSignUp(email, password);

    if (signUpError) {
      setError(signUpError.message);
      setIsSubmitting(false);
    } else {
      setSuccess('Success! Check your email for confirmation.');
      setIsSubmitting(false);
      setTimeout(() => {
        setShowSignUp(false);
        setEmail('');
        setPassword('');
        setError('');
      }, 3000);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError('');
    setSuccess('');
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setShowSignIn(true)}>
          Sign In
        </Button>
        <Button onClick={() => setShowSignUp(true)}>Sign Up</Button>
      </div>

      {/* Sign In Dialog */}
      <Dialog
        open={showSignIn}
        onOpenChange={(open) => {
          setShowSignIn(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign In</DialogTitle>
            <DialogDescription>
              Enter your credentials to access your account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">Password</Label>
              <Input
                id="signin-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            {error && (
              <p className="text-sm font-medium text-red-500">{error}</p>
            )}
            {success && (
              <p className="text-sm font-medium text-green-500">{success}</p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sign Up Dialog */}
      <Dialog
        open={showSignUp}
        onOpenChange={(open) => {
          setShowSignUp(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Up</DialogTitle>
            <DialogDescription>
              Create a new account to get started.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            {error && (
              <p className="text-sm font-medium text-red-500">{error}</p>
            )}
            {success && (
              <p className="text-sm font-medium text-green-500">{success}</p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing up...
                </>
              ) : (
                'Sign Up'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
