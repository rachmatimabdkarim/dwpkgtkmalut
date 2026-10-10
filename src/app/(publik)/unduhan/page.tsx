import type { Metadata } from "next";
import { formatTanggal } from "@/lib/kegiatan";
import { daftarDokumenPublik, pengaturanSitus, urlPublik } from "@/lib/publik";

export async function generateMetadata(): Promise<Metadata> {
  const tema = await pengaturanSitus();
  return { title: "Unduhan Dokumen", description: tema.subJudulUnduhan ?? undefined };
}

function formatUkuran(byte: number | null | undefined): string {
  if (!byte || byte <= 0) return "—";
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${Math.round(byte / 1024)} KB`;
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`;
}

/** Ikon dan warna lencana menurut jenis berkas. */
function gayaJenis(jenis: string): { ikon: string; latar: string; teks: string } {
  if (jenis === "pdf") return { ikon: "📄", latar: "var(--aksen-50)", teks: "var(--aksen-700)" };
  if (jenis === "gambar") return { ikon: "🖼️", latar: "var(--dasar-50)", teks: "var(--dasar-700)" };
  return { ikon: "📎", latar: "var(--halaman)", teks: "var(--dasar-600)" };
}

export default async function HalamanUnduhan() {
  const [dokumenList, tema] = await Promise.all([daftarDokumenPublik(), pengaturanSitus()]);

  return (
    <div className="space-y-10">
      {/* ============ KEPALA HALAMAN ============ */}
      <header
        className="rounded-[18px] px-6 sm:px-10 py-10 sm:py-12"
        style={{ backgroundColor: "var(--dasar-700)", color: "var(--dasar-teks)" }}
      >
        <p
          className="text-[12.5px] font-bold tracking-[0.14em] uppercase mb-3"
          style={{ color: "var(--aksen-300)" }}
        >
          Dokumen Resmi
        </p>
        <h1 className="text-[30px] sm:text-[38px] font-extrabold leading-tight tracking-tight">
          Unduhan Dokumen
        </h1>
        <p className="mt-4 text-[15.5px] sm:text-[16.5px] leading-relaxed opacity-90 max-w-[620px]">
          {tema.subJudulUnduhan}
        </p>
      </header>

      {dokumenList.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-n-300 bg-n-0 p-10 text-center space-y-2">
          <p className="text-[28px]" aria-hidden="true">📁</p>
          <p className="text-n-600">Belum ada dokumen publik yang tersedia untuk diunduh.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {dokumenList.map((doc) => {
            const tautan = urlPublik(doc.path);
            const gaya = gayaJenis(doc.jenis);

            return (
              <div
                key={doc.id}
                className="rounded-[18px] bg-n-0 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5"
                style={{ border: "1px solid var(--n-200)" }}
              >
                <div className="flex gap-4 flex-1 min-w-0">
                  <div
                    className="h-12 w-12 rounded-[14px] flex items-center justify-center text-[21px] shrink-0"
                    style={{ backgroundColor: gaya.latar }}
                    aria-hidden="true"
                  >
                    {gaya.ikon}
                  </div>

                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                        style={{ backgroundColor: gaya.latar, color: gaya.teks }}
                      >
                        {doc.jenis}
                      </span>
                      <span className="text-[12.5px] text-n-500">
                        {formatUkuran(doc.ukuran_byte)}
                      </span>
                      <span className="text-[12.5px] text-n-400">·</span>
                      <span className="text-[12.5px] text-n-500">
                        Diperbarui {formatTanggal(doc.dibuat_pada.slice(0, 10))}
                      </span>
                    </div>

                    <h2 className="font-extrabold text-[16.5px] leading-snug" style={{ color: "var(--dasar-700)" }}>
                      {doc.judul}
                    </h2>

                    {doc.keterangan && (
                      <p className="text-n-600 text-[14px] leading-[1.7]">{doc.keterangan}</p>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {tautan ? (
                    <a
                      href={tautan}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="min-h-[46px] px-6 rounded-full font-bold text-[14.5px] inline-flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] w-full sm:w-auto"
                      style={{ backgroundColor: "var(--tombol-600)", color: "var(--tombol-teks)" }}
                    >
                      <span>Unduh</span>
                      <span aria-hidden="true">↓</span>
                    </a>
                  ) : (
                    <span className="text-n-400 text-[13px]">Berkas tidak tersedia</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
