import { createClient } from "@supabase/supabase-js";

const config = globalThis.RICCIE_SUPABASE_CONFIG;
const valid =
  config &&
  typeof config.url === "string" &&
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url) &&
  typeof config.publishableKey === "string" &&
  /^(sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.test(
    config.publishableKey,
  );

globalThis.riccieSupabase = valid
  ? createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "riccie-oriach-auth",
      },
    })
  : null;
