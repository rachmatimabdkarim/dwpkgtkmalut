"use client";

/**
 * Ikon garis sederhana (setara Lucide, digambar langsung agar tidak
 * menambah beban unduhan). Selalu dipakai bersama label teks.
 */
type NamaIkon =
  | "beranda"
  | "kegiatan"
  | "konten"
  | "pengurus"
  | "pengaturan"
  | "profil"
  | "menu"
  | "tutup"
  | "keluar"
  | "lonceng";

const jalur: Record<NamaIkon, string> = {
  beranda: "M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5",
  kegiatan:
    "M8 2v3M16 2v3M3.5 8.5h17M5 4.5h14A1.5 1.5 0 0 1 20.5 6v13A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V6A1.5 1.5 0 0 1 5 4.5Z",
  konten: "M6 3.5h9l4 4V20.5H6zM14.5 3.5V8h4.5M9 12.5h6M9 16h4",
  pengurus:
    "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M17 11.5a2.5 2.5 0 1 0 0-5M18.5 20c0-2.3-.7-3.9-2-4.8",
  pengaturan:
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.4-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4Z",
  profil: "M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6",
  menu: "M4 7h16M4 12h16M4 17h16",
  tutup: "M6 6l12 12M18 6 6 18",
  keluar: "M15 4.5h3.5A1.5 1.5 0 0 1 20 6v12a1.5 1.5 0 0 1-1.5 1.5H15M10 8.5 6.5 12l3.5 3.5M6.5 12H15",
  lonceng:
    "M18 15.5V11a6 6 0 1 0-12 0v4.5L4.5 18h15zM10 21h4",
};

export function Ikon({
  nama,
  ukuran = 18,
  className = "",
}: {
  nama: NamaIkon;
  ukuran?: number;
  className?: string;
}) {
  return (
    <svg
      width={ukuran}
      height={ukuran}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={jalur[nama]} />
    </svg>
  );
}

/** Lambang organisasi bila belum ada logo: huruf awal nama organisasi. */
export function LambangTeks({ teks = "DWP", ukuran = 36 }: { teks?: string; ukuran?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-token bg-brand-600 text-brand-contrast font-semibold shrink-0"
      style={{ width: ukuran, height: ukuran, fontSize: ukuran * 0.34 }}
    >
      {teks}
    </span>
  );
}
