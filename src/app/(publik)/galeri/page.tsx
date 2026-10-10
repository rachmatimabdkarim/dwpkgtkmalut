import type { Metadata } from "next";
import { daftarBerita, daftarGaleri, pengaturanSitus, urlPublik } from "@/lib/publik";


export async function generateMetadata(): Promise<Metadata> {
  const tema = await pengaturanSitus();
  return { title: "Galeri", description: tema.subJudulGaleri ?? undefined };
}

export default async function HalamanGaleri() {
  const [kelompokGaleri, beritaList, tema] = await Promise.all([
    daftarGaleri(),
    daftarBerita(),
    pengaturanSitus(),
  ]);

  // Kumpulkan foto yang sudah dipakai di berita agar tidak berulang
  const pathFotoBerita = new Set(
    beritaList
      .map((b) => b.gambar_path)
      .filter((p): p is string => Boolean(p)),
  );

  // Saring galeri: jangan mengulang foto yang sudah ada di berita
  const galeriBersih = kelompokGaleri
    .map((album) => ({
      ...album,
      items: album.items.filter((item) => !pathFotoBerita.has(item.path)),
    }))
    .filter((album) => album.items.length > 0);

  return (
    <div className="space-y-8">
      <header className="border-b border-n-200 pb-5">
        <h1 className="judul-1 text-n-900">Galeri Foto Kegiatan</h1>
        <p className="teks-3 text-n-600 mt-1.5">
          {tema.subJudulGaleri}
        </p>
      </header>

      {galeriBersih.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-n-300 bg-n-0 p-10 text-center">
          <p className="text-n-600">Belum ada foto dokumentasi di galeri.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {galeriBersih.map((album, idx) => (
            <section
              key={album.activity_id}
              className="rounded-[18px] border border-n-200 bg-n-0 p-5 sm:p-6 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-n-100 pb-3">
                <h2 className="judul-2 text-n-800">
                  Album Kegiatan {idx + 1}
                </h2>
                <span className="teks-3 text-n-500">
                  {album.items.length} foto
                </span>
              </div>

              {/* Grid Thumbnail Gambar Kecil */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {album.items.map((item) => {
                  const url = urlPublik(item.path);

                  return (
                    <div
                      key={item.id}
                      className="group flex flex-col rounded-token overflow-hidden border border-n-200 bg-n-50"
                    >
                      <div className="aspect-square w-full overflow-hidden bg-n-100 relative">
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={url}
                            alt={item.keterangan || "Dokumentasi kegiatan"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-n-400 teks-3">
                            Foto
                          </div>
                        )}
                      </div>
                      {item.keterangan && (
                        <p className="p-2 teks-3 text-n-700 bg-n-0 border-t border-n-100 line-clamp-2 leading-tight">
                          {item.keterangan}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
