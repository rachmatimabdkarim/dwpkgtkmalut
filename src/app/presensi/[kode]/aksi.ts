"use server";

import { revalidatePath } from "next/cache";
import { klienAdmin } from "@/lib/supabase-admin";

/**
 * PRESENSI LEWAT QR — aksi sisi publik (peserta tidak perlu masuk).
 *
 * Aturan yang dijaga di sini, bukan hanya di tampilan:
 *  - hanya bisa absen bila jendela presensi TERBUKA (fungsi status_presensi);
 *  - nama wajib diisi dan tidak boleh ganda pada kegiatan yang sama;
 *  - absen tercatat sebagai "Menunggu" — BELUM dihitung hadir sampai
 *    dikonfirmasi petugas secara fisik.
 */

export type HasilAbsen =
  | { ok: true; nama: string; sudahAda?: boolean }
  | { galat: string };

/** Merapikan nama untuk perbandingan: tanpa beda huruf besar & spasi ganda. */
function rapikan(teks: string): string {
  return teks.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function absenLewatQr(
  kode: string,
  nama: string,
  instansi: string,
): Promise<HasilAbsen> {
  const bersih = nama.trim();
  const asal = instansi.trim();
  if (bersih.length < 3) {
    return { galat: "Nama lengkap wajib diisi (minimal 3 huruf)." };
  }
  if (bersih.length > 100) {
    return { galat: "Nama terlalu panjang." };
  }
  // Aturan pemilik: isian presensi minimal NAMA dan INSTANSI.
  if (asal.length < 3) {
    return { galat: "Instansi/asal wajib diisi (minimal 3 huruf)." };
  }
  if (asal.length > 100) {
    return { galat: "Nama instansi terlalu panjang." };
  }

  const admin = klienAdmin();

  // 1. Cari kegiatan dari kode QR
  const { data: jendela } = await admin
    .from("presensi_jendela")
    .select("activity_id, kode_qr")
    .eq("kode_qr", kode)
    .maybeSingle<{ activity_id: string; kode_qr: string }>();

  if (!jendela) {
    return { galat: "Kode presensi tidak dikenali. Mintakan kode terbaru kepada petugas." };
  }

  // 2. Apakah presensi sedang terbuka?
  const { data: statusData } = await admin.rpc("status_presensi", {
    p_activity: jendela.activity_id,
  });
  const status = statusData as { terbuka?: boolean; sebab?: string } | null;
  if (!status?.terbuka) {
    return {
      galat: status?.sebab ?? "Presensi sedang ditutup. Hubungi petugas presensi.",
    };
  }

  // 3. Cegah nama ganda pada kegiatan yang sama.
  //    Nama dibandingkan tanpa membedakan huruf besar/kecil dan spasi berlebih.
  const { data: sudah } = await admin
    .from("attendances")
    .select("id, nama")
    .eq("activity_id", jendela.activity_id);

  const kembar = (sudah ?? []).some(
    (a: { nama: string | null }) => rapikan(String(a.nama ?? "")) === rapikan(bersih),
  );
  if (kembar) {
    return {
      ok: true,
      nama: bersih,
      sudahAda: true,
    };
  }

  // 4. Tautkan ke akun bila nama cocok dengan pengurus (opsional, tidak wajib).
  const { data: profil } = await admin
    .from("profiles")
    .select("id, nama")
    .ilike("nama", bersih)
    .eq("aktif", true)
    .maybeSingle<{ id: string; nama: string }>();

  const { error } = await admin.from("attendances").insert({
    activity_id: jendela.activity_id,
    profile_id: profil?.id ?? null,
    nama: profil?.nama ?? bersih,
    // Pengurus yang dikenali otomatis memakai instansi lembaga; tamu memakai
    // instansi yang ia tulis sendiri.
    instansi: profil ? "DWP Kantor GTK Malut" : asal,
    keterangan: "Menunggu",
    sumber: "qr",
    dicatat_via_qr: true,
  });

  if (error) {
    return { galat: "Gagal mencatat kehadiran: " + error.message };
  }

  revalidatePath(`/presensi/${kode}`);
  return { ok: true, nama: profil?.nama ?? bersih };
}
