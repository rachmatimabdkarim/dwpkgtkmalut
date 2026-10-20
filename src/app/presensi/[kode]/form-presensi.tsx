"use client";

import { useState } from "react";
import { absenLewatQr } from "./aksi";

/**
 * FORMULIR PRESENSI PESERTA (dibuka lewat QR, tanpa masuk).
 *
 * Dibuat sengaja sangat sederhana: satu kolom nama, satu tombol. Peserta
 * memindai QR di lokasi kegiatan dan langsung bisa mengisi tanpa akun.
 */
export function FormPresensi({
  kode,
  judul,
  tempat,
  tanggal,
  terbuka,
  sebab,
}: {
  kode: string;
  judul: string;
  tempat: string | null;
  tanggal: string;
  terbuka: boolean;
  sebab: string;
}) {
  const [nama, setNama] = useState("");
  const [sedang, setSedang] = useState(false);
  const [galat, setGalat] = useState("");
  const [selesai, setSelesai] = useState<{ nama: string; sudahAda?: boolean } | null>(null);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setGalat("");
    setSedang(true);
    const r = await absenLewatQr(kode, nama);
    setSedang(false);
    if ("galat" in r) {
      setGalat(r.galat);
      return;
    }
    setSelesai({ nama: r.nama, sudahAda: r.sudahAda });
  }

  if (selesai) {
    return (
      <div className="rounded-token-lg border border-n-200 bg-n-0 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700 text-2xl">
          ✓
        </div>
        <p className="mt-4 text-[17px] font-semibold text-n-900">
          {selesai.sudahAda ? "Anda sudah tercatat" : "Terima kasih, " + selesai.nama}
        </p>
        <p className="mt-2 text-[14.5px] text-n-600">
          {selesai.sudahAda
            ? "Nama Anda sudah ada di daftar presensi kegiatan ini. Tidak perlu mengisi lagi."
            : "Kehadiran Anda sudah tercatat dan sedang menunggu konfirmasi petugas."}
        </p>
        <p className="mt-4 teks-3 text-n-400">
          Kehadiran dinyatakan sah setelah diperiksa petugas presensi di lokasi.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-token-lg border border-n-200 bg-n-0 p-5">
      <p className="teks-3 text-n-500 font-medium">Presensi Kegiatan</p>
      <h1 className="mt-1 text-[19px] font-bold text-n-900 leading-snug">{judul}</h1>
      <p className="mt-1 text-[14px] text-n-600">
        {tanggal}
        {tempat ? ` · ${tempat}` : ""}
      </p>

      <div
        className={`mt-4 rounded-token border p-3 ${
          terbuka
            ? "border-brand-200 bg-brand-50"
            : "border-warn-line bg-warn-bg"
        }`}
      >
        <p className={`text-[13.5px] font-medium ${terbuka ? "text-brand-800" : "text-warn-fg"}`}>
          {terbuka ? "Presensi sedang dibuka" : "Presensi sedang ditutup"}
        </p>
        <p className="teks-3 text-n-600 mt-0.5">{sebab}</p>
      </div>

      {terbuka && (
        <form onSubmit={kirim} className="mt-5 flex flex-col gap-3">
          <label className="block">
            <span className="block text-[13.5px] font-medium text-n-800 mb-1">
              Nama lengkap
            </span>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Siti Aminah, S.Pd."
              className="w-full min-h-[46px] rounded-token border border-n-300 px-3 text-[15px] text-n-900 bg-n-0"
              autoComplete="name"
              autoFocus
            />
          </label>

          {galat && (
            <p className="text-[13.5px] text-bad-fg rounded-token border border-bad-line bg-bad-bg p-2.5">
              {galat}
            </p>
          )}

          <button
            type="submit"
            disabled={sedang || nama.trim().length < 3}
            className="min-h-[48px] rounded-token bg-brand-600 px-4 text-[15px] font-semibold text-brand-contrast disabled:opacity-50"
          >
            {sedang ? "Menyimpan…" : "Saya Hadir"}
          </button>

          <p className="teks-3 text-n-500 text-center">
            Kehadiran Anda menunggu konfirmasi petugas di lokasi kegiatan.
          </p>
        </form>
      )}
    </div>
  );
}
