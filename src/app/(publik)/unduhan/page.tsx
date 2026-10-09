import type { Metadata } from "next";
import { formatTanggal } from "@/lib/kegiatan";
import { daftarDokumenPublik, pengaturanSitus, urlPublik } from "@/lib/publik";

export const instant = false;

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

export default async function HalamanUnduhan() {
  const [dokumenList, tema] = await Promise.all([daftarDokumenPublik(), pengaturanSitus()]);

  return (
    <div className="space-y-6">
      <header className="border-b border-n-200 pb-5">
        <h1 className="judul-1 text-n-900">Unduhan Dokumen</h1>
        <p className="teks-3 text-n-600 mt-1.5">{tema.subJudulUnduhan}</p>
      </header>

      {dokumenList.length === 0 ? (
        <div className="rounded-token-lg border border-dashed border-n-300 bg-n-0 p-10 text-center">
          <p className="text-n-600">Belum ada dokumen publik yang tersedia untuk diunduh.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dokumenList.map((doc) => {
            const tautan = urlPublik(doc.path);

            return (
              <div
                key={doc.id}
                className="rounded-token-lg border border-n-200 bg-n-0 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-brand-300 transition-colors"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 uppercase">
                      {doc.jenis}
                    </span>
                    <span className="teks-3 text-n-500">
                      Ukuran: {formatUkuran(doc.ukuran_byte)}
                    </span>
                    <span className="teks-3 text-n-400">·</span>
                    <span className="teks-3 text-n-500">
                      Diperbarui: {formatTanggal(doc.dibuat_pada.slice(0, 10))}
                    </span>
                  </div>

                  <h2 className="font-semibold text-n-900 text-[16px] leading-snug">
                    {doc.judul}
                  </h2>

                  {doc.keterangan && (
                    <p className="text-n-600 text-[14px] leading-relaxed">
                      {doc.keterangan}
                    </p>
                  )}
                </div>

                <div className="pt-2 sm:pt-0 shrink-0">
                  {tautan ? (
                    <a
                      href={tautan}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="min-h-[44px] px-4 rounded-token bg-brand-600 text-brand-contrast hover:bg-brand-700 font-medium text-[14px] inline-flex items-center justify-center gap-2 transition-colors w-full sm:w-auto"
                    >
                      <span>Unduh Berkas</span>
                      <span>↓</span>
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
