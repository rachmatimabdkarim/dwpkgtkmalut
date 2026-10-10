import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { TEMA_BAWAAN, type TemaSitus } from "@/lib/tema";

/** Berapa lama hasil disimpan sebelum diambil ulang dari database (detik). */
const SEGAR = 60;

/**
 * Klien khusus web publik: TIDAK memakai sesi pengunjung.
 * Aman karena hanya membaca VIEW publik (public_agenda, public_news,
 * public_gallery, public_site_settings) yang memang boleh dibaca siapa saja.
 * Ini juga membuat penyimpanan memori boleh dipakai (aturan Next.js melarang
 * membaca sesi di dalamnya).
 */
function klienPublik() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export type AgendaPublik = {
  id: string;
  judul: string;
  ringkasan: string | null;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  tempat: string | null;
  status: string;
  slug: string | null;
};

export type BeritaPublik = {
  id: string;
  judul: string;
  slug: string;
  ringkasan: string | null;
  isi: string | null;
  gambar_path: string | null;
  terbit_pada: string | null;
  activity_id: string | null;
};

export type GaleriPublik = {
  id: string;
  activity_id: string;
  path: string;
  keterangan: string | null;
  urutan: number;
};

export type GaleriKelompok = {
  activity_id: string;
  items: GaleriPublik[];
};

export type PengurusPublik = {
  nama: string;
  bidang: string;
  jabatan: string;
  email: string | null;
  urutan: number;
};


/** Mengubah path berkas di storage Supabase menjadi URL publik yang dapat dibuka */
export function urlPublik(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/")) {
    return path;
  }
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return path;
  return `${baseUrl}/storage/v1/object/public/publik/${path}`;
}

/** Mengambil agenda terdekat (tanggal_mulai >= hari ini), diurutkan naik */
async function agendaTerdekatAsli(batas = 3): Promise<AgendaPublik[]> {
  try {
    const sb = klienPublik();
    const hariIni = new Date().toISOString().slice(0, 10);
    const { data, error } = await sb
      .from("public_agenda")
      .select("id, judul, ringkasan, tanggal_mulai, tanggal_selesai, tempat, status, slug")
      .gte("tanggal_mulai", hariIni)
      .order("tanggal_mulai", { ascending: true })
      .limit(batas);

    if (error || !data) return [];
    return data as AgendaPublik[];
  } catch {
    return [];
  }
}

/** Mengambil semua agenda publik, diurutkan tanggal mulai turun */
async function daftarAgendaAsli(): Promise<AgendaPublik[]> {
  try {
    const sb = klienPublik();
    const { data, error } = await sb
      .from("public_agenda")
      .select("id, judul, ringkasan, tanggal_mulai, tanggal_selesai, tempat, status, slug")
      .order("tanggal_mulai", { ascending: false });

    if (error || !data) return [];
    return data as AgendaPublik[];
  } catch {
    return [];
  }
}

/** Mengambil berita terbaru yang telah terbit, diurutkan tanggal terbit turun */
async function beritaTerbaruAsli(batas = 3): Promise<BeritaPublik[]> {
  try {
    const sb = klienPublik();
    const { data, error } = await sb
      .from("public_news")
      .select("id, judul, slug, ringkasan, isi, gambar_path, terbit_pada, activity_id")
      .order("terbit_pada", { ascending: false })
      .limit(batas);

    if (error || !data) return [];
    return data as BeritaPublik[];
  } catch {
    return [];
  }
}

/** Mengambil seluruh daftar berita publik */
async function daftarBeritaAsli(): Promise<BeritaPublik[]> {
  try {
    const sb = klienPublik();
    const { data, error } = await sb
      .from("public_news")
      .select("id, judul, slug, ringkasan, isi, gambar_path, terbit_pada, activity_id")
      .order("terbit_pada", { ascending: false });

    if (error || !data) return [];
    return data as BeritaPublik[];
  } catch {
    return [];
  }
}

/** Mengambil satu berita berdasarkan slug (versi ber-singgahan) */
export function beritaSlug(slug: string): Promise<BeritaPublik | null> {
  return unstable_cache(() => beritaSlugAsli(slug), ["publik", "berita-slug", slug], {
    revalidate: SEGAR,
    tags: ["publik"],
  })();
}

/** Mengambil satu berita berdasarkan slug */
async function beritaSlugAsli(slug: string): Promise<BeritaPublik | null> {
  try {
    const sb = klienPublik();
    const { data, error } = await sb
      .from("public_news")
      .select("id, judul, slug, ringkasan, isi, gambar_path, terbit_pada, activity_id")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return null;
    return data as BeritaPublik;
  } catch {
    return null;
  }
}

/** Mengambil galeri publik dan mengelompokkannya per activity_id */
async function daftarGaleriAsli(): Promise<GaleriKelompok[]> {
  try {
    const sb = klienPublik();
    const { data, error } = await sb
      .from("public_gallery")
      .select("id, activity_id, path, keterangan, urutan")
      .order("urutan", { ascending: true });

    if (error || !data) return [];
    const baris = data as GaleriPublik[];

    const peta = new Map<string, GaleriPublik[]>();
    for (const item of baris) {
      const actId = item.activity_id || "umum";
      const kumpulan = peta.get(actId) ?? [];
      kumpulan.push(item);
      peta.set(actId, kumpulan);
    }

    const hasil: GaleriKelompok[] = [];
    for (const [activity_id, items] of peta.entries()) {
      hasil.push({ activity_id, items });
    }
    return hasil;
  } catch {
    return [];
  }
}

/** Membaca pengaturan situs dari tabel site_settings; bila kosong/gagal, memakai TEMA_BAWAAN */
async function pengaturanSitusAsli(): Promise<TemaSitus> {
  try {
    const sb = klienPublik();
    const { data, error } = await sb
      // WAJIB membaca view publik, bukan tabel internal: tabel site_settings
      // dilindungi aturan pengaman sehingga untuk pengunjung publik hasilnya
      // kosong dan tampilan jatuh ke nilai bawaan.
      .from("public_site_settings")
      .select(
        "nama_aplikasi, nama_unit, nama_organisasi, warna_utama, logo_path, favicon_path, alamat, telepon, email, sambutan, profil_singkat, sub_judul_agenda, sub_judul_berita, sub_judul_galeri, sub_judul_unduhan, peta_lintang, peta_bujur, peta_zoom",
      )
      .limit(1)
      .maybeSingle();

    if (error || !data) return TEMA_BAWAAN;

    return {
      warnaUtama: data.warna_utama || TEMA_BAWAAN.warnaUtama,
      // Logo/favicon: pakai yang diunggah; kalau belum ada, pakai bawaan
      logoUrl: data.logo_path ? urlPublik(data.logo_path) : TEMA_BAWAAN.logoUrl,
      faviconUrl: data.favicon_path ? urlPublik(data.favicon_path) : TEMA_BAWAAN.faviconUrl,
      namaAplikasi: data.nama_aplikasi || TEMA_BAWAAN.namaAplikasi,
      namaUnit: data.nama_unit || TEMA_BAWAAN.namaUnit,
      namaOrganisasi: data.nama_organisasi || TEMA_BAWAAN.namaOrganisasi,
      alamat: data.alamat || TEMA_BAWAAN.alamat,
      telepon: data.telepon || TEMA_BAWAAN.telepon,
      email: data.email || TEMA_BAWAAN.email,
      sambutan: data.sambutan || TEMA_BAWAAN.sambutan,
      profilSingkat: data.profil_singkat || TEMA_BAWAAN.profilSingkat,
      subJudulAgenda: data.sub_judul_agenda || TEMA_BAWAAN.subJudulAgenda,
      subJudulBerita: data.sub_judul_berita || TEMA_BAWAAN.subJudulBerita,
      subJudulGaleri: data.sub_judul_galeri || TEMA_BAWAAN.subJudulGaleri,
      subJudulUnduhan: data.sub_judul_unduhan || TEMA_BAWAAN.subJudulUnduhan,
      lat: data.peta_lintang !== null ? Number(data.peta_lintang) : TEMA_BAWAAN.lat,
      bujur: data.peta_bujur !== null ? Number(data.peta_bujur) : TEMA_BAWAAN.bujur,
      zoom: data.peta_zoom !== null ? Number(data.peta_zoom) : TEMA_BAWAAN.zoom,
    };
  } catch {
    return TEMA_BAWAAN;
  }
}

/** Mengambil daftar pengurus untuk halaman profil publik */
async function daftarPengurusAsli(): Promise<PengurusPublik[]> {
  // Dibaca dari view publik (public_officers) — bukan tabel internal.
  try {
    const sb = klienPublik();
    const { data, error } = await sb
      .from("public_officers")
      .select("nama, bidang, jabatan, email, urutan")
      .order("urutan", { ascending: true });

    if (error || !data || data.length === 0) {
      return [];
    }
    return data as PengurusPublik[];
  } catch {
    return [];
  }
}

export type DokumenPublik = {
  id: string;
  judul: string;
  keterangan: string | null;
  path: string;
  ukuran_byte: number | null;
  jenis: "pdf" | "gambar" | "lain";
  dibuat_pada: string;
};

/** Mengambil seluruh daftar dokumen yang dipublikasikan untuk publik */
async function daftarDokumenPublikAsli(): Promise<DokumenPublik[]> {
  try {
    const sb = klienPublik();
    const { data, error } = await sb
      .from("public_documents")
      .select("id, judul, keterangan, path, ukuran_byte, jenis, dibuat_pada")
      .order("dibuat_pada", { ascending: false });

    if (error || !data) return [];
    return data as DokumenPublik[];
  } catch {
    return [];
  }
}

// ============================================================
// Pembungkus memori: hasil disimpan sebentar supaya perpindahan
// halaman dan pembukaan ulang tidak selalu menunggu database.
// Setiap perubahan di panel admin langsung menyegarkan tampilan
// publik lewat revalidatePath, jadi data tetap akurat.
// ============================================================

export function agendaTerdekat(...args: Parameters<typeof agendaTerdekatAsli>) {
  return unstable_cache(
    () => agendaTerdekatAsli(...args),
    ["publik", "agenda-terdekat", JSON.stringify(args)],
    { revalidate: SEGAR, tags: ["publik"] },
  )();
}
export function daftarAgenda(...args: Parameters<typeof daftarAgendaAsli>) {
  return unstable_cache(
    () => daftarAgendaAsli(...args),
    ["publik", "agenda-semua", JSON.stringify(args)],
    { revalidate: SEGAR, tags: ["publik"] },
  )();
}
export function beritaTerbaru(...args: Parameters<typeof beritaTerbaruAsli>) {
  return unstable_cache(
    () => beritaTerbaruAsli(...args),
    ["publik", "berita-terbaru", JSON.stringify(args)],
    { revalidate: SEGAR, tags: ["publik"] },
  )();
}
export function daftarBerita(...args: Parameters<typeof daftarBeritaAsli>) {
  return unstable_cache(
    () => daftarBeritaAsli(...args),
    ["publik", "berita-semua", JSON.stringify(args)],
    { revalidate: SEGAR, tags: ["publik"] },
  )();
}
export function daftarGaleri(...args: Parameters<typeof daftarGaleriAsli>) {
  return unstable_cache(
    () => daftarGaleriAsli(...args),
    ["publik", "galeri", JSON.stringify(args)],
    { revalidate: SEGAR, tags: ["publik"] },
  )();
}
export function pengaturanSitus(...args: Parameters<typeof pengaturanSitusAsli>) {
  return unstable_cache(
    () => pengaturanSitusAsli(...args),
    ["publik", "tema-situs", JSON.stringify(args)],
    { revalidate: SEGAR, tags: ["publik"] },
  )();
}
export function daftarPengurus(...args: Parameters<typeof daftarPengurusAsli>) {
  return unstable_cache(
    () => daftarPengurusAsli(...args),
    ["publik", "pengurus", JSON.stringify(args)],
    { revalidate: SEGAR, tags: ["publik"] },
  )();
}
export function daftarDokumenPublik(...args: Parameters<typeof daftarDokumenPublikAsli>) {
  return unstable_cache(
    () => daftarDokumenPublikAsli(...args),
    ["publik", "dokumen", JSON.stringify(args)],
    { revalidate: SEGAR, tags: ["publik"] },
  )();
}
