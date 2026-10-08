"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LambangTeks } from "@/components/ikon";
import { JudulAplikasi } from "@/components/judul-aplikasi";
import { MENU_PUBLIK } from "@/lib/peran";
import type { TemaSitus } from "@/lib/tema";

export function KerangkaPublik({
  tema,
  children,
}: {
  tema: TemaSitus;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh flex flex-col bg-n-50 text-n-800">
      {/* Header Publik */}
      <header className="sticky top-0 z-40 bg-n-0 border-b border-n-200">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Logo & Judul Organisasi */}
            <Link
              href="/"
              className="flex items-center gap-3 min-h-[44px] py-1 select-none focus:outline-none"
              aria-label="Kembali ke Beranda"
            >
              {tema.logoUrl ? (
                <Image
                  src={tema.logoUrl}
                  alt={`Logo ${tema.namaAplikasi}`}
                  width={36}
                  height={36}
                  unoptimized
                  className="h-9 w-9 object-contain rounded-token shrink-0"
                />
              ) : (
                <LambangTeks teks="DWP" ukuran={38} />
              )}
              <JudulAplikasi baris1={tema.namaAplikasi} baris2={tema.namaUnit} />
            </Link>

            {/* Menu Navigasi Desktop */}
            <nav className="hidden sm:flex items-center gap-1" aria-label="Navigasi Utama">
              {MENU_PUBLIK.map((item) => {
                const aktif =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-3.5 min-h-[44px] rounded-token text-[14px] transition-colors ${
                      aktif
                        ? "bg-brand-50 text-brand-700 font-semibold"
                        : "text-n-700 hover:text-n-900 hover:bg-n-100 font-medium"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Baris Menu HP: digeser mendatar */}
          <nav
            className="sm:hidden flex items-center gap-1.5 overflow-x-auto py-2 border-t border-n-100 scrollbar-none"
            aria-label="Navigasi Ponsel"
          >
            {MENU_PUBLIK.map((item) => {
              const aktif =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 inline-flex items-center justify-center px-3.5 min-h-[44px] rounded-token text-[13px] transition-colors ${
                    aktif
                      ? "bg-brand-50 text-brand-700 font-semibold border border-brand-200"
                      : "text-n-700 bg-n-50 border border-n-200 hover:bg-n-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Konten Halaman */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">{children}</main>

      {/* Footer Publik */}
      <footer className="bg-n-900 text-n-300 border-t border-n-800">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Identitas Organisasi */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                {tema.logoUrl ? (
                  <Image
                    src={tema.logoUrl}
                    alt={`Logo ${tema.namaAplikasi}`}
                    width={32}
                    height={32}
                    unoptimized
                    className="h-8 w-8 object-contain rounded-token shrink-0"
                  />
                ) : (
                  <LambangTeks teks="DWP" ukuran={32} />
                )}
                <span className="font-semibold text-n-0 text-[15px]">
                  {tema.namaOrganisasi}
                </span>
              </div>
              <p className="teks-3 text-n-400 leading-relaxed">
                Wadah silaturahmi, kebersamaan, dan pengabdian bagi peningkatan kualitas
                keluarga pendidik dan tenaga kependidikan Maluku Utara.
              </p>
            </div>

            {/* Kontak & Alamat */}
            <div className="space-y-2 text-[14px]">
              <h3 className="text-n-0 font-medium mb-3">Sekretariat</h3>
              <p className="text-n-300">
                {tema.alamat || "Jl. Ki Hajar Dewantara, Kota Ternate, Provinsi Maluku Utara"}
              </p>
              {tema.telepon && (
                <p className="text-n-400">
                  Telepon:{" "}
                  <a
                    href={`tel:${tema.telepon.replace(/[^0-9+]/g, "")}`}
                    className="text-n-200 hover:underline min-h-[44px] inline-flex items-center"
                  >
                    {tema.telepon}
                  </a>
                </p>
              )}
              {tema.email && (
                <p className="text-n-400">
                  Email:{" "}
                  <a
                    href={`mailto:${tema.email}`}
                    className="text-n-200 hover:underline min-h-[44px] inline-flex items-center"
                  >
                    {tema.email}
                  </a>
                </p>
              )}
            </div>

            {/* Tautan Tambahan (Unduhan, Kontak, Masuk Pengurus) */}
            <div className="space-y-3">
              <h3 className="text-n-0 font-medium">Informasi & Layanan</h3>
              <ul className="space-y-1.5 text-[14px]">
                <li>
                  <a
                    href="#unduhan"
                    className="text-n-300 hover:text-n-0 min-h-[44px] inline-flex items-center transition-colors"
                  >
                    Unduhan Dokumen
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:dwp.gtkmalut@kemdikbud.go.id?subject=Pertanyaan%20Publik%20DWP%20GTK%20Malut"
                    className="text-n-300 hover:text-n-0 min-h-[44px] inline-flex items-center transition-colors"
                  >
                    Hubungi Kami (Kontak)
                  </a>
                </li>
                <li className="pt-2 border-t border-n-800">
                  <Link
                    href="/masuk"
                    className="text-[13px] text-n-400 hover:text-n-100 min-h-[44px] inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>Masuk pengurus</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-n-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left teks-3 text-n-500">
            <p>© {new Date().getFullYear()} {tema.namaAplikasi} {tema.namaUnit}. Hak cipta dilindungi.</p>
            <p>Dharma Wanita Persatuan Kantor GTK Provinsi Maluku Utara</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
