"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Klien untuk dipakai di sisi peramban (hanya kunci publik). */
export function klienPeramban() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Pengaturan koneksi database belum lengkap.");
  }
  return createBrowserClient(url, anon);
}
