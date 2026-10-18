/**
 * ATURAN PENANGGUNG JAWAB KEGIATAN
 *
 * Ditetapkan pemilik aplikasi. Tiga kasus:
 *
 *  1. Diajukan ANGGOTA biasa.
 *     Penanggung jawab TERKUNCI pada Ketua Bidang dari anggota tersebut.
 *     Anggota tidak boleh menunjuk dirinya sendiri.
 *
 *  2. Diajukan KETUA BIDANG.
 *     Otomatis dia sendiri yang menjadi penanggung jawab.
 *
 *  3. Diajukan PENGURUS HARIAN (Ketua, Wakil, Sekretaris, Bendahara, Wakil Sekretaris).
 *     Penanggung jawab hanya boleh salah satu Pengurus Harian.
 *
 * Modul ini SENGAJA tanpa ketergantungan lain supaya aturannya bisa diuji
 * terpisah, dan supaya form serta server memakai sumber yang sama — kalau
 * aturan ditulis dua kali, keduanya bisa berbeda diam-diam.
 */

export type PeranPJ = {
  /** Id akun. */
  id: string;
  nama: string;
  /** Jabatan sebagaimana tercatat, mis. "Ketua Bidang", "Anggota", "Bendahara". */
  jabatan: string;
  /** Nama bidang, mis. "Bidang Ekonomi". "Pengurus Harian" atau kosong = harian. */
  bidang?: string | null;
};

export type HasilAturanPJ = {
  /** Peran yang menjadi penanggung jawab otomatis (null = pengguna bebas memilih). */
  terkunci: PeranPJ | null;
  /** Pilihan yang boleh ditampilkan bila tidak terkunci. */
  pilihan: PeranPJ[];
  /** Penjelasan singkat untuk ditampilkan di bawah kolom. */
  bantuan: string;
};

/** Benar bila orang ini Pengurus Harian (bukan anggota bidang). */
export function apakahPengurusHarian(p: PeranPJ): boolean {
  const jabatan = (p.jabatan || "").toLowerCase();
  const bidang = (p.bidang || "").toLowerCase();
  if (bidang.includes("harian")) return true;
  // Pengurus harian tidak terikat bidang; jabatannya tidak menyebut "Anggota".
  return /ketua$|wakil ketua|sekretaris|bendahara/.test(jabatan) && !bidang.startsWith("bidang");
}

/** Benar bila orang ini Ketua Bidang. */
export function apakahKetuaBidang(p: PeranPJ): boolean {
  return /ketua bidang/i.test(p.jabatan || "") || /^ketua bidang$/i.test((p.bidang || "").trim());
}

/** Benar bila orang ini anggota biasa (punya bidang, bukan ketua bidang). */
export function apakahAnggotaBiasa(p: PeranPJ): boolean {
  const bidang = (p.bidang || "").toLowerCase();
  return bidang.startsWith("bidang") && !apakahKetuaBidang(p) && !apakahPengurusHarian(p);
}

/**
 * Menentukan penanggung jawab menurut aturan pemilik.
 *
 * @param pengusul  peran pengguna yang sedang membuat kegiatan
 * @param semua     seluruh pengurus aktif
 */
export function tentukanPenanggungJawab(
  pengusul: PeranPJ,
  semua: PeranPJ[],
): HasilAturanPJ {
  // ---- Kasus 2: Ketua Bidang -> dia sendiri ----
  if (apakahKetuaBidang(pengusul)) {
    return {
      terkunci: pengusul,
      pilihan: [pengusul],
      bantuan: "Sebagai Ketua Bidang, Anda otomatis menjadi penanggung jawab kegiatan ini.",
    };
  }

  // ---- Kasus 1: Anggota biasa -> Ketua Bidang-nya (terkunci) ----
  if (apakahAnggotaBiasa(pengusul)) {
    const bidang = (pengusul.bidang || "").trim();
    const ketua = semua.find(
      (p) =>
        apakahKetuaBidang(p) &&
        (p.bidang || "").trim().toLowerCase() === bidang.toLowerCase(),
    );
    if (ketua) {
      return {
        terkunci: ketua,
        pilihan: [ketua],
        bantuan: `Penanggung jawab otomatis Ketua ${bidang}, karena Anda anggota bidang tersebut.`,
      };
    }
    // Bidang tanpa ketua: jangan mengunci ke orang yang salah.
    return {
      terkunci: null,
      pilihan: semua.filter((p) => apakahKetuaBidang(p)),
      bantuan: "Bidang Anda belum memiliki Ketua Bidang. Pilih penanggung jawab dari Ketua Bidang yang ada.",
    };
  }

  // ---- Kasus 3: Pengurus Harian -> hanya sesama Pengurus Harian ----
  const harian = semua.filter(apakahPengurusHarian);
  return {
    terkunci: null,
    pilihan: harian,
    bantuan: "Sebagai Pengurus Harian, penanggung jawab hanya boleh salah satu Pengurus Harian.",
  };
}

/** Memeriksa apakah calon penanggung jawab sah menurut aturan. */
export function penanggungJawabSah(pengusul: PeranPJ, calon: PeranPJ | undefined, semua: PeranPJ[]): boolean {
  if (!calon) return false;
  const aturan = tentukanPenanggungJawab(pengusul, semua);
  if (aturan.terkunci) return calon.id === aturan.terkunci.id;
  return aturan.pilihan.some((p) => p.id === calon.id);
}
