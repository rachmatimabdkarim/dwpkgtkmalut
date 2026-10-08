"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Ikon } from "./ikon";
import {
  ambilNotifikasi,
  tandaiDibaca,
  tandaiSemuaDibaca,
  type NotifikasiBaris,
} from "@/app/admin/notifikasi/aksi";

function formatWaktuRelatif(isoString: string): string {
  const waktu = new Date(isoString).getTime();
  const sekarang = Date.now();
  const selisihDetik = Math.floor((sekarang - waktu) / 1000);

  if (selisihDetik < 60) return "Baru saja";
  const menit = Math.floor(selisihDetik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 30) return `${hari} hari lalu`;
  const bulan = Math.floor(hari / 30);
  return `${bulan} bulan lalu`;
}

export function Lonceng() {
  const [terbuka, setTerbuka] = useState(false);
  const [daftar, setDaftar] = useState<NotifikasiBaris[]>([]);
  const [jumlahBelumDibaca, setJumlahBelumDibaca] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let aktif = true;
    void ambilNotifikasi()
      .then((hasil) => {
        if (aktif && hasil) {
          setDaftar(hasil.data);
          setJumlahBelumDibaca(hasil.jumlahBelumDibaca);
        }
      })
      .catch(() => {});

    return () => {
      aktif = false;
    };
  }, []);

  const segarkanData = () => {
    void ambilNotifikasi()
      .then((hasil) => {
        if (hasil) {
          setDaftar(hasil.data);
          setJumlahBelumDibaca(hasil.jumlahBelumDibaca);
        }
      })
      .catch(() => {});
  };

  const handleBukaTutup = () => {
    if (!terbuka) {
      segarkanData();
    }
    setTerbuka((prev) => !prev);
  };

  const handlePilihNotifikasi = (item: NotifikasiBaris) => {
    if (!item.dibaca) {
      setDaftar((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, dibaca: true } : n)),
      );
      setJumlahBelumDibaca((prev) => Math.max(0, prev - 1));
      startTransition(async () => {
        await tandaiDibaca(item.id);
      });
    }
    setTerbuka(false);
  };

  const handleTandaiSemuaDibaca = () => {
    setDaftar((prev) => prev.map((n) => ({ ...n, dibaca: true })));
    setJumlahBelumDibaca(0);
    startTransition(async () => {
      await tandaiSemuaDibaca();
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={
          jumlahBelumDibaca > 0
            ? `Notifikasi (${jumlahBelumDibaca} belum dibaca)`
            : "Notifikasi"
        }
        onClick={handleBukaTutup}
        className="relative h-11 w-11 inline-flex items-center justify-center rounded-token text-n-600 hover:bg-n-100 transition-colors"
      >
        <Ikon nama="lonceng" ukuran={19} />
        {jumlahBelumDibaca > 0 && (
          <span
            className="absolute top-2.5 right-2.5 h-2.5 w-2.5 rounded-full bg-bad-fg ring-2 ring-n-0"
            aria-hidden="true"
          />
        )}
      </button>

      {terbuka && (
        <>
          {/* Latar belakang transparan untuk menutup saat diklik di luar */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setTerbuka(false)}
            aria-hidden="true"
          />

          {/* Panel melayang */}
          <div
            className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 z-50 rounded-token-lg border border-n-200 bg-n-0 shadow-lg flex flex-col max-h-[85vh] overflow-hidden"
            style={{ boxShadow: "var(--shadow-1)" }}
          >
            {/* Header panel */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-n-200 bg-n-0">
              <div className="flex items-center gap-2">
                <h2 className="judul-2 text-[15px] text-n-800">Notifikasi</h2>
                {jumlahBelumDibaca > 0 && (
                  <span className="inline-flex items-center rounded-full bg-brand-50 text-brand-700 px-2 py-0.5 text-[11px] font-semibold">
                    {jumlahBelumDibaca}
                  </span>
                )}
              </div>
              {daftar.length > 0 && jumlahBelumDibaca > 0 && (
                <button
                  type="button"
                  onClick={handleTandaiSemuaDibaca}
                  disabled={isPending}
                  className="text-[13px] font-medium text-brand-700 hover:text-brand-800 py-1 px-2 rounded-token hover:bg-brand-50 transition-colors disabled:opacity-50"
                >
                  Tandai semua dibaca
                </button>
              )}
            </div>

            {/* Isi daftar notifikasi */}
            <div className="overflow-y-auto max-h-[60vh]">
              {daftar.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-n-500 text-[14px]">
                    Tidak ada pemberitahuan baru.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-n-100">
                  {daftar.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.tautan || "/admin"}
                        onClick={() => handlePilihNotifikasi(item)}
                        className={`flex items-start gap-3 p-3.5 hover:bg-n-50 transition-colors min-h-[44px] ${
                          !item.dibaca ? "bg-brand-50/40" : ""
                        }`}
                      >
                        <span
                          className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                            !item.dibaca ? "bg-brand-600" : "bg-transparent"
                          }`}
                          aria-hidden="true"
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-[14px] leading-snug truncate ${
                              !item.dibaca
                                ? "font-semibold text-n-900"
                                : "font-medium text-n-800"
                            }`}
                          >
                            {item.judul}
                          </p>
                          {item.pesan && (
                            <p className="text-[13px] text-n-600 line-clamp-2 mt-0.5">
                              {item.pesan}
                            </p>
                          )}
                          <p className="teks-3 text-n-400 mt-1">
                            {formatWaktuRelatif(item.dibuat_pada)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
