import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Check .env.local and restart the Next.js dev server."
  );
}

const supabaseFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers);

  if (!headers.has("apikey")) {
    headers.set("apikey", supabaseAnonKey);
  }

  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${supabaseAnonKey}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
};

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: supabaseFetch,
    headers: {
      apikey: supabaseAnonKey,
    },
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
