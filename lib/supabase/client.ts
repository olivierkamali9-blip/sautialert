import { createClient } from "@supabase/supabase-js";

// Client Supabase utilisable côté navigateur (clé anonyme, respecte RLS)
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
