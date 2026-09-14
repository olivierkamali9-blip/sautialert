import { createClient } from "@supabase/supabase-js";

// Client Supabase côté serveur (clé service_role, bypass RLS)
// Utilisé UNIQUEMENT dans les routes API (jamais exposé au navigateur)
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
