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

  // Kelompokkan pengurus per bidang, menjaga urutan bidang berdasarkan urutan anggota pertama
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

  return (
    <div className="space-y-10">
      {/* Seksi 1: Profil Singkat Organisasi */}
      <section className="space-y-4">
        <header className="border-b border-n-200 pb-5">
          <h1 className="judul-1 text-n-900">Profil Organisasi</h1>
          <p className="teks-3 text-n-600 mt-1.5">Mengenal lebih dekat {tema.namaOrganisasi}.</p>
        </header>

        <div className="rounded-[18px] border border-n-200 bg-n-0 p-6 sm:p-8 shadow-xs space-y-4 text-n-800 text-[15px] sm:text-[16px] leading-relaxed">
          {(tema.profilSingkat ?? "").split("\n").filter(Boolean).map((par, i) => (
            <p key={i}>{par}</p>
          ))}
        </div>
      </section>

      {/* Seksi 2: Susunan Pengurus */}
      <section className="space-y-6">
        <div>
          <h2 className="judul-2 text-n-900">Susunan Pengurus</h2>
          <p className="teks-3 text-n-600 mt-1">
            Struktur kepengurusan DWP Kantor GTK Provinsi Maluku Utara masa bakti berjalan.
          </p>
        </div>

        {kelompokBidang.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-n-300 bg-n-0 p-8 text-center">
            <p className="text-n-600">Data susunan pengurus belum tersedia.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {kelompokBidang.map(({ bidang, anggota }) => (
              <div
                key={bidang}
                className="rounded-[18px] border border-n-200 bg-n-0 overflow-hidden shadow-xs"
              >
                <div className="bg-n-50 border-b border-n-200 px-5 py-3">
                  <h3 className="font-semibold text-n-900 text-[15px]">{bidang}</h3>
                </div>

                <div className="divide-y divide-n-100">
                  {anggota.map((orang) => {
                    const inisial = orang.nama
                      .replace(/^Ny\.\s*/i, "")
                      .slice(0, 1)
                      .toUpperCase();

                    return (
                      <div
                        key={`${orang.bidang}-${orang.nama}`}
                        className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-full bg-brand-50 text-brand-700 font-semibold text-[14px] flex items-center justify-center shrink-0 border border-brand-200">
                            {inisial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-n-900 text-[15px] truncate">
                              {orang.nama}
                            </p>
                            <p className="teks-3 text-n-500 truncate">{orang.jabatan}</p>
                          </div>
                        </div>

                        {/* Tautan Email (Wajib ditampilkan dan dapat diklik) */}
                        <div className="pl-13 sm:pl-0">
                          {orang.email ? (
                            <a
                              href={`mailto:${orang.email}`}
                              className="inline-flex items-center gap-1.5 min-h-[44px] py-1 text-[13px] text-brand-700 hover:text-brand-800 hover:underline transition-colors"
                              title={`Kirim email ke ${orang.nama}`}
                            >
                              <span aria-hidden="true">✉</span>
                              <span>{orang.email}</span>
                            </a>
                          ) : (
                            <span className="text-[13px] text-n-400 italic min-h-[44px] inline-flex items-center">
                              Email belum tersedia
                            </span>
                          )}
                        </div>
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
