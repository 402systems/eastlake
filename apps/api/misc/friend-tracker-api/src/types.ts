export interface Env {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
}

export interface Friend {
  id: string;
  name: string;
  last_action: string | null;
  phone_number: string | null;
  birthday: string | null;
  groups: string[];
  created_at: string;
}

export interface NewFriend {
  name: string;
  phone_number?: string | null;
  birthday?: string | null;
}
