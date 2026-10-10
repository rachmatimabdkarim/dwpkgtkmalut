import type { Metadata } from "next";
import { pengaturanSitus } from "@/lib/publik";
import { FormKontak } from "./form-kontak";


export async function generateMetadata(): Promise<Metadata> {
  const tema = await pengaturanSitus();
  return {
    title: "Kontak",
    description: `Alamat, telepon, surel, dan formulir pesan ${tema.namaOrganisasi}`,
  };
}

export default async function HalamanKontak() {
  const tema = await pengaturanSitus();

  // Peta lokasi: memakai titik dari pengaturan. Peta memakai Google Maps.
  const lat = tema.lat ?? null;
  const bujur = tema.bujur ?? null;
  const zum = tema.zoom ?? 17;
  const peta =
    lat !== null && bujur !== null
      ? `https://maps.google.com/maps?q=${lat},${bujur}&z=${zum}&hl=id&output=embed`
      : null;

  return (
    <div className="space-y-10">
      <header className="border-b border-n-200 pb-5">
        <h1 className="judul-1 text-n-900">Hubungi Kami</h1>
        <p className="teks-3 text-n-600 mt-1.5">
          Sampaikan pertanyaan, saran, atau permintaan informasi kepada pengurus DWP.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ---- Kiri: alamat & peta ---- */}
        <div className="space-y-6">
          <section className="rounded-[18px] border border-n-200 bg-n-0 p-6 shadow-xs space-y-4">
            <h2 className="judul-2 text-n-900">Sekretariat</h2>

            <div className="space-y-3 text-[15px] text-n-800">
              <div className="flex gap-3">
                <span className="text-n-400 shrink-0" aria-hidden="true">📍</span>
                <span>{tema.alamat}</span>
              </div>
              {tema.telepon && (
                <div className="flex gap-3">
                  <span className="text-n-400 shrink-0" aria-hidden="true">📞</span>
                  <a
                    href={`tel:${tema.telepon.replace(/[^0-9+]/g, "")}`}
                    className="text-brand-700 hover:underline"
                  >
                    {tema.telepon}
                  </a>
                </div>
              )}
              {tema.email && (
                <div className="flex gap-3">
                  <span className="text-n-400 shrink-0" aria-hidden="true">✉️</span>
                  <a href={`mailto:${tema.email}`} className="text-brand-700 hover:underline break-all">
                    {tema.email}
                  </a>
                </div>
              )}
            </div>
          </section>

          {peta && (
            <section className="rounded-[18px] border border-n-200 overflow-hidden bg-n-50">
              <iframe
                title="Peta lokasi kantor"
                src={peta}
                className="w-full h-[320px] border-0"
                loading="lazy"
              />
            </section>
          )}
        </div>

        {/* ---- Kanan: form pesan ---- */}
        <section className="rounded-[18px] border border-n-200 bg-n-0 p-6 shadow-xs">
          <h2 className="judul-2 text-n-900 mb-1">Kirim Pesan</h2>
          <p className="teks-3 text-n-500 mb-5">
            Pesan Anda diterima pengurus dan akan ditindaklanjuti.
          </p>
          <FormKontak />
        </section>
      </div>
    </div>
  );
}
