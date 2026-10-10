import type { Metadata } from "next";
import Link from "next/link";
import { formatTanggal } from "@/lib/kegiatan";
import {
  agendaTerdekat,
  beritaTerbaru,
  daftarGaleri,
  daftarPengurus,
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

/** Membagi satu hari menjadi potongan tanggal untuk kotak kalender. */
function potonganTanggal(iso: string | null): { hari: string; bulan: string } {
  if (!iso) return { hari: "--", bulan: "---" };
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (Number.isNaN(d.getTime())) return { hari: "--", bulan: "---" };
  return {
    hari: String(d.getDate()).padStart(2, "0"),
    bulan: bulan[d.getMonth()] ?? "---",
  };
}

export default async function BerandaPublik() {
  const [daftarAgenda, daftarBerita, tema, galeri, pengurus] = await Promise.all([
    agendaTerdekat(3),
    beritaTerbaru(3),
    pengaturanSitus(),
    daftarGaleri(),
    daftarPengurus(),
  ]);

  const fotoBeranda = urlPublik(tema.heroFotoPath);
  const misi = (tema.misi ?? "").split("\n").map((m) => m.trim()).filter(Boolean);
  const bidang = [
    { nama: tema.bidang1Nama, isi: tema.bidang1Isi },
    { nama: tema.bidang2Nama, isi: tema.bidang2Isi },
    { nama: tema.bidang3Nama, isi: tema.bidang3Isi },
  ].filter((b) => b.nama);

  // Berita pertama dipakai sebagai berita utama, sisanya sebagai baris ringkas
  const beritaUtama = daftarBerita[0] ?? null;
  const beritaSisa = daftarBerita.slice(1, 3);

  // Foto galeri untuk dinding galeri (maksimal 8).
  // Hanya foto yang punya keterangan ATAU berada di kegiatan yang sudah disetujui
  // akhir yang layak tampil — sisa berkas uji coba tidak ikut.
  const fotoGaleri = galeri
    .flatMap((k) => k.items)
    .filter((f) => f.path && !/foto-uji/i.test(f.path))
    .slice(0, 8);

  // Ketua untuk blok sambutan
  const ketua = pengurus.find((p) => /ketua/i.test(p.jabatan) && !/wakil/i.test(p.jabatan));

  return (
    <div>
      {/* ============ FOTO BESAR (menyentuh tepi penuh) ============ */}
      <section className="relative w-screen left-1/2 -translate-x-1/2 overflow-hidden">
        <div
          className="relative min-h-[380px] sm:min-h-[420px] flex items-center"
          style={{
            backgroundImage: fotoBeranda ? `url(${fotoBeranda})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center 42%",
            backgroundColor: fotoBeranda ? undefined : "var(--dasar-700)",
          }}
        >
          {/* Lapisan gelap supaya tulisan selalu terbaca di atas foto apa pun */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(100deg, color-mix(in srgb, var(--dasar-900) 92%, transparent) 0%, color-mix(in srgb, var(--dasar-900) 74%, transparent) 45%, color-mix(in srgb, var(--dasar-900) 26%, transparent) 100%)",
            }}
          />
          <div className="relative w-full max-w-[1180px] mx-auto px-4 sm:px-6 py-14">
            <div className="max-w-[620px]">
              <p
                className="text-[12.5px] sm:text-[13.5px] font-bold tracking-[0.14em] uppercase mb-4"
                style={{ color: "var(--aksen-300)" }}
              >
                {tema.heroTakbir}
              </p>
              <h1 className="text-[30px] sm:text-[38px] lg:text-[42px] font-extrabold leading-[1.18] text-n-0 tracking-tight">
                {tema.heroJudul}
              </h1>
              <p className="mt-5 text-[15.5px] sm:text-[16.5px] leading-relaxed text-n-200 max-w-[560px]">
                {tema.heroRingkasan}
              </p>
              <div className="mt-8 flex flex-wrap gap-3.5">
                <Link
                  href="/agenda"
                  className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-full font-bold text-[14.5px] transition-transform hover:scale-[1.02] select-none"
                  style={{ backgroundColor: "var(--tombol-600)", color: "var(--tombol-teks)" }}
                >
                  {tema.heroTombol1}
                </Link>
                <Link
                  href="/profil"
                  className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-full font-semibold text-[14.5px] text-n-0 border-2 transition-colors hover:bg-n-0/10 select-none"
                  style={{ borderColor: "color-mix(in srgb, #ffffff 55%, transparent)" }}
                >
                  {tema.heroTombol2}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Isi di bawah foto memakai jarak tepi supaya tidak menempel layar */}
      <div className="max-w-[1180px] mx-auto px-4 sm:px-6">
      {/* ============ SAMBUTAN ============ */}
      <section className="mt-14 sm:mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr] gap-8 lg:gap-14 items-start">
          <div>
            <p
              className="text-[12.5px] font-extrabold tracking-[0.14em] uppercase mb-3.5"
              style={{ color: "var(--aksen-700)" }}
            >
              Sambutan Ketua
            </p>
            <h2 className="text-[26px] sm:text-[32px] font-extrabold leading-[1.22] tracking-tight" style={{ color: "var(--dasar-700)" }}>
              Membangun Kebersamaan, Menghadirkan Karya Nyata
            </h2>
            <div className="mt-5 h-1 w-16 rounded-full" style={{ backgroundColor: "var(--aksen-600)" }} />
          </div>

          <div
            className="rounded-[18px] bg-n-0 p-7 sm:p-9 shadow-xs border-l-4"
            style={{ borderLeftColor: "var(--aksen-600)" }}
          >
            <p className="text-[42px] leading-none font-serif" style={{ color: "var(--aksen-500)" }} aria-hidden="true">
              &ldquo;
            </p>
            <p className="text-[15.5px] sm:text-[16px] leading-[1.85] text-n-800 mt-1.5 mb-6">
              {tema.sambutan}
            </p>
            <div className="flex items-center gap-3.5">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center font-extrabold text-[16px] shrink-0"
                style={{ backgroundColor: "var(--dasar-600)", color: "var(--dasar-teks)" }}
              >
                {(ketua?.nama ?? tema.namaOrganisasi).replace(/^Ny\.\s*/i, "").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-[15.5px]" style={{ color: "var(--dasar-700)" }}>
                  {ketua?.nama ?? "Ketua DWP Kantor GTK Malut"}
                </p>
                <p className="text-[13px] text-n-500 mt-0.5">
                  {ketua?.jabatan ?? "Ketua"} Dharma Wanita Persatuan Kantor GTK Malut
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ VISI & MISI ============ */}
      {(tema.visi || misi.length > 0) && (
        <section className="mt-14 sm:mt-16">
          <div className="text-center max-w-[680px] mx-auto mb-10">
            <h2 className="text-[26px] sm:text-[32px] font-extrabold tracking-tight" style={{ color: "var(--dasar-700)" }}>
              Visi &amp; Misi DWP
            </h2>
            <p className="mt-3 text-[15.5px] text-n-600 leading-relaxed">
              Arah gerak organisasi dalam memperkuat peran perempuan dan keluarga besar pegawai
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {tema.visi && (
              <div
                className="rounded-[18px] p-8 sm:p-10"
                style={{ backgroundColor: "var(--dasar-700)", color: "var(--dasar-teks)" }}
              >
                <h3 className="text-[21px] font-extrabold mb-4" style={{ color: "var(--aksen-300)" }}>
                  Visi
                </h3>
                <p className="text-[15.5px] leading-[1.8] italic opacity-95">{tema.visi}</p>
              </div>
            )}

            {misi.length > 0 && (
              <div
                className="rounded-[18px] p-8 sm:p-10 border"
                style={{ backgroundColor: "var(--halaman)", borderColor: "var(--dasar-100)" }}
              >
                <h3 className="text-[21px] font-extrabold mb-4" style={{ color: "var(--dasar-700)" }}>
                  Misi
                </h3>
                <ol className="space-y-3 pl-5 list-decimal">
                  {misi.map((m, i) => (
                    <li key={i} className="text-[15.5px] leading-[1.75] text-n-800">
                      {m}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============ BIDANG PROGRAM ============ */}
      {bidang.length > 0 && (
        <section className="mt-14 sm:mt-16">
          <div className="text-center mb-10">
            <h2 className="text-[26px] sm:text-[32px] font-extrabold tracking-tight" style={{ color: "var(--dasar-700)" }}>
              Bidang Program Kami
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {bidang.map((b, i) => (
              <div
                key={i}
                className="rounded-[18px] bg-n-0 p-8 shadow-xs border-t-4"
                style={{ borderTopColor: "var(--aksen-600)" }}
              >
                <div
                  className="h-14 w-14 rounded-[14px] flex items-center justify-center text-[24px] mb-5"
                  style={{ backgroundColor: "var(--aksen-50)", color: "var(--aksen-700)" }}
                  aria-hidden="true"
                >
                  {["📚", "🛍️", "🤝"][i] ?? "•"}
                </div>
                <h3 className="text-[18.5px] font-extrabold mb-3" style={{ color: "var(--dasar-700)" }}>
                  {b.nama}
                </h3>
                <p className="text-[14.5px] leading-[1.7] text-n-600">{b.isi}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============ AGENDA & BERITA ============ */}
      <section className="mt-14 sm:mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
          {/* Agenda */}
          <div>
            <div className="flex items-end justify-between gap-4 mb-6">
              <h2 className="text-[24px] font-extrabold" style={{ color: "var(--dasar-700)" }}>
                Agenda Terdekat
              </h2>
              <Link href="/agenda" className="text-[14px] font-bold min-h-[44px] inline-flex items-center" style={{ color: "var(--aksen-700)" }}>
                Semua agenda →
              </Link>
            </div>

            {daftarAgenda.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-n-300 bg-n-0 p-8 text-center">
                <p className="text-n-600">Belum ada agenda kegiatan dalam waktu dekat.</p>
              </div>
            ) : (
              <div>
                {daftarAgenda.map((agenda) => {
                  const tgl = potonganTanggal(agenda.tanggal_mulai);
                  return (
                    <div key={agenda.id} className="flex gap-4 py-4 border-b border-n-100 items-center">
                      <div
                        className="h-[62px] w-[62px] rounded-[14px] flex flex-col items-center justify-center shrink-0"
                        style={{ backgroundColor: "var(--dasar-700)", color: "var(--dasar-teks)" }}
                      >
                        <span className="text-[21px] font-extrabold leading-none">{tgl.hari}</span>
                        <span className="text-[10.5px] uppercase opacity-85 mt-0.5">{tgl.bulan}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15.5px] font-bold leading-snug" style={{ color: "var(--dasar-700)" }}>
                          {agenda.judul}
                        </p>
                        <p className="text-[13px] text-n-500 mt-1">
                          {formatTanggal(agenda.tanggal_mulai)}
                          {agenda.tempat ? ` · ${agenda.tempat}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Berita */}
          <div>
            <div className="flex items-end justify-between gap-4 mb-6">
              <h2 className="text-[24px] font-extrabold" style={{ color: "var(--dasar-700)" }}>
                Berita Terbaru
              </h2>
              <Link href="/berita" className="text-[14px] font-bold min-h-[44px] inline-flex items-center" style={{ color: "var(--aksen-700)" }}>
                Semua berita →
              </Link>
            </div>

            {!beritaUtama ? (
              <div className="rounded-[18px] border border-dashed border-n-300 bg-n-0 p-8 text-center">
                <p className="text-n-600">Belum ada berita terbaru yang diterbitkan.</p>
              </div>
            ) : (
              <div>
                <Link
                  href={`/berita/${beritaUtama.slug}`}
                  className="block rounded-[18px] overflow-hidden bg-n-0 shadow-xs border border-n-200 hover:border-brand-300 transition-colors group"
                >
                  {urlPublik(beritaUtama.gambar_path) && (
                    <div className="h-[190px] w-full overflow-hidden bg-n-100 rounded-t-[18px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={urlPublik(beritaUtama.gambar_path) ?? ""}
                        alt={beritaUtama.judul}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <p className="text-[12.5px] font-bold mb-2" style={{ color: "var(--aksen-700)" }}>
                      {formatTanggal(beritaUtama.terbit_pada)}
                    </p>
                    <h3 className="text-[17px] font-extrabold leading-snug mb-2" style={{ color: "var(--dasar-700)" }}>
                      {beritaUtama.judul}
                    </h3>
                    {beritaUtama.ringkasan && (
                      <p className="text-[14.3px] leading-[1.65] text-n-600 line-clamp-3">
                        {beritaUtama.ringkasan}
                      </p>
                    )}
                  </div>
                </Link>

                {beritaSisa.length > 0 && (
                  <div className="mt-4">
                    {beritaSisa.map((b) => (
                      <Link
                        key={b.id}
                        href={`/berita/${b.slug}`}
                        className="flex gap-4 py-4 border-b border-n-100 items-center hover:bg-n-50 transition-colors"
                      >
                        <div
                          className="h-[62px] w-[62px] rounded-[14px] flex flex-col items-center justify-center shrink-0"
                          style={{ backgroundColor: "var(--dasar-50)", color: "var(--dasar-700)" }}
                        >
                          <span className="text-[15px] font-extrabold leading-none">
                            {potonganTanggal(b.terbit_pada).hari}
                          </span>
                          <span className="text-[10px] uppercase mt-0.5">{potonganTanggal(b.terbit_pada).bulan}</span>
                        </div>
                        <p className="text-[14.5px] font-semibold leading-snug" style={{ color: "var(--dasar-700)" }}>
                          {b.judul}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============ GALERI ============ */}
      {true && (
        <section
          className="mt-14 sm:mt-16 rounded-[18px] px-6 sm:px-10 lg:px-14 py-14"
          style={{ backgroundColor: "var(--dasar-800)" }}
        >
          <div className="text-center mb-9">
            <h2 className="text-[26px] sm:text-[30px] font-extrabold text-n-0">Galeri Kegiatan</h2>
            <p className="mt-3 text-[15px]" style={{ color: "var(--dasar-200)" }}>
              Dokumentasi kegiatan Dharma Wanita Persatuan Kantor GTK Malut
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Kotak pelengkap supaya jumlahnya selalu 4 seperti tampilan acuan */}
            {Array.from({ length: Math.max(0, 4 - fotoGaleri.length) }).map((_, i) => (
              <div
                key={`kosong-${i}`}
                className="h-[200px] rounded-[18px] flex flex-col items-center justify-center gap-2 text-[13px]"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--dasar-600) 55%, #ffffff)",
                  color: "var(--dasar-900)",
                }}
              >
                <span className="text-[26px]" aria-hidden="true">🖼️</span>
                <span className="font-medium">Dokumentasi menyusul</span>
              </div>
            ))}
            {fotoGaleri.map((f) => (
              <Link
                key={f.id}
                href="/galeri"
                className="block h-[200px] rounded-[18px] overflow-hidden bg-n-0/10 hover:opacity-90 transition-opacity"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urlPublik(f.path) ?? ""}
                  alt={f.keterangan ?? "Foto kegiatan DWP"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </Link>
            ))}
          </div>

          <div className="text-center mt-9">
            <Link
              href="/galeri"
              className="inline-flex items-center justify-center min-h-[46px] px-7 rounded-full font-semibold text-[14.5px] border-2 text-n-0 hover:bg-n-0/10 transition-colors"
              style={{ borderColor: "color-mix(in srgb, #ffffff 45%, transparent)" }}
            >
              Lihat semua galeri
            </Link>
          </div>
        </section>
      )}
      </div>
    </div>
  );
}
