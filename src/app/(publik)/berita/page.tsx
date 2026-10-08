import type { Metadata } from "next";
import Link from "next/link";
import { formatTanggal } from "@/lib/kegiatan";
import { daftarBerita, urlPublik } from "@/lib/publik";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Berita",
    description: "Kumpulan warta dan dokumentasi kegiatan DWP Kantor GTK Provinsi Maluku Utara",
  };
}

export default async function HalamanBerita() {
  const beritaList = await daftarBerita();

  return (
    <div className="space-y-6">
      <header className="border-b border-n-200 pb-5">
        <h1 className="judul-1 text-n-900">Berita & Informasi</h1>
        <p className="teks-3 text-n-600 mt-1.5">
          Kabar terbaru seputar program, kegiatan, dan liputan DWP Kantor GTK Malut.
        </p>
      </header>

      {beritaList.length === 0 ? (
        <div className="rounded-token-lg border border-dashed border-n-300 bg-n-0 p-10 text-center">
          <p className="text-n-600">Belum ada berita yang dipublikasikan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {beritaList.map((berita) => {
            const gambar = urlPublik(berita.gambar_path);

            return (
              <Link
                key={berita.id}
                href={`/berita/${berita.slug}`}
                className="rounded-token-lg border border-n-200 bg-n-0 overflow-hidden flex flex-col hover:border-brand-300 transition-colors shadow-xs group"
              >
                {gambar ? (
                  <div className="aspect-video w-full bg-n-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gambar}
                      alt={berita.judul}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-n-100 flex items-center justify-center text-n-400 teks-3">
                    DWP GTK Malut
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="teks-3 text-n-500 mb-2">
                      {formatTanggal(berita.terbit_pada)}
                    </p>
                    <h2 className="font-semibold text-n-900 text-[16px] leading-snug group-hover:text-brand-700 transition-colors line-clamp-2">
                      {berita.judul}
                    </h2>
                    {berita.ringkasan && (
                      <p className="teks-3 text-n-600 mt-2.5 line-clamp-3 leading-relaxed">
                        {berita.ringkasan}
                      </p>
                    )}
                  </div>

                  <span className="text-brand-700 font-medium text-[13px] mt-4 min-h-[44px] inline-flex items-center gap-1">
                    Baca selengkapnya →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
