import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { TEMA_BAWAAN, type TemaSitus } from "@/lib/tema";
import { urlPublik } from "@/lib/publik";

// Cache memori sederhana agar server tidak membaca ulang database setiap saat
let cacheTema: TemaSitus | null = null;

/** Mengosongkan penanda cache tema, dipanggil saat pengaturan disimpan */
export function bersihkanCacheTema() {
  cacheTema = null;
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
      .select("nama_aplikasi, nama_unit, nama_organisasi, warna_utama, warna_dasar, warna_aksen, warna_tombol, warna_halaman, warna_teks, logo_path, favicon_path, alamat, telepon, email")
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
    tags: ["tema", "publik"],
  })();
}
