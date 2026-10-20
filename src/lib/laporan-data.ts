import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * PENARIK DATA LAPORAN — SATU SUMBER
 *
 * Semua bagian laporan yang TIDAK diketik (identitas, kepanitiaan, presensi,
 * anggaran, dokumentasi) diambil dari sini. Dipakai bersama oleh halaman
 * pratinjau dan berkas cetak PDF, supaya keduanya tidak pernah berbeda.
 *
 * Aturan yang dijaga:
 *  - Presensi hanya menghitung yang SUDAH DIKONFIRMASI (bukan "Menunggu").
 *  - Anggaran memakai RAB yang ada; realisasi diambil per baris.
 *  - Dokumentasi hanya foto resmi yang ditayangkan.
 *  - Penandatangan = Ketua DWP, otomatis dari data pengurus.
 */

export type BarisAnggaran = {
  id: string;
  uraian: string;
  satuan: string | null;
  jumlah: number;
  hargaSatuan: number;
  rencana: number;
  realisasi: number;
};

export type BarisPanitia = {
  nama: string;
  jabatan: string;
  tugas: { judul: string; selesai: boolean }[];
};

export type BarisPresensi = {
  nama: string;
  instansi: string | null;
  keterangan: string;
};

export type FotoLaporan = {
  path: string;
  keterangan: string | null;
};

export type DataLaporan = {
  kegiatan: {
    judul: string;
    nomor: string | null;
    bidang: string | null;
    tempat: string | null;
    tanggalMulai: string | null;
    tanggalSelesai: string | null;
    penanggungJawab: string;
    uraian: string | null;
    tujuan: string | null;
  };
  panitia: BarisPanitia[];
  presensi: {
    hadir: number;
    izin: number;
    sakit: number;
    daftar: BarisPresensi[];
  };
  anggaran: {
    baris: BarisAnggaran[];
    totalRencana: number;
    totalRealisasi: number;
    biayaLainKeterangan: string | null;
    biayaLainJumlah: number;
    totalKeseluruhan: number;
  };
  dokumentasi: FotoLaporan[];
  penandatangan: { nama: string; jabatan: string };
  isian: {
    ringkasan: string;
    hasil: string;
    kendala: string;
    rekomendasi: string;
    catatanPenutup: string;
  };
};

const LABEL_PANITIA: Record<string, string> = {
  ketua_panitia: "Ketua Panitia",
  sekretaris_panitia: "Sekretaris Panitia",
  bendahara_panitia: "Bendahara Panitia",
  anggota_panitia: "Anggota Panitia",
};

/** Menarik SELURUH data laporan untuk satu kegiatan. */
export async function tarikDataLaporan(
  sb: SupabaseClient,
  activityId: string,
): Promise<DataLaporan> {
  // ---- 1. Kegiatan + penanggung jawab ----
  const { data: keg } = await sb
    .from("activities")
    .select(
      "judul, nomor, bidang, tempat, tanggal_mulai, tanggal_selesai, uraian, tujuan, penanggung_jawab",
    )
    .eq("id", activityId)
    .maybeSingle<{
      judul: string;
      nomor: string | null;
      bidang: string | null;
      tempat: string | null;
      tanggal_mulai: string | null;
      tanggal_selesai: string | null;
      uraian: string | null;
      tujuan: string | null;
      penanggung_jawab: string | null;
    }>();

  // ---- 2. Panitia + tugas ----
  const { data: panitiaData } = await sb
    .from("committees")
    .select(
      "peran, profile_id, nama_luar, profiles(nama), tasks(judul, selesai)",
    )
    .eq("activity_id", activityId)
    .order("dibuat_pada", { ascending: true });

  const panitia: BarisPanitia[] = (panitiaData ?? []).map(
    (p: {
      peran: string;
      nama_luar: string | null;
      profiles?: { nama?: string }[] | null;
      tasks?: { judul: string; selesai: boolean }[];
    }) => ({
      // Relasi Supabase mengembalikan larik; ambil yang pertama.
      nama: p.profiles?.[0]?.nama ?? p.nama_luar ?? "Panitia",
      jabatan: LABEL_PANITIA[p.peran] ?? p.peran,
      tugas: p.tasks ?? [],
    }),
  );

  // ---- 3. Presensi (hanya yang sudah dikonfirmasi) ----
  const { data: hadirData } = await sb
    .from("attendances")
    .select("nama, instansi, keterangan")
    .eq("activity_id", activityId)
    .order("dibuat_pada", { ascending: true });

  const semua = (hadirData ?? []) as BarisPresensi[];
  const sah = semua.filter((a) => a.keterangan !== "Menunggu");

  // ---- 4. Anggaran ----
  const { data: rab } = await sb
    .from("budget_items")
    .select("id, uraian, satuan, jumlah, harga_satuan, realisasi, urutan")
    .eq("activity_id", activityId)
    .order("urutan", { ascending: true });

  const barisAnggaran: BarisAnggaran[] = (rab ?? []).map(
    (b: {
      id: string;
      uraian: string;
      satuan: string | null;
      jumlah: number;
      harga_satuan: number;
      realisasi: number | null;
    }) => ({
      id: b.id,
      uraian: b.uraian,
      satuan: b.satuan,
      jumlah: b.jumlah,
      hargaSatuan: b.harga_satuan,
      rencana: b.jumlah * b.harga_satuan,
      realisasi: b.realisasi ?? 0,
    }),
  );

  // ---- 5. Laporan yang sudah tersimpan ----
  const { data: lap } = await sb
    .from("activity_reports")
    .select(
      "ringkasan, hasil, kendala, rekomendasi, catatan_penutup, biaya_lain_keterangan, biaya_lain_jumlah",
    )
    .eq("activity_id", activityId)
    .maybeSingle<{
      ringkasan: string | null;
      hasil: string | null;
      kendala: string | null;
      rekomendasi: string | null;
      catatan_penutup: string | null;
      biaya_lain_keterangan: string | null;
      biaya_lain_jumlah: number | null;
    }>();

  // ---- 6. Dokumentasi (foto resmi yang ditayangkan) ----
  const { data: foto } = await sb
    .from("attachments")
    .select("bucket, path, keterangan")
    .eq("entitas_id", activityId)
    .eq("kategori", "foto_kegiatan")
    .eq("status", "resmi")
    .order("diunggah_pada", { ascending: true });

  // ---- 7. Penandatangan: Ketua DWP ----
  const penandatangan = await ambilKetuaDwp(sb);

  const totalRencana = barisAnggaran.reduce((n, b) => n + b.rencana, 0);
  const totalRealisasi = barisAnggaran.reduce((n, b) => n + b.realisasi, 0);
  const biayaLainJumlah = lap?.biaya_lain_jumlah ?? 0;

  return {
    kegiatan: {
      judul: keg?.judul ?? "Kegiatan",
      nomor: keg?.nomor ?? null,
      bidang: keg?.bidang ?? null,
      tempat: keg?.tempat ?? null,
      tanggalMulai: keg?.tanggal_mulai ?? null,
      tanggalSelesai: keg?.tanggal_selesai ?? null,
      penanggungJawab: await namaProfil(sb, keg?.penanggung_jawab ?? null),
      uraian: keg?.uraian ?? null,
      tujuan: keg?.tujuan ?? null,
    },
    panitia,
    presensi: {
      hadir: sah.filter((a) => (a.keterangan || "Hadir") === "Hadir").length,
      izin: sah.filter((a) => a.keterangan === "Izin").length,
      sakit: sah.filter((a) => a.keterangan === "Sakit").length,
      daftar: sah,
    },
    anggaran: {
      baris: barisAnggaran,
      totalRencana,
      totalRealisasi,
      biayaLainKeterangan: lap?.biaya_lain_keterangan ?? null,
      biayaLainJumlah,
      totalKeseluruhan: totalRealisasi + biayaLainJumlah,
    },
    // Alamat foto WAJIB lengkap (dari penyimpanan), bukan nama berkas saja —
    // tanpa ini gambar tidak tampil di lembar laporan.
    dokumentasi: (foto ?? []).map(
      (f: { bucket: string; path: string; keterangan: string | null }) => ({
        path: sb.storage.from(f.bucket).getPublicUrl(f.path).data.publicUrl,
        keterangan: f.keterangan,
      }),
    ),
    penandatangan,
    isian: {
      ringkasan: lap?.ringkasan ?? "",
      hasil: lap?.hasil ?? "",
      kendala: lap?.kendala ?? "",
      rekomendasi: lap?.rekomendasi ?? "",
      catatanPenutup: lap?.catatan_penutup ?? "",
    },
  };
}

/** Nama Ketua DWP — otomatis dari daftar pengurus (keputusan pemilik). */
async function ambilKetuaDwp(sb: SupabaseClient) {
  const { data } = await sb
    .from("user_roles")
    .select("peran, profiles(nama)")
    .eq("peran", "ketua")
    .limit(1)
    .maybeSingle<{ profiles?: { nama?: string } | null }>();

  return {
    nama: data?.profiles?.nama ?? "………………………………",
    jabatan: "Ketua Dharma Wanita Persatuan",
  };
}

/** Nama orang berdasarkan id akun. */
async function namaProfil(sb: SupabaseClient, id: string | null) {
  if (!id) return "—";
  const { data } = await sb.from("profiles").select("nama").eq("id", id).maybeSingle();
  return data?.nama ?? "—";
}
