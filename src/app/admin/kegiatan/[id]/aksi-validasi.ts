"use server";

import { revalidatePath } from "next/cache";
import { klienServer, penggunaSaatIni } from "@/lib/supabase-server";

/**
 * VALIDASI LAPORAN OLEH KETUA DWP
 *
 * Aturan yang dijaga di server, bukan hanya di tampilan:
 *  - hanya KETUA (atau Super Admin sebagai cadangan) yang memvalidasi;
 *  - hanya laporan yang SUDAH DISETUJUI penuh;
 *  - kode dibuat acak dan tidak mudah ditebak (bukan nomor urut kegiatan);
 *  - validasi bisa dicabut, dan pencabutan tercatat di riwayat.
 */

/** Membuat kode acak yang aman untuk dipakai di QR. */
function buatKode(): string {
  const abjad = "abcdefghjkmnpqrstuvwxyz23456789";
  const acak = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(acak)
    .map((n) => abjad[n % abjad.length])
    .join("");
}

export async function validasiLaporan(activityId: string) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  // Hanya Ketua atau Super Admin.
  const boleh =
    pengguna.peran.includes("ketua") || pengguna.peran.includes("super_admin");
  if (!boleh) {
    return {
      galat: "Hanya Ketua Dharma Wanita Persatuan yang dapat memvalidasi laporan.",
    };
  }

  const sb = await klienServer();

  // Hanya laporan yang sudah disetujui penuh.
  const { data: keg } = await sb
    .from("activities")
    .select("status, judul")
    .eq("id", activityId)
    .maybeSingle<{ status: string; judul: string }>();

  if (!keg) return { galat: "Kegiatan tidak ditemukan." };
  if (keg.status !== "laporan_disetujui") {
    return {
      galat:
        "Laporan belum dapat divalidasi. Validasi dilakukan setelah laporan disetujui penuh.",
    };
  }

  // Sudah pernah divalidasi? Pakai kode lama supaya QR tidak berubah-ubah.
  const { data: ada } = await sb
    .from("laporan_validasi")
    .select("kode")
    .eq("activity_id", activityId)
    .maybeSingle<{ kode: string }>();

  if (ada?.kode) {
    return { ok: true, kode: ada.kode, sudahAda: true };
  }

  const kode = buatKode();
  const { error } = await sb.from("laporan_validasi").insert({
    activity_id: activityId,
    kode,
    divalidasi_oleh: pengguna.id,
  });
  if (error) return { galat: "Gagal memvalidasi laporan: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "validasi_laporan",
    keterangan: `Laporan divalidasi oleh ${pengguna.nama}. Kode keaslian: ${kode}`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true, kode };
}

/** Mencabut validasi — mis. bila laporan ternyata perlu diperbaiki. */
export async function cabutValidasi(activityId: string) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const boleh =
    pengguna.peran.includes("ketua") || pengguna.peran.includes("super_admin");
  if (!boleh) {
    return { galat: "Hanya Ketua Dharma Wanita Persatuan yang dapat mencabut validasi." };
  }

  const sb = await klienServer();
  const { error } = await sb
    .from("laporan_validasi")
    .delete()
    .eq("activity_id", activityId);
  if (error) return { galat: "Gagal mencabut validasi: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "cabut_validasi_laporan",
    keterangan: `Validasi laporan dicabut oleh ${pengguna.nama}. QR keaslian tidak berlaku lagi.`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}
