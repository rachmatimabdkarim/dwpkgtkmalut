import { APP_NAME, APP_SUB } from "@/lib/peran";

/**
 * Menyusun nilai CSS variables dari pengaturan Super Admin.
 * Sementara memakai nilai bawaan (teal tua) sampai tabel pengaturan
 * terhubung ke database. Fungsi ini kelak membaca Pengaturan → Tampilan.
 */
export type TemaSitus = {
  warnaUtama: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  namaAplikasi: string;
  namaUnit: string;
  namaOrganisasi: string;
  logoPath?: string | null;
  faviconPath?: string | null;
  alamat?: string | null;
  sambutan?: string | null;
  subJudulAgenda?: string | null;
  subJudulBerita?: string | null;
  subJudulGaleri?: string | null;
  subJudulUnduhan?: string | null;
  lat?: number | null;
  bujur?: number | null;
  zoom?: number | null;
  profilSingkat?: string | null;
  telepon?: string | null;
  email?: string | null;
};

export const TEMA_BAWAAN: TemaSitus = {
  warnaUtama: "#0f766e",
  logoUrl: null,
  faviconUrl: null,
  namaAplikasi: APP_NAME,
  namaUnit: APP_SUB,
  namaOrganisasi: "Dharma Wanita Persatuan Kantor GTK Provinsi Maluku Utara",
  logoPath: null,
  faviconPath: null,
  alamat: "Jl. Ki Hajar Dewantara, Kota Ternate, Provinsi Maluku Utara",
  sambutan:
    "Mewujudkan kebersamaan, ketahanan keluarga, dan karya nyata di lingkungan pendidikan Maluku Utara.",
  profilSingkat:
    "Dharma Wanita Persatuan (DWP) Kantor Guru dan Tenaga Kependidikan Provinsi Maluku Utara adalah wadah silaturahmi, kebersamaan, dan pengabdian bagi peningkatan kualitas keluarga pendidik dan tenaga kependidikan di Maluku Utara.",
  subJudulAgenda: "Jadwal pelaksanaan program kerja dan kegiatan organisasi.",
  subJudulBerita: "Kabar terbaru seputar kegiatan dan program Dharma Wanita Persatuan.",
  subJudulGaleri: "Album dokumentasi visual dari berbagai kegiatan dan program organisasi.",
  subJudulUnduhan: "Dokumen resmi yang dapat diunduh oleh pengurus dan masyarakat umum.",
  // Koordinat awal: Kantor GTK Malut, Kel. Rum, Tidore Utara
  lat: 0.7245,
  bujur: 127.4429,
  zoom: 15,
  telepon: "(0921) 3123456",
  email: "dwp.gtkmalut@kemdikbud.go.id",
};

/* ---------- Perhitungan warna (tanpa pustaka tambahan) ---------- */

function keRgb(hex: string): [number, number, number] {
  const bersih = hex.replace("#", "").trim();
  const penuh =
    bersih.length === 3
      ? bersih
          .split("")
          .map((c) => c + c)
          .join("")
      : bersih;
  return [
    parseInt(penuh.slice(0, 2), 16),
    parseInt(penuh.slice(2, 4), 16),
    parseInt(penuh.slice(4, 6), 16),
  ];
}

function keHex(r: number, g: number, b: number): string {
  const batasi = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [batasi(r), batasi(g), batasi(b)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Campur warna: t=0 mengembalikan `dari`, t=1 mengembalikan `ke`. */
function campur(dari: string, ke: string, t: number): string {
  const a = keRgb(dari);
  const b = keRgb(ke);
  return keHex(
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  );
}

/** Kecerahan relatif (rumus WCAG) untuk memilih warna teks di atas warna utama. */
export function kecerahanRelatif(hex: string): number {
  const [r, g, b] = keRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function rasioKontras(warna1: string, warna2: string): number {
  const l1 = kecerahanRelatif(warna1);
  const l2 = kecerahanRelatif(warna2);
  const terang = Math.max(l1, l2);
  const gelap = Math.min(l1, l2);
  return (terang + 0.05) / (gelap + 0.05);
}

/** Warna teks paling terbaca di atas warna latar tertentu. */
export function warnaTeksTerbaik(latar: string, pilihan = ["#ffffff", "#0f172a"]): string {
  let terbaik = pilihan[0];
  let rasioTerbaik = 0;
  for (const kandidat of pilihan) {
    const r = rasioKontras(kandidat, latar);
    if (r > rasioTerbaik) {
      rasioTerbaik = r;
      terbaik = kandidat;
    }
  }
  return terbaik;
}

/**
 * Menurunkan skala warna 50–900 dari satu warna utama.
 * Skala terang dicampur ke putih, skala gelap dicampur ke warna gelap netral.
 */
export function skalaWarna(utama: string): Record<string, string> {
  return {
    "--brand-50": campur(utama, "#ffffff", 0.94),
    "--brand-100": campur(utama, "#ffffff", 0.86),
    "--brand-200": campur(utama, "#ffffff", 0.7),
    "--brand-300": campur(utama, "#ffffff", 0.5),
    "--brand-400": campur(utama, "#ffffff", 0.26),
    "--brand-500": campur(utama, "#ffffff", 0.1),
    "--brand-600": utama,
    "--brand-700": campur(utama, "#0f172a", 0.16),
    "--brand-800": campur(utama, "#0f172a", 0.32),
    "--brand-900": campur(utama, "#0f172a", 0.5),
  };
}

/** Seluruh CSS variables tema, siap ditempel ke atribut style <html>. */
export function variabelTema(tema: TemaSitus): Record<string, string> {
  const skala = skalaWarna(tema.warnaUtama);
  const latarTombol = skala["--brand-600"];
  return {
    ...skala,
    "--brand-contrast": warnaTeksTerbaik(latarTombol),
    "--brand-soft": warnaTeksTerbaik(skala["--brand-50"]),
  };
}

export function gayaTema(tema: TemaSitus): React.CSSProperties {
  return variabelTema(tema) as unknown as React.CSSProperties;
}
