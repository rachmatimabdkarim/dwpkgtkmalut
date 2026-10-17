/**
 * Penjaga halaman "Ubah Data Kegiatan".
 *
 * Dipisah dari halaman supaya aturannya terbaca jelas dan bisa diuji:
 *   * hanya PENGUSUL (atau super admin) yang boleh mengubah;
 *   * hanya saat status draf atau revisi.
 *
 * Sesudah kegiatan diajukan, perubahan data WAJIB lewat revisi berjenjang dan
 * disetujui ulang oleh seluruh jenjang (keputusan pemilik).
 */
type Keg = {
  id: string;
  status: string;
  dibuat_oleh: string;
} | null;

type Pengguna = { id: string; peran: string[] };

export function tidakBoleh(
  keg: Keg,
  pengguna: Pengguna,
): { judul: string; pesan: string } | null {
  if (!keg) {
    return {
      judul: "Kegiatan tidak ditemukan",
      pesan: "Kegiatan yang Anda cari tidak ada atau sudah dihapus.",
    };
  }
  const superAdmin = pengguna.peran.includes("super_admin");
  if (keg.dibuat_oleh !== pengguna.id && !superAdmin) {
    return {
      judul: "Bukan kegiatan Anda",
      pesan: "Hanya pengusul kegiatan ini yang dapat mengubah datanya.",
    };
  }
  if (!["draf", "revisi"].includes(keg.status)) {
    return {
      judul: "Data terkunci",
      pesan:
        "Kegiatan ini sudah diajukan, jadi datanya tidak dapat diubah langsung. " +
        "Perubahan harus lewat revisi berjenjang: penyetuju memilih \"Minta Revisi\", " +
        "lalu kegiatan diajukan ulang dan disetujui ulang oleh seluruh jenjang.",
    };
  }
  return null;
}

