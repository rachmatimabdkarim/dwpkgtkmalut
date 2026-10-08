"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Ikon, LambangTeks } from "./ikon";
import { JudulAplikasi } from "./judul-aplikasi";
import { MENU_ADMIN, bolehAkses, type MenuItem, type RoleKey } from "@/lib/peran";
import type { SesiPengguna } from "@/lib/sesi";
import { useTema } from "@/components/penyedia-tema";

/**
 * Kerangka panel admin: sidebar 6 menu (berubah jadi menu geser di HP),
 * header dengan judul aplikasi + satu ikon lonceng + identitas pengguna.
 */
export function KerangkaAdmin({
  pengguna,
  judul,
  aksi,
  logoUrl,
  children,
}: {
  pengguna: SesiPengguna;
  judul: string;
  aksi?: React.ReactNode;
  logoUrl?: string | null;
  children: React.ReactNode;
}) {
  const [terbuka, setTerbuka] = useState(false);
  const pathname = usePathname();
  const tema = useTema();
  const logo = logoUrl ?? tema.logoUrl;

  const menuTampil = MENU_ADMIN.filter((m: MenuItem) => bolehAkses(m, pengguna.peran as RoleKey[]));

  const isiSidebar = (
    <nav className="flex flex-col gap-0.5 p-3">
      {menuTampil.map((m) => {
        const aktif = pathname === m.href || (m.href !== "/admin" && pathname.startsWith(m.href));
        return (
          <Link
            key={m.key}
            href={m.href}
            onClick={() => setTerbuka(false)}
            className={`flex items-center gap-3 rounded-token px-3 h-11 text-[15px] ${
              aktif
                ? "bg-brand-600 text-brand-contrast font-medium"
                : "text-n-700 hover:bg-n-100"
            }`}
          >
            <Ikon nama={m.ikon} />
            {m.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-n-50">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[248px] flex-col border-r border-n-200 bg-n-0">
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-n-200">
          {logo ? (
            <Image
              src={logo}
              alt="Logo DWP"
              width={36}
              height={36}
              unoptimized
              className="h-9 w-9 object-contain rounded-token shrink-0"
            />
          ) : (
            <LambangTeks />
          )}
          <JudulAplikasi baris1={tema.namaAplikasi} baris2={tema.namaUnit} />
        </div>
        {isiSidebar}
        <div className="mt-auto p-3 border-t border-n-200">
          <p className="teks-3 text-n-500 px-3">Masuk sebagai</p>
          <p className="text-[14px] font-medium text-n-800 px-3 truncate">{pengguna.nama}</p>
          <Link
            href="/keluar"
            className="mt-2 flex items-center gap-3 rounded-token px-3 h-11 text-[15px] text-bad-fg hover:bg-bad-bg"
          >
            <Ikon nama="keluar" />
            Keluar
          </Link>
        </div>
      </aside>

      {/* Menu geser (HP) */}
      {terbuka && (
        <div className="md:hidden fixed inset-0 z-40">
          <button
            aria-label="Tutup menu"
            onClick={() => setTerbuka(false)}
            className="absolute inset-0 bg-n-900/40"
          />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-[300px] bg-n-0 shadow-lg">
            <div className="flex items-center justify-between px-4 h-16 border-b border-n-200">
              <div className="flex items-center gap-2.5 min-w-0">
                {logo ? (
                  <Image
                    src={logo}
                    alt="Logo DWP"
                    width={32}
                    height={32}
                    unoptimized
                    className="h-8 w-8 object-contain rounded-token shrink-0"
                  />
                ) : (
                  <LambangTeks ukuran={32} />
                )}
                <JudulAplikasi baris1={tema.namaAplikasi} baris2={tema.namaUnit} />
              </div>
              <button
                aria-label="Tutup menu"
                onClick={() => setTerbuka(false)}
                className="h-11 w-11 inline-flex items-center justify-center rounded-token hover:bg-n-100"
              >
                <Ikon nama="tutup" />
              </button>
            </div>
            {isiSidebar}
            <div className="p-3 border-t border-n-200">
              <p className="teks-3 text-n-500 px-3">Masuk sebagai {pengguna.nama}</p>
            </div>
          </div>
        </div>
      )}

      <div className="md:pl-[248px]">
        <header className="sticky top-0 z-30 flex items-center gap-2 h-16 px-3 sm:px-6 border-b border-n-200 bg-n-0/95 backdrop-blur">
          <button
            aria-label="Buka menu"
            onClick={() => setTerbuka(true)}
            className="md:hidden h-11 w-11 inline-flex items-center justify-center rounded-token hover:bg-n-100"
          >
            <Ikon nama="menu" />
          </button>
          <h1 className="judul-2 text-n-800 truncate flex-1">{judul}</h1>
          {aksi}
          <button
            aria-label="Notifikasi"
            className="h-11 w-11 inline-flex items-center justify-center rounded-token text-n-600 hover:bg-n-100"
          >
            <Ikon nama="lonceng" ukuran={19} />
          </button>
        </header>

        <main className="px-3 sm:px-6 py-5 sm:py-7 max-w-[980px]">{children}</main>
      </div>
    </div>
  );
}
