import type { Metadata } from "next";
import { daftarPengurus, pengaturanSitus } from "@/lib/publik";

export async function generateMetadata(): Promise<Metadata> {
  const tema = await pengaturanSitus();
  return {
    title: "Profil",
    description: `Profil organisasi dan susunan pengurus ${tema.namaOrganisasi}`,
  };
}

export default async function HalamanProfil() {
  const [pengurusList, tema] = await Promise.all([daftarPengurus(), pengaturanSitus()]);

  const kelompokBidang: { bidang: string; anggota: typeof pengurusList }[] = [];
  const bidangDitemukan = new Set<string>();

  for (const orang of pengurusList) {
    if (!bidangDitemukan.has(orang.bidang)) {
      bidangDitemukan.add(orang.bidang);
      kelompokBidang.push({
        bidang: orang.bidang,
        anggota: pengurusList.filter((p) => p.bidang === orang.bidang),
      });
    }
  }

  const misi = (tema.misi ?? "").split("\n").map((m) => m.trim()).filter(Boolean);
  const ketua = pengurusList.find((p) => /ketua/i.test(p.jabatan) && !/wakil/i.test(p.jabatan));

  return (
    <div className="space-y-12">
      {/* ============ KEPALA HALAMAN ============ */}
      <header
        className="rounded-[18px] px-6 sm:px-10 py-10 sm:py-12"
        style={{ backgroundColor: "var(--dasar-700)", color: "var(--dasar-teks)" }}
      >
        <p
          className="text-[12.5px] font-bold tracking-[0.14em] uppercase mb-3"
          style={{ color: "var(--aksen-300)" }}
        >
          Tentang Kami
        </p>
        <h1 className="text-[30px] sm:text-[38px] font-extrabold leading-tight tracking-tight">
          Profil Organisasi
        </h1>
        <p className="mt-4 text-[15.5px] sm:text-[16.5px] leading-relaxed opacity-90 max-w-[640px]">
          Mengenal lebih dekat {tema.namaOrganisasi}.
        </p>
      </header>

      {/* ============ PROFIL SINGKAT ============ */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 items-start">
        <div className="space-y-4 text-[15.5px] sm:text-[16px] leading-[1.85] text-n-800">
          {(tema.profilSingkat ?? "").split("\n").filter(Boolean).map((par, i) => (
            <p key={i}>{par}</p>
          ))}
        </div>

        {ketua && (
          <div
            className="rounded-[18px] p-7 text-center"
            style={{ backgroundColor: "var(--halaman)", border: "1px solid var(--dasar-100)" }}
          >
            <div
              className="h-20 w-20 rounded-full mx-auto flex items-center justify-center font-extrabold text-[24px] mb-4"
              style={{ backgroundColor: "var(--dasar-700)", color: "var(--dasar-teks)" }}
            >
              {ketua.nama.replace(/^Ny\.\s*/i, "").slice(0, 2).toUpperCase()}
            </div>
            <p className="text-[12.5px] font-bold tracking-[0.12em] uppercase mb-2" style={{ color: "var(--aksen-700)" }}>
              Ketua
            </p>
            <p className="text-[17px] font-extrabold leading-snug" style={{ color: "var(--dasar-700)" }}>
              {ketua.nama}
            </p>
            <p className="text-[13.5px] text-n-600 mt-1.5">
              Dharma Wanita Persatuan Kantor GTK Malut
            </p>
          </div>
        )}
      </section>

      {/* ============ VISI & MISI ============ */}
      {(tema.visi || misi.length > 0) && (
        <section>
          <h2 className="text-[24px] sm:text-[28px] font-extrabold mb-8" style={{ color: "var(--dasar-700)" }}>
            Visi &amp; Misi
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {tema.visi && (
              <div
                className="rounded-[18px] p-8 sm:p-10"
                style={{ backgroundColor: "var(--dasar-700)", color: "var(--dasar-teks)" }}
              >
                <h3 className="text-[20px] font-extrabold mb-4" style={{ color: "var(--aksen-300)" }}>
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
                <h3 className="text-[20px] font-extrabold mb-4" style={{ color: "var(--dasar-700)" }}>
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

      {/* ============ SUSUNAN PENGURUS ============ */}
      <section>
        <div className="mb-7">
          <h2 className="text-[24px] sm:text-[28px] font-extrabold" style={{ color: "var(--dasar-700)" }}>
            Susunan Pengurus
          </h2>
          <p className="mt-2 text-[15px] text-n-600">
            Struktur kepengurusan DWP Kantor GTK Provinsi Maluku Utara masa bakti berjalan.
          </p>
        </div>

        {kelompokBidang.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-n-300 bg-n-0 p-8 text-center">
            <p className="text-n-600">Data susunan pengurus belum tersedia.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {kelompokBidang.map(({ bidang, anggota }) => (
              <div
                key={bidang}
                className="rounded-[18px] bg-n-0 overflow-hidden shadow-xs border-t-4"
                style={{ borderTopColor: "var(--aksen-600)", border: "1px solid var(--n-200)" }}
              >
                <div
                  className="px-6 py-3.5"
                  style={{ backgroundColor: "var(--halaman)", borderBottom: "1px solid var(--dasar-100)" }}
                >
                  <h3 className="font-extrabold text-[15.5px]" style={{ color: "var(--dasar-700)" }}>
                    {bidang}
                  </h3>
                </div>

                <div className="divide-y divide-n-100">
                  {anggota.map((orang) => {
                    const inisial = orang.nama.replace(/^Ny\.\s*/i, "").slice(0, 1).toUpperCase();
                    return (
                      <div
                        key={`${orang.bidang}-${orang.nama}`}
                        className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className="h-11 w-11 rounded-full font-extrabold text-[15px] flex items-center justify-center shrink-0"
                            style={{ backgroundColor: "var(--dasar-50)", color: "var(--dasar-700)" }}
                          >
                            {inisial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[15px] truncate" style={{ color: "var(--dasar-700)" }}>
                              {orang.nama}
                            </p>
                            <p className="text-[13px] text-n-500 truncate">{orang.jabatan}</p>
                          </div>
                        </div>

                        {orang.email && (
                          <a
                            href={`mailto:${orang.email}`}
                            className="inline-flex items-center gap-1.5 min-h-[44px] text-[13px] font-medium hover:underline transition-colors truncate"
                            style={{ color: "var(--aksen-700)" }}
                            title={`Kirim email ke ${orang.nama}`}
                          >
                            <span aria-hidden="true">✉</span>
                            <span className="truncate">{orang.email}</span>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
