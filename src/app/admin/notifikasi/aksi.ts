"use server";

import { revalidatePath } from "next/cache";
import { klienServer, penggunaSaatIni } from "@/lib/supabase-server";

export type NotifikasiBaris = {
  id: string;
  user_id: string;
  jenis: string;
  judul: string;
  pesan: string | null;
  tautan: string | null;
  activity_id: string | null;
  dibaca: boolean;
  dibuat_pada: string;
};

/**
 * Mengambil daftar notifikasi terbaru (maks 10) beserta jumlah yang belum dibaca
 * untuk pengguna yang sedang masuk.
 */
export async function ambilNotifikasi(): Promise<{
  data: NotifikasiBaris[];
  jumlahBelumDibaca: number;
}> {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { data: [], jumlahBelumDibaca: 0 };

  const sb = await klienServer();

  const { data, error } = await sb
    .from("notifications")
    .select("id, user_id, jenis, judul, pesan, tautan, activity_id, dibaca, dibuat_pada")
    .eq("user_id", pengguna.id)
    .order("dibuat_pada", { ascending: false })
    .limit(10);

  if (error || !data) {
    return { data: [], jumlahBelumDibaca: 0 };
  }

  const { count } = await sb
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", pengguna.id)
    .eq("dibaca", false);

  return {
    data: data as NotifikasiBaris[],
    jumlahBelumDibaca: count ?? data.filter((n) => !n.dibaca).length,
  };
}

/**
 * Menandai satu notifikasi sebagai telah dibaca.
 */
export async function tandaiDibaca(id: string) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const sb = await klienServer();
  const { error } = await sb
    .from("notifications")
    .update({ dibaca: true })
    .eq("id", id)
    .eq("user_id", pengguna.id);

  if (error) return { galat: error.message };

  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Menandai semua notifikasi milik pengguna saat ini sebagai telah dibaca.
 */
export async function tandaiSemuaDibaca() {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const sb = await klienServer();
  const { error } = await sb
    .from("notifications")
    .update({ dibaca: true })
    .eq("user_id", pengguna.id)
    .eq("dibaca", false);

  if (error) return { galat: error.message };

  revalidatePath("/admin");
  return { ok: true };
}
