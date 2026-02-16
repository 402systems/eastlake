import type { User, Session } from '@supabase/supabase-js';

export type { User, Session };

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export interface AuthMethods {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

export interface UseAuthReturn extends AuthState, AuthMethods {}
