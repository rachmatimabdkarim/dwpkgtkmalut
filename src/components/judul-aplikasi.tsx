import { APP_NAME, APP_SUB } from "@/lib/peran";

/**
 * Judul aplikasi dua baris:
 *   Baris 1 — nama sistem
 *   Baris 2 — unit/organisasi
 * Dipakai di sidebar panel, halaman masuk, dan header (HP).
 */
export function JudulAplikasi({
  baris1 = APP_NAME,
  baris2 = APP_SUB,
  terang = false,
}: {
  baris1?: string;
  baris2?: string;
  terang?: boolean;
}) {
  return (
    <span className="flex flex-col leading-tight min-w-0">
      <span
        className={`text-[14px] font-semibold truncate ${terang ? "text-brand-contrast" : "text-n-800"}`}
      >
        {baris1}
      </span>
      <span className={`teks-3 truncate ${terang ? "text-brand-contrast/85" : "text-n-500"}`}>
        {baris2}
      </span>
    </span>
  );
}
