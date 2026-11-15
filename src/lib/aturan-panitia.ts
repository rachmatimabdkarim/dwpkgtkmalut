/**
 * ATURAN PANITIA & TUGAS — SATU SUMBER
 *
 * Ditetapkan pemilik aplikasi. Ditulis di satu tempat supaya tampilan dan
 * server memakai aturan yang sama dan tidak bisa berbeda diam-diam.
 *
 * RINGKASAN ATURAN
 * ────────────────
 * 1. Menyusun panitia (tambah/hapus) — PENANGGUNG JAWAB atau PENGAJU kegiatan.
 *    (Aturan pemilik: pengusul kegiatan juga berhak menghapus Ketua Panitia.)
 *    Minimal wajib ada satu KETUA PANITIA.
 *
 * 2. Memberi tugas kepada KETUA PANITIA — HANYA PENANGGUNG JAWAB.
 *    (Ketua Panitia tidak menugaskan dirinya sendiri.)
 *
 * 3. Memberi tugas kepada ANGGOTA PANITIA (selain ketua) — PENANGGUNG JAWAB
 *    atau KETUA PANITIA.
 *
 * 4. Mencentang tugas selesai — PENANGGUNG JAWAB atau KETUA PANITIA.
 *    (Anggota panitia tidak mencentang tugasnya sendiri.)
 *
 * 5. Menghapus tugas — mengikuti aturan pemberi tugas (butir 2 & 3).
 *
 * 6. Pengelola presensi/dokumentasi tetap mengikuti aturan sebelumnya:
 *    ditunjuk penanggung jawab, hanya yang ditunjuk bisa mengisi.
 *
 * CATATAN PENTING: Ketua Panitia BUKAN pengurus inti. Ia hanya mendapat hak
 * terbatas pada kegiatan yang ia pimpin — bukan pada kegiatan lain.
 */

export type PeranPanitiaKode =
  | "ketua_panitia"
  | "sekretaris_panitia"
  | "bendahara_panitia"
  | "anggota_panitia";

/** Siapa yang sedang meminta, dalam konteks satu kegiatan. */
export type KonteksPengguna = {
  /** Id akun pengguna. */
  id: string;
  /** Super Admin boleh semuanya (cadangan bila pengurus berhalangan). */
  superAdmin: boolean;
  /** Id penanggung jawab kegiatan. */
  penanggungJawabId: string | null;
  /** Peran pengguna bila ia panitia pada kegiatan ini (null = bukan panitia). */
  peranPanitia: PeranPanitiaKode | null;
  /** Id akun PENGUSUL kegiatan (activities.dibuat_oleh). */
  pengusulId?: string | null;
};

/** Apakah pengguna adalah penanggung jawab kegiatan ini? */
export function apakahPenanggungJawab(k: KonteksPengguna): boolean {
  return !!k.penanggungJawabId && k.id === k.penanggungJawabId;
}

/** Apakah pengguna adalah Ketua Panitia kegiatan ini? */
export function apakahKetuaPanitia(k: KonteksPengguna): boolean {
  return k.peranPanitia === "ketua_panitia";
}

/** Apakah pengguna adalah PENGUSUL kegiatan ini? (yang membuat/mengajukan) */
export function apakahPengusul(k: KonteksPengguna): boolean {
  return !!k.pengusulId && k.id === k.pengusulId;
}

/**
 * Boleh menyusun panitia (tambah/hapus panitia)?
 * PENANGGUNG JAWAB atau PENGAJU kegiatan (dan Super Admin).
 *
 * Catatan aturan pemilik: pengusul ikut berhak supaya ia bisa memperbaiki
 * susunan panitia kegiatan yang ia ajukan — termasuk menghapus Ketua Panitia.
 */
export function bolehSusunPanitia(k: KonteksPengguna): boolean {
  return apakahPenanggungJawab(k) || apakahPengusul(k) || k.superAdmin;
}

/**
 * Boleh memberi tugas kepada orang tertentu?
 *
 * @param peranTarget peran panitia orang yang akan diberi tugas
 */
export function bolehBeriTugas(k: KonteksPengguna, peranTarget: PeranPanitiaKode): boolean {
  // Penanggung jawab & Super Admin: boleh kepada siapa saja.
  if (apakahPenanggungJawab(k) || k.superAdmin) return true;

  // Ketua Panitia: hanya kepada anggota panitia LAIN, bukan ke dirinya sendiri.
  if (apakahKetuaPanitia(k)) return peranTarget !== "ketua_panitia";

  return false;
}

/**
 * Boleh mencentang tugas selesai / menghapus tugas?
 * PENANGGUNG JAWAB atau KETUA PANITIA.
 */
export function bolehCentangTugas(k: KonteksPengguna): boolean {
  return apakahPenanggungJawab(k) || k.superAdmin || apakahKetuaPanitia(k);
}

/** Alasan penolakan yang bisa dibaca pengguna. */
export function alasanTolakSusunPanitia(): string {
  return "Hanya penanggung jawab atau pengusul kegiatan yang dapat menyusun panitia.";
}

export function alasanTolakBeriTugas(peranTarget: PeranPanitiaKode): string {
  if (peranTarget === "ketua_panitia") {
    return "Tugas untuk Ketua Panitia hanya dapat diberikan oleh penanggung jawab kegiatan.";
  }
  return "Hanya penanggung jawab kegiatan atau Ketua Panitia yang dapat memberi tugas.";
}

export function alasanTolakCentang(): string {
  return "Hanya penanggung jawab kegiatan atau Ketua Panitia yang dapat mengubah status tugas.";
}
