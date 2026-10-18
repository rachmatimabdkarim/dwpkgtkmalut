/**
 * Penjaga halaman "Ubah Data Kegiatan".
 *
 * Dipisah dari halaman supaya aturannya terbaca jelas dan bisa diuji:
 *   * hanya PENGUSUL (atau super admin) yang boleh mengubah;
 *   * status draf/revisi -> perbaikan langsung;
 *   * status disetujui/berjalan/selesai/laporan_* -> USULAN PERUBAHAN yang
 *     masuk antrean persetujuan berjenjang;
 *   * status diajukan/dalam_review -> belum boleh diubah (sedang dinilai);
 *   * status arsip -> tertutup selamanya.
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
  // ATURAN PEMILIK: halaman ini dipakai untuk DUA hal —
  //   * memperbaiki data saat draf/revisi (langsung tersimpan), dan
  //   * MENGAJUKAN PERUBAHAN saat kegiatan sudah disetujui/berjalan.
  // Saat arsip, data tidak boleh diubah lagi sama sekali.
  if (keg.status === "arsip") {
    return {
      judul: "Kegiatan sudah diarsipkan",
      pesan:
        "Kegiatan yang sudah diarsipkan adalah catatan final dan tidak dapat diubah lagi.",
    };
  }

  if (["diajukan", "dalam_review"].includes(keg.status)) {
    return {
      judul: "Sedang dalam persetujuan",
      pesan:
        "Kegiatan ini sedang menunggu keputusan penyetuju, jadi datanya belum dapat diubah. " +
        "Tunggu keputusan, atau perbaiki bila kegiatan dikembalikan untuk revisi.",
    };
  }

  return null;
}

