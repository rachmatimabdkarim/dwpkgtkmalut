import { klienServer } from "@/lib/supabase-server";
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
    // WAJIB membaca view publik: tabel site_settings dilindungi aturan
    // pengaman sehingga untuk pengunjung publik hasilnya kosong.
    const sb = await klienServer();
    const { data, error } = await sb
      .from("public_site_settings")
      .select("nama_aplikasi, nama_unit, nama_organisasi, warna_utama, logo_path, favicon_path, alamat, telepon, email")
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      // JANGAN simpan hasil bawaan ke memori: kesalahan tidak boleh menempel
      return TEMA_BAWAAN;
    }

    const tema: TemaSitus = {
      warnaUtama: data.warna_utama || TEMA_BAWAAN.warnaUtama,
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
