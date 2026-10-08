import type { NadaStatus } from "@/components/dasar";

/** Label dan warna lencana untuk setiap status kegiatan. */
export const STATUS_KEGIATAN: Record<string, { label: string; nada: NadaStatus }> = {
  draf: { label: "Draf", nada: "netral" },
  diajukan: { label: "Diajukan", nada: "warn" },
  dalam_review: { label: "Dalam review", nada: "warn" },
  revisi: { label: "Perlu revisi", nada: "bad" },
  ditolak: { label: "Ditolak", nada: "bad" },
  disetujui: { label: "Disetujui", nada: "ok" },
  berjalan: { label: "Berjalan", nada: "brand" },
  selesai: { label: "Selesai", nada: "ok" },
  laporan_diajukan: { label: "Laporan diajukan", nada: "warn" },
  laporan_dalam_review: { label: "Laporan dalam review", nada: "warn" },
  laporan_disetujui: { label: "Laporan disetujui", nada: "ok" },
  arsip: { label: "Arsip", nada: "netral" },
};

export function labelStatus(status: string) {
  return STATUS_KEGIATAN[status] ?? { label: status, nada: "netral" as NadaStatus };
}

export type Peran =
  | "super_admin"
  | "ketua"
  | "wakil_ketua"
  | "sekretaris"
  | "bendahara"
  | "ketua_seksi"
  | "pengurus"
  | "editor";

/** Tahap besar saat ini, dipakai untuk menentukan tab yang relevan. */
export type TahapKegiatan = "perencanaan" | "pelaksanaan" | "pelaporan";

export function tahapSaatIni(status: string): TahapKegiatan {
  // Sesudah kegiatan selesai, tugasnya beralih ke penyusunan laporan.
  if (
    ["selesai", "laporan_diajukan", "laporan_dalam_review", "laporan_disetujui", "arsip"].includes(
      status,
    )
  ) {
    return "pelaporan";
  }
  if (["disetujui", "berjalan"].includes(status)) return "pelaksanaan";
  return "perencanaan";
}

export const RANTAI_STATUS = [
  "draf",
  "diajukan",
  "dalam_review",
  "revisi",
  "ditolak",
  "disetujui",
  "berjalan",
  "selesai",
  "laporan_diajukan",
  "laporan_dalam_review",
  "laporan_disetujui",
  "arsip",
];

/** Urutan langkah persetujuan untuk sebuah tahap. */
export function langkahBerikutnya(peran: Peran[], jenjang: string[]): string | null {
  return jenjang.find((p) => peran.includes(p as Peran)) ?? null;
}

export function formatTanggal(iso: string | null): string {
  if (!iso) return "—";
  const bulan = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  // Nilai dari basis data bisa berupa tanggal saja ("2026-10-08") atau
  // tanggal lengkap dengan jam ("2026-10-08T08:15:42+00:00").
  // Tanggal saja ditambah waktu tengah malam agar tidak bergeser hari.
  const hanyaTanggal = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const d = hanyaTanggal ? new Date(iso + "T00:00:00") : new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatRupiah(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}
