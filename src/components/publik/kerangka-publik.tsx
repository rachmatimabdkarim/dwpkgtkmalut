"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
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
  // Tahun hak cipta dihitung SETELAH halaman tampil di peramban.
  // Kalau dihitung saat halaman dibuat, singgahan tidak boleh dipakai.
  const [tahunIni, setTahunIni] = useState<number | null>(null);
  useEffect(() => setTahunIni(new Date().getFullYear()), []);

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
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tema.logoUrl}
                  alt={`Logo ${tema.namaAplikasi}`}
                  className="h-9 w-9 object-contain rounded-token shrink-0"
                />
              ) : (
                <LambangTeks teks="DWP" ukuran={38} />
              )}
              <JudulAplikasi baris1={tema.namaAplikasi} baris2={tema.namaUnit} />
            </Link>

            {/* Menu Navigasi Desktop */}
            <Suspense fallback={<MenuKerangkaDesktop />}>
              <MenuPilihDesktop />
            </Suspense>
          </div>

          {/* Baris Menu HP: kelima menu dimuat rata, tanpa perlu digeser */}
          <Suspense fallback={<MenuKerangkaHP />}>
            <MenuPilihHP />
          </Suspense>
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
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tema.logoUrl}
                    alt={`Logo ${tema.namaAplikasi}`}
                    className="h-8 w-8 object-contain rounded-token shrink-0"
                  />
                ) : (
                  <LambangTeks teks="DWP" ukuran={32} />
                )}
                <span className="font-semibold text-n-0 text-[15px]">
                  {tema.namaOrganisasi}
                </span>
              </div>
              {tema.sambutan && (
                <p className="teks-3 text-n-400 leading-relaxed">{tema.sambutan}</p>
              )}
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
                  <Link
                    href="/unduhan"
                    className="text-n-300 hover:text-n-0 min-h-[44px] inline-flex items-center transition-colors"
                  >
                    Unduhan Dokumen
                  </Link>
                </li>
                <li>
                  <Link
                    href="/kontak"
                    className="text-n-300 hover:text-n-0 min-h-[44px] inline-flex items-center transition-colors"
                  >
                    Kontak
                  </Link>
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
            <p>© {tahunIni ?? ""} {tema.namaAplikasi} {tema.namaUnit}. Hak cipta dilindungi.</p>
            {tema.namaOrganisasi && <p>{tema.namaOrganisasi}</p>}
          </div>
        </div>
      </footer>
    </div>
  );
}


/**
 * Menu navigasi dipisah ke komponen sendiri dan dibungkus batas tunggu.
 * Alasan: penanda menu aktif memakai alamat halaman (usePathname) yang
 * membuat halaman tidak boleh disinggahkan. Dengan dipisah, sisa halaman
 * tetap bisa cepat disinggahkan sementara menu menyusul sekejap.
 */
function kelasDesktop(aktif: boolean) {
  return `inline-flex items-center px-3.5 min-h-[44px] rounded-token text-[14px] transition-colors ${
    aktif
      ? "bg-brand-50 text-brand-700 font-semibold"
      : "text-n-700 hover:text-n-900 hover:bg-n-100 font-medium"
  }`;
}

function kelasHP(aktif: boolean) {
  return `min-w-0 inline-flex items-center justify-center px-1.5 min-h-[44px] rounded-token text-[12.5px] transition-colors ${
    aktif
      ? "bg-brand-50 text-brand-700 font-semibold border border-brand-200"
      : "text-n-700 bg-n-50 border border-n-200 hover:bg-n-100"
  }`;
}

/** Tampilan menu sebelum penanda aktif siap — bentuk sama, tanpa penyorotan. */
function MenuKerangkaDesktop() {
  return (
    <nav className="hidden sm:flex items-center gap-1" aria-label="Navigasi Utama">
      {MENU_PUBLIK.map((item) => (
        <Link key={item.href} href={item.href} className={kelasDesktop(false)}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function MenuKerangkaHP() {
  return (
    <nav
      className="sm:hidden grid grid-cols-5 gap-1 py-2 border-t border-n-100"
      aria-label="Navigasi Ponsel"
    >
      {MENU_PUBLIK.map((item) => (
        <Link key={item.href} href={item.href} className={kelasHP(false)}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function MenuPilihDesktop() {
  const pathname = usePathname() ?? "/";
  return (
    <nav className="hidden sm:flex items-center gap-1" aria-label="Navigasi Utama">
      {MENU_PUBLIK.map((item) => {
        const aktif = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={kelasDesktop(aktif)}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MenuPilihHP() {
  const pathname = usePathname() ?? "/";
  return (
    <nav
      className="sm:hidden grid grid-cols-5 gap-1 py-2 border-t border-n-100"
      aria-label="Navigasi Ponsel"
    >
      {MENU_PUBLIK.map((item) => {
        const aktif = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={kelasHP(aktif)}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
