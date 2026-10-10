import { createClient } from "@supabase/supabase-js";
import { unstable_cache, updateTag } from "next/cache";
import { TEMA_BAWAAN, type TemaSitus } from "@/lib/tema";
import { urlPublik } from "@/lib/publik";

// Cache memori sederhana agar server tidak membaca ulang database setiap saat
const PENANDA_TEMA = "tema";
let cacheTema: TemaSitus | null = null;

/**
 * Mengosongkan singgahan tema.
 * Dua lapis harus dibersihkan: memori proses ini DAN singgahan `unstable_cache`
 * (yang menyimpan hasil 60 detik). Kalau hanya memori yang dibersihkan,
 * perubahan pengaturan tidak langsung terlihat di halaman publik.
 */
export function bersihkanCacheTema() {
  cacheTema = null;
  updateTag(PENANDA_TEMA);
}

/**
 * Membaca pengaturan tema dari tabel site_settings lewat klienServer.
 * Bila kosong atau terjadi galat, selalu mengembalikan TEMA_BAWAAN.
 */
export async function ambilTema(): Promise<TemaSitus> {
  if (cacheTema) {
    return cacheTema;
  }

  try {
    // PENTING (kecepatan): memakai klien TANPA data login.
    // Klien berbasis sesi menyentuh "cookies" sehingga Next.js menganggap
    // SELURUH situs harus dibuat ulang setiap kali dibuka (singgahan mati).
    // Padahal tema sama untuk semua pengunjung, jadi cukup dibaca sekali
    // lalu disinggahkan sebentar.
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await sb
      .from("public_site_settings")
      .select("nama_aplikasi, nama_unit, nama_organisasi, warna_utama, warna_dasar, warna_aksen, warna_tombol, warna_halaman, warna_teks, logo_path, favicon_path, alamat, telepon, email, hero_judul, hero_takbir, hero_ringkasan, hero_tombol1, hero_tombol2, visi, misi, bidang_1_nama, bidang_1_isi, bidang_2_nama, bidang_2_isi, bidang_3_nama, bidang_3_isi")
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      // JANGAN simpan hasil bawaan ke memori: kesalahan tidak boleh menempel
      return TEMA_BAWAAN;
    }

    const tema: TemaSitus = {
      warnaUtama: data.warna_utama || TEMA_BAWAAN.warnaUtama,
      warnaDasar: data.warna_dasar || TEMA_BAWAAN.warnaDasar,
      warnaAksen: data.warna_aksen || TEMA_BAWAAN.warnaAksen,
      warnaTombol: data.warna_tombol || TEMA_BAWAAN.warnaTombol,
      warnaHalaman: data.warna_halaman || TEMA_BAWAAN.warnaHalaman,
      warnaTeks: data.warna_teks || TEMA_BAWAAN.warnaTeks,
      heroJudul: data.hero_judul || TEMA_BAWAAN.heroJudul,
      heroTakbir: data.hero_takbir || TEMA_BAWAAN.heroTakbir,
      heroRingkasan: data.hero_ringkasan || TEMA_BAWAAN.heroRingkasan,
      heroTombol1: data.hero_tombol1 || TEMA_BAWAAN.heroTombol1,
      heroTombol2: data.hero_tombol2 || TEMA_BAWAAN.heroTombol2,
      visi: data.visi || TEMA_BAWAAN.visi,
      misi: data.misi || TEMA_BAWAAN.misi,
      bidang1Nama: data.bidang_1_nama || TEMA_BAWAAN.bidang1Nama,
      bidang1Isi: data.bidang_1_isi || TEMA_BAWAAN.bidang1Isi,
      bidang2Nama: data.bidang_2_nama || TEMA_BAWAAN.bidang2Nama,
      bidang2Isi: data.bidang_2_isi || TEMA_BAWAAN.bidang2Isi,
      bidang3Nama: data.bidang_3_nama || TEMA_BAWAAN.bidang3Nama,
      bidang3Isi: data.bidang_3_isi || TEMA_BAWAAN.bidang3Isi,
      logoUrl: data.logo_path ? urlPublik(data.logo_path) : TEMA_BAWAAN.logoUrl,
      faviconUrl: data.favicon_path ? urlPublik(data.favicon_path) : TEMA_BAWAAN.faviconUrl,
      namaAplikasi: data.nama_aplikasi || TEMA_BAWAAN.namaAplikasi,
      namaUnit: data.nama_unit || TEMA_BAWAAN.namaUnit,
      namaOrganisasi: data.nama_organisasi || TEMA_BAWAAN.namaOrganisasi,
      logoPath: data.logo_path ?? null,
      faviconPath: data.favicon_path ?? null,
      alamat: data.alamat ?? TEMA_BAWAAN.alamat,
      telepon: data.telepon ?? TEMA_BAWAAN.telepon,
      email: data.email ?? TEMA_BAWAAN.email,
    };

    cacheTema = tema;
    return tema;
  } catch {
    return TEMA_BAWAAN;
  }
}

/**
 * Versi ber-singgahan: hasil disimpan 60 detik.
 * Perubahan dari panel admin tetap langsung terlihat karena aksi admin
 * memanggil revalidatePath("/", "layout").
 */
export function ambilTemaCepat(): Promise<TemaSitus> {
  return unstable_cache(() => ambilTema(), ["tema-situs-beranda"], {
    revalidate: 60,
    tags: [PENANDA_TEMA, "publik"],
  })();
}
