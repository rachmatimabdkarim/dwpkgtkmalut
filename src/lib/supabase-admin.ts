import { createClient } from "@supabase/supabase-js";

/**
 * Klien dengan kunci rahasia — HANYA untuk dipakai di server (mis. pembuatan
 * akun oleh Super Admin). Tidak pernah dikirim ke peramban.
 */
export function klienAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sr = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !sr) throw new Error("Kunci rahasia server belum diatur.");
  return createClient(url, sr, { auth: { persistSession: false, autoRefreshToken: false } });
}
