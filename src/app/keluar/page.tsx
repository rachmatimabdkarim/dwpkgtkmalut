"use client";

import { useEffect } from "react";
import { klienPeramban } from "@/lib/supabase-peramban";

/** Halaman keluar: menghapus sesi lalu kembali ke halaman masuk. */
export default function HalamanKeluar() {
  useEffect(() => {
    klienPeramban()
      .auth.signOut()
      .catch(() => {})
      .finally(() => {
        window.location.replace("/masuk");
      });
  }, []);

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <p className="text-n-600">Mengeluarkan sesi…</p>
    </main>
  );
}
