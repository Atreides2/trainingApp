import { createClient } from '@supabase/supabase-js';

// No auth needed — plain client with anon key works for both server and client
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
