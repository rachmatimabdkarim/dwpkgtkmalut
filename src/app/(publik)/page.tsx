import type { Metadata } from "next";
import Link from "next/link";
import { formatTanggal } from "@/lib/kegiatan";
import {
  agendaTerdekat,
  beritaTerbaru,
  pengaturanSitus,
  urlPublik,
} from "@/lib/publik";


export async function generateMetadata(): Promise<Metadata> {
  const tema = await pengaturanSitus();
  return {
    title: "Beranda",
    description: tema.namaOrganisasi,
  };
}

export default async function BerandaPublik() {
  const [daftarAgenda, daftarBerita, tema] = await Promise.all([
    agendaTerdekat(3),
    beritaTerbaru(3),
    pengaturanSitus(),
  ]);

  return (
    <div className="space-y-12">
      {/* Blok 1: Hero */}
      <section className="rounded-token-lg border border-n-200 bg-n-0 p-8 sm:p-12 text-center shadow-xs">
        <h1 className="judul-1 text-n-900 max-w-2xl mx-auto leading-tight">
          {tema.sambutan}
        </h1>
        <div className="mt-8 flex justify-center">
          <Link
            href="/agenda"
            className="inline-flex items-center justify-center min-h-[44px] h-11 px-6 rounded-token bg-brand-600 font-medium text-[15px] text-brand-contrast hover:bg-brand-700 transition-colors select-none"
          >
            Lihat Agenda
          </Link>
        </div>
      </section>

      {/* Blok 2: Agenda Terdekat (Maksimal 3 kartu) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="judul-2 text-n-900">Agenda Terdekat</h2>
          {daftarAgenda.length > 0 && (
            <Link
              href="/agenda"
              className="teks-3 text-brand-700 hover:underline min-h-[44px] inline-flex items-center font-medium"
            >
              Semua agenda →
            </Link>
          )}
        </div>

        {daftarAgenda.length === 0 ? (
          <div className="rounded-token-lg border border-dashed border-n-300 bg-n-0 p-8 text-center">
            <p className="text-n-600">Belum ada agenda kegiatan dalam waktu dekat.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {daftarAgenda.map((agenda) => (
              <div
                key={agenda.id}
                className="rounded-token-lg border border-n-200 bg-n-0 p-5 flex flex-col justify-between shadow-xs"
              >
                <div>
                  <span className="inline-block px-2.5 py-1 rounded-token bg-brand-50 text-brand-700 text-[12px] font-medium mb-3">
                    {formatTanggal(agenda.tanggal_mulai)}
                  </span>
                  <h3 className="font-semibold text-n-900 text-[16px] leading-snug line-clamp-2">
                    {agenda.judul}
                  </h3>
                  {agenda.tempat && (
                    <p className="teks-3 text-n-500 mt-2 flex items-center gap-1.5 truncate">
                      <span>📍</span>
                      <span>{agenda.tempat}</span>
                    </p>
                  )}
                  {agenda.ringkasan && (
                    <p className="teks-3 text-n-600 mt-2.5 line-clamp-3 leading-relaxed">
                      {agenda.ringkasan}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Blok 3: Berita Terbaru (Maksimal 3 kartu) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="judul-2 text-n-900">Berita Terbaru</h2>
          {daftarBerita.length > 0 && (
            <Link
              href="/berita"
              className="teks-3 text-brand-700 hover:underline min-h-[44px] inline-flex items-center font-medium"
            >
              Semua berita →
            </Link>
          )}
        </div>

        {daftarBerita.length === 0 ? (
          <div className="rounded-token-lg border border-dashed border-n-300 bg-n-0 p-8 text-center">
            <p className="text-n-600">Belum ada berita terbaru yang diterbitkan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {daftarBerita.map((berita) => {
              const urlGambar = urlPublik(berita.gambar_path);

              return (
                <Link
                  key={berita.id}
                  href={`/berita/${berita.slug}`}
                  className="rounded-token-lg border border-n-200 bg-n-0 overflow-hidden flex flex-col hover:border-brand-300 transition-colors shadow-xs group"
                >
                  {urlGambar && (
                    <div className="aspect-video w-full bg-n-100 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={urlGambar}
                        alt={berita.judul}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                      />
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="teks-3 text-n-500 mb-2">
                        {formatTanggal(berita.terbit_pada)}
                      </p>
                      <h3 className="font-semibold text-n-900 text-[16px] leading-snug group-hover:text-brand-700 transition-colors line-clamp-2">
                        {berita.judul}
                      </h3>
                      {berita.ringkasan && (
                        <p className="teks-3 text-n-600 mt-2 line-clamp-3 leading-relaxed">
                          {berita.ringkasan}
                        </p>
                      )}
                    </div>
                    <span className="text-brand-700 font-medium text-[13px] mt-4 inline-flex items-center gap-1">
                      Baca selengkapnya →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Blok 4: Footer (Disediakan oleh kerangka-publik di layout) */}
    </div>
  );
}