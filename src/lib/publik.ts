import { klienServer } from "@/lib/supabase-server";
import { TEMA_BAWAAN, type TemaSitus } from "@/lib/tema";

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
  urut: number;
};

export type GaleriKelompok = {
  activity_id: string;
  items: GaleriPublik[];
};

export type PengurusPublik = {
  id: string;
  nama: string;
  bidang: string;
  jabatan: string;
  email: string | null;
  urutan: number;
};

/** Data pengurus bawaan dari SK/Struktur resmi DWP GTK Malut bila tabel belum terbuka izinnya */
const PENGURUS_BAWAAN: PengurusPublik[] = [
  { id: "1", nama: "Ny. Washliyatul Qodari", bidang: "Pengurus Harian", jabatan: "Ketua", urutan: 1, email: "ketua.dwp@gtkmalut.id" },
  { id: "2", nama: "Ny. Wahyuni Balussy", bidang: "Pengurus Harian", jabatan: "Wakil Ketua", urutan: 2, email: "wakilketua.dwp@gtkmalut.id" },
  { id: "3", nama: "Ny. Fadila Assagaf", bidang: "Pengurus Harian", jabatan: "Sekretaris", urutan: 3, email: "sekretaris.dwp@gtkmalut.id" },
  { id: "4", nama: "Ny. Hastizia Ismira", bidang: "Pengurus Harian", jabatan: "Wakil Sekretaris", urutan: 4, email: "wakilsekretaris.dwp@gtkmalut.id" },
  { id: "5", nama: "Ny. Jumaini", bidang: "Pengurus Harian", jabatan: "Bendahara", urutan: 5, email: "bendahara.dwp@gtkmalut.id" },
  { id: "10", nama: "Ny. Jusna", bidang: "Bidang Pendidikan", jabatan: "Ketua Bidang", urutan: 10, email: "jusna.dwp@gtkmalut.id" },
  { id: "11", nama: "Ny. Nurlaela A. Barmawi", bidang: "Bidang Pendidikan", jabatan: "Anggota", urutan: 11, email: "nurlaela.dwp@gtkmalut.id" },
  { id: "12", nama: "Ny. Nur", bidang: "Bidang Pendidikan", jabatan: "Anggota", urutan: 12, email: "nur.dwp@gtkmalut.id" },
  { id: "13", nama: "Ny. Nining Suaib", bidang: "Bidang Pendidikan", jabatan: "Anggota", urutan: 13, email: "nining.dwp@gtkmalut.id" },
  { id: "20", nama: "Ny. Yayuk Setiyawati", bidang: "Bidang Ekonomi", jabatan: "Ketua Bidang", urutan: 20, email: "yayuk.dwp@gtkmalut.id" },
  { id: "21", nama: "Ny. Sahdia Abukasim", bidang: "Bidang Ekonomi", jabatan: "Anggota", urutan: 21, email: "sahdia.dwp@gtkmalut.id" },
  { id: "22", nama: "Ny. Jumiarti Audina", bidang: "Bidang Ekonomi", jabatan: "Anggota", urutan: 22, email: "jumiarti.dwp@gtkmalut.id" },
  { id: "30", nama: "Ny. Risna Kanurua Sopalatu", bidang: "Bidang Sosial Budaya", jabatan: "Ketua Bidang", urutan: 30, email: "risna.dwp@gtkmalut.id" },
  { id: "31", nama: "Ny. Aida Ibrahim", bidang: "Bidang Sosial Budaya", jabatan: "Anggota", urutan: 31, email: "aida.dwp@gtkmalut.id" },
  { id: "32", nama: "Ny. Siti Masita Muhammad", bidang: "Bidang Sosial Budaya", jabatan: "Anggota", urutan: 32, email: "sitimasita.dwp@gtkmalut.id" },
  { id: "33", nama: "Ny. Nur Alisnawati Anas", bidang: "Bidang Sosial Budaya", jabatan: "Anggota", urutan: 33, email: "nuralisnawati.dwp@gtkmalut.id" },
];

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
export async function agendaTerdekat(batas = 3): Promise<AgendaPublik[]> {
  try {
    const sb = await klienServer();
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
export async function daftarAgenda(): Promise<AgendaPublik[]> {
  try {
    const sb = await klienServer();
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
export async function beritaTerbaru(batas = 3): Promise<BeritaPublik[]> {
  try {
    const sb = await klienServer();
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
export async function daftarBerita(): Promise<BeritaPublik[]> {
  try {
    const sb = await klienServer();
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

/** Mengambil satu berita berdasarkan slug */
export async function beritaSlug(slug: string): Promise<BeritaPublik | null> {
  try {
    const sb = await klienServer();
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
export async function daftarGaleri(): Promise<GaleriKelompok[]> {
  try {
    const sb = await klienServer();
    const { data, error } = await sb
      .from("public_gallery")
      .select("id, activity_id, path, keterangan, urut")
      .order("urut", { ascending: true });

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
export async function pengaturanSitus(): Promise<TemaSitus> {
  try {
    const sb = await klienServer();
    const { data, error } = await sb
      .from("site_settings")
      .select("nama_aplikasi, nama_unit, warna_utama, logo_path, favicon_path")
      .limit(1)
      .maybeSingle();

    if (error || !data) return TEMA_BAWAAN;

    return {
      warnaUtama: data.warna_utama || TEMA_BAWAAN.warnaUtama,
      logoUrl: data.logo_path ? urlPublik(data.logo_path) : TEMA_BAWAAN.logoUrl,
      faviconUrl: data.favicon_path ? urlPublik(data.favicon_path) : TEMA_BAWAAN.faviconUrl,
      namaAplikasi: data.nama_aplikasi || TEMA_BAWAAN.namaAplikasi,
      namaUnit: data.nama_unit || TEMA_BAWAAN.namaUnit,
      namaOrganisasi: TEMA_BAWAAN.namaOrganisasi,
    };
  } catch {
    return TEMA_BAWAAN;
  }
}

/** Mengambil daftar pengurus untuk halaman profil publik */
export async function daftarPengurus(): Promise<PengurusPublik[]> {
  try {
    const sb = await klienServer();
    const { data, error } = await sb
      .from("officers")
      .select("id, nama, bidang, jabatan, email, urutan")
      .order("urutan", { ascending: true });

    if (error || !data || data.length === 0) {
      return PENGURUS_BAWAAN;
    }
    return data as PengurusPublik[];
  } catch {
    return PENGURUS_BAWAAN;
  }
}
