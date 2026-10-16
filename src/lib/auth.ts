import { supabase } from "@/lib/supabase";

let cachedUserId: string | null = null;
let inFlight: Promise<string> | null = null;

/**
 * Returns the authenticated user id, memoized for the browser session.
 * Avoids issuing many concurrent `auth.getUser()` calls (which trigger
 * Supabase auth lock contention: "Lock sb-...-auth-token was released").
 */
export async function getAuthUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw new Error("You must be signed in to use the tracker.");
    }
    cachedUserId = data.user.id;
    return cachedUserId;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export function clearCachedUserId() {
  cachedUserId = null;
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    cachedUserId = null;
    return;
  }
  cachedUserId = session?.user?.id ?? null;
});
