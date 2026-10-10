import type { Metadata } from "next";
import Link from "next/link";
import { formatTanggal } from "@/lib/kegiatan";
import { daftarBerita, pengaturanSitus, urlPublik } from "@/lib/publik";

export async function generateMetadata(): Promise<Metadata> {
  const tema = await pengaturanSitus();
  return {
    title: "Berita",
    description: tema.subJudulBerita ?? undefined,
  };
}

export default async function HalamanBerita() {
  const [beritaList, tema] = await Promise.all([daftarBerita(), pengaturanSitus()]);

  const utama = beritaList[0] ?? null;
  const sisanya = beritaList.slice(1);

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
          Kabar Terbaru
        </p>
        <h1 className="text-[30px] sm:text-[38px] font-extrabold leading-tight tracking-tight">
          Berita &amp; Informasi
        </h1>
        <p className="mt-4 text-[15.5px] sm:text-[16.5px] leading-relaxed opacity-90 max-w-[620px]">
          {tema.subJudulBerita}
        </p>
      </header>

      {beritaList.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-n-300 bg-n-0 p-10 text-center">
          <p className="text-n-600">Belum ada berita yang dipublikasikan.</p>
        </div>
      ) : (
        <>
          {/* ============ BERITA UTAMA ============ */}
          {utama && (
            <Link
              href={`/berita/${utama.slug}`}
              className="block rounded-[18px] overflow-hidden bg-n-0 shadow-xs group"
              style={{ border: "1px solid var(--n-200)" }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2">
                {urlPublik(utama.gambar_path) ? (
                  <div className="h-[240px] lg:h-full min-h-[260px] overflow-hidden bg-n-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={urlPublik(utama.gambar_path) ?? ""}
                      alt={utama.judul}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div
                    className="h-[240px] lg:h-full min-h-[260px] flex items-center justify-center text-[15px]"
                    style={{ backgroundColor: "var(--halaman)", color: "var(--dasar-600)" }}
                  >
                    DWP GTK Malut
                  </div>
                )}

                <div className="p-7 sm:p-9 flex flex-col justify-center">
                  <span
                    className="inline-flex w-fit items-center px-3 py-1 rounded-full text-[11.5px] font-bold uppercase tracking-wide mb-4"
                    style={{ backgroundColor: "var(--aksen-50)", color: "var(--aksen-700)" }}
                  >
                    Berita Utama
                  </span>
                  <p className="text-[13px] font-semibold mb-2.5" style={{ color: "var(--aksen-700)" }}>
                    {formatTanggal(utama.terbit_pada)}
                  </p>
                  <h2
                    className="text-[21px] sm:text-[25px] font-extrabold leading-snug"
                    style={{ color: "var(--dasar-700)" }}
                  >
                    {utama.judul}
                  </h2>
                  {utama.ringkasan && (
                    <p className="text-[15px] text-n-600 mt-4 leading-[1.75] line-clamp-4">
                      {utama.ringkasan}
                    </p>
                  )}
                  <span
                    className="mt-6 text-[14.5px] font-bold inline-flex items-center gap-1.5"
                    style={{ color: "var(--aksen-700)" }}
                  >
                    Baca selengkapnya →
                  </span>
                </div>
              </div>
            </Link>
          )}

          {/* ============ DAFTAR BERITA LAIN ============ */}
          {sisanya.length > 0 && (
            <section>
              <h2 className="text-[22px] sm:text-[25px] font-extrabold mb-6" style={{ color: "var(--dasar-700)" }}>
                Berita Lainnya
                <span className="ml-2.5 text-[14px] font-semibold text-n-500">({sisanya.length})</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {sisanya.map((berita) => {
                  const gambar = urlPublik(berita.gambar_path);
                  return (
                    <Link
                      key={berita.id}
                      href={`/berita/${berita.slug}`}
                      className="rounded-[18px] bg-n-0 overflow-hidden flex flex-col shadow-xs group hover:-translate-y-0.5 transition-transform"
                      style={{ border: "1px solid var(--n-200)" }}
                    >
                      {gambar ? (
                        <div className="h-[180px] w-full overflow-hidden bg-n-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={gambar}
                            alt={berita.judul}
                            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div
                          className="h-[180px] w-full flex items-center justify-center text-[14px]"
                          style={{ backgroundColor: "var(--halaman)", color: "var(--dasar-600)" }}
                        >
                          DWP GTK Malut
                        </div>
                      )}

                      <div className="p-6 flex-1 flex flex-col">
                        <p className="text-[12.5px] font-bold mb-2" style={{ color: "var(--aksen-700)" }}>
                          {formatTanggal(berita.terbit_pada)}
                        </p>
                        <h3
                          className="font-extrabold text-[16px] leading-snug line-clamp-2"
                          style={{ color: "var(--dasar-700)" }}
                        >
                          {berita.judul}
                        </h3>
                        {berita.ringkasan && (
                          <p className="text-[14px] text-n-600 mt-2.5 line-clamp-3 leading-[1.7]">
                            {berita.ringkasan}
                          </p>
                        )}
                        <span
                          className="mt-auto pt-4 text-[13.5px] font-bold inline-flex items-center gap-1.5"
                          style={{ color: "var(--aksen-700)" }}
                        >
                          Baca selengkapnya →
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
