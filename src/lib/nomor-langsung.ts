/**
 * PENOMORAN LAPORAN KEGIATAN LANGSUNG
 *
 * Kegiatan lama tidak boleh menyamar jadi kegiatan tahun ini, jadi nomornya
 * memakai penanda sendiri: DWP-ARSIP-<tahun kegiatan>-NNN.
 *
 * Nomor dihitung dari nomor TERBESAR yang sudah terpakai untuk tahun itu —
 * bukan dari penghitung yang bisa tertinggal (pelajaran dari nomor_kegiatan()).
 */

type Klien = {
  from: (t: string) => {
    select: (k: string, o?: { count: "exact"; head: boolean }) => {
      like: (kolom: string, pola: string) => PromiseLike<{ data: unknown }>;
    };
  };
};

export async function nomorKegiatanLangsung(sb: unknown, tanggal: string): Promise<string> {
  const tahun = tanggal.slice(0, 4);
  const awalan = `DWP-ARSIP-${tahun}-`;

  const { data } = await (sb as Klien)
    .from("activities")
    .select("kode")
    .like("kode", `${awalan}%`);

  const baris = (data as { kode: string | null }[] | null) ?? [];
  let terbesar = 0;
  for (const b of baris) {
    const angka = Number(String(b.kode ?? "").replace(awalan, ""));
    if (Number.isFinite(angka) && angka > terbesar) terbesar = angka;
  }

  return `${awalan}${String(terbesar + 1).padStart(3, "0")}`;
}
