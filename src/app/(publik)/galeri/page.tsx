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

  // Jangan tampilkan berkas uji coba, dan jangan ulangi foto yang sudah ada di berita
  const pathFotoBerita = new Set(
    beritaList.map((b) => b.gambar_path).filter((p): p is string => Boolean(p)),
  );

  const galeriBersih = kelompokGaleri
    .map((album) => ({
      ...album,
      items: album.items.filter(
        (item) =>
          !pathFotoBerita.has(item.path) &&
          // Buang hanya berkas yang benar-benar ditandai uji; jangan menyaring
          // dari nama berkas, karena foto kegiatan asli bisa bernama demikian.
          !/\buji\b/i.test(item.keterangan ?? ""),
      ),
    }))
    .filter((album) => album.items.length > 0);

  const jumlahFoto = galeriBersih.reduce((n, a) => n + a.items.length, 0);

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
          Dokumentasi
        </p>
        <h1 className="text-[30px] sm:text-[38px] font-extrabold leading-tight tracking-tight">
          Galeri Foto Kegiatan
        </h1>
        <p className="mt-4 text-[15.5px] sm:text-[16.5px] leading-relaxed opacity-90 max-w-[620px]">
          {tema.subJudulGaleri}
        </p>
        {jumlahFoto > 0 && (
          <p className="mt-5 text-[13.5px] font-semibold" style={{ color: "var(--aksen-300)" }}>
            {jumlahFoto} foto dalam {galeriBersih.length} album
          </p>
        )}
      </header>

      {galeriBersih.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-n-300 bg-n-0 p-10 text-center space-y-2">
          <p className="text-[28px]" aria-hidden="true">🖼️</p>
          <p className="text-n-600">Belum ada foto dokumentasi di galeri.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {galeriBersih.map((album) => (
            <section key={album.activity_id}>
              <div className="flex items-start sm:items-end justify-between gap-4 mb-5 flex-wrap">
                <div className="min-w-0">
                  {/* Nama album memakai nama kegiatan asalnya, bukan nomor urut,
                      supaya pengunjung tahu ini dokumentasi kegiatan yang mana. */}
                  <h2
                    className="text-[21px] sm:text-[24px] font-extrabold leading-snug"
                    style={{ color: "var(--dasar-700)" }}
                  >
                    {album.judul ?? "Dokumentasi Kegiatan"}
                  </h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {album.kode && (
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-bold tracking-wide"
                        style={{ backgroundColor: "var(--aksen-50)", color: "var(--aksen-700)" }}
                      >
                        {album.kode}
                      </span>
                    )}
                    {album.tanggal && (
                      <span className="text-[13px] text-n-500">
                        {new Date(album.tanggal + "T00:00:00").toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[13.5px] font-semibold text-n-500 shrink-0">
                  {album.items.length} foto
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {album.items.map((item) => {
                  const url = urlPublik(item.path);
                  return (
                    <div
                      key={item.id}
                      className="group rounded-[18px] overflow-hidden bg-n-0 shadow-xs"
                      style={{ border: "1px solid var(--n-200)" }}
                    >
                      <div className="aspect-square w-full overflow-hidden bg-n-100">
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={url}
                            alt={item.keterangan || "Dokumentasi kegiatan DWP"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-n-400 text-[13px]">
                            Foto
                          </div>
                        )}
                      </div>
                      {item.keterangan && (
                        <p
                          className="px-4 py-3 text-[13.5px] leading-snug line-clamp-2"
                          style={{ color: "var(--dasar-700)", borderTop: "1px solid var(--n-100)" }}
                        >
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
