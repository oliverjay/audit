import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;
let _serverClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key);
  return _client;
}

/** Server-side client using service role key — bypasses RLS */
export function getSupabaseServer(): SupabaseClient | null {
  if (_serverClient) return _serverClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _serverClient = createClient(url, key);
  return _serverClient;
}

function makeProxy(getter: () => SupabaseClient | null, label: string): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get(_target, prop) {
      const client = getter();
      if (!client) {
        throw new Error(`Supabase ${label} not configured`);
      }
      return (client as unknown as Record<string | symbol, unknown>)[prop];
    },
  });
}

export const supabase = makeProxy(getSupabase, "client");
export const supabaseServer = makeProxy(getSupabaseServer, "server");

export const supabaseEnabled = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
