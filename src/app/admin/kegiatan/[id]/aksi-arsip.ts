"use server";

import { revalidatePath } from "next/cache";
import { klienServer, penggunaSaatIni } from "@/lib/supabase-server";

/**
 * MEMBUKA ARSIP KEGIATAN — aturan pemilik: arsip bisa dibuka kembali.
 *
 * Ketentuan yang dijaga di server:
 *  - hanya Super Admin atau pengusul kegiatan itu;
 *  - WAJIB menuliskan alasan (minimal 10 huruf);
 *  - alasannya tercatat di riwayat kegiatan.
 */
export async function bukaArsip(activityId: string, alasan: string) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const bersih = alasan.trim();
  if (bersih.length < 10) {
    return {
      galat: "Alasan wajib ditulis minimal 10 huruf, supaya jelas mengapa arsip dibuka.",
    };
  }

  const sb = await klienServer();

  // Pemeriksaan hak dilakukan di dalam fungsi basis data, supaya tidak bisa
  // diakali dari peramban.
  const { data, error } = await sb.rpc("buka_arsip_kegiatan", {
    p_activity: activityId,
    p_alasan: bersih,
  });

  if (error) return { galat: error.message };

  revalidatePath(`/admin/kegiatan/${activityId}`);
  revalidatePath("/admin/kegiatan");
  return { ok: true, status: data as string };
}
