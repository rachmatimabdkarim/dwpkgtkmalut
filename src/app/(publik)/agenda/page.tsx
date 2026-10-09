import type { Metadata } from "next";
import { formatTanggal } from "@/lib/kegiatan";
import { daftarAgenda, pengaturanSitus } from "@/lib/publik";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const tema = await pengaturanSitus();
  return { title: "Agenda", description: tema.subJudulAgenda ?? undefined };
}

export default async function HalamanAgenda() {
  const [agendaList, tema] = await Promise.all([daftarAgenda(), pengaturanSitus()]);

  return (
    <div className="space-y-6">
      <header className="border-b border-n-200 pb-5">
        <h1 className="judul-1 text-n-900">Agenda Kegiatan</h1>
        <p className="teks-3 text-n-600 mt-1.5">
          {tema.subJudulAgenda}
        </p>
      </header>

      {agendaList.length === 0 ? (
        <div className="rounded-token-lg border border-dashed border-n-300 bg-n-0 p-10 text-center">
          <p className="text-n-600">Belum ada agenda kegiatan yang tercatat.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agendaList.map((agenda) => {
            const tanggalTampil =
              agenda.tanggal_selesai && agenda.tanggal_selesai !== agenda.tanggal_mulai
                ? `${formatTanggal(agenda.tanggal_mulai)} – ${formatTanggal(agenda.tanggal_selesai)}`
                : formatTanggal(agenda.tanggal_mulai);

            return (
              <div
                key={agenda.id}
                className="rounded-token-lg border border-n-200 bg-n-0 p-5 flex flex-col justify-between shadow-xs hover:border-n-300 transition-colors"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-block px-2.5 py-1 rounded-token bg-brand-50 text-brand-700 text-[12px] font-medium">
                      {tanggalTampil}
                    </span>
                  </div>

                  <h2 className="font-semibold text-n-900 text-[17px] leading-snug">
                    {agenda.judul}
                  </h2>

                  {agenda.tempat && (
                    <p className="teks-3 text-n-500 mt-2 flex items-center gap-1.5">
                      <span>📍</span>
                      <span>{agenda.tempat}</span>
                    </p>
                  )}

                  {agenda.ringkasan && (
                    <p className="teks-3 text-n-600 mt-3 leading-relaxed">
                      {agenda.ringkasan}
                    </p>
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
