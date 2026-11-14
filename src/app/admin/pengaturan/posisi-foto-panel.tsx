"use client";

/**
 * Pengatur POSISI (titik fokus) foto besar beranda.
 *
 * Foto yang diunggah bisa berasal dari kamera ponsel (potret) atau kamera
 * biasa (lebar). Panel foto beranda bentuknya lebar dan pendek, jadi bagian
 * foto yang terlihat hanya sebagian. Pengatur ini memindahkan bagian foto
 * mana yang ditampilkan — sekali klik pada gambar, atau geser kedua pengait.
 *
 * Titik fokus disimpan sebagai dua angka persen (0–100):
 *   posisiX: 0 = sisi kiri foto, 100 = sisi kanan foto
 *   posisiY: 0 = bagian atas foto, 100 = bagian bawah foto
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TombolUtama, TombolSekunder } from "@/components/dasar";
import { simpanPosisiFoto } from "./aksi";

type NilaiPosisi = { x: number; y: number };

/** Lima titik cepat supaya pemilik tidak perlu menggeser pelan-pelan. */
const TITIK_CEPAT: { nama: string; nilai: NilaiPosisi }[] = [
  { nama: "Tengah", nilai: { x: 50, y: 50 } },
  { nama: "Atas", nilai: { x: 50, y: 20 } },
  { nama: "Bawah", nilai: { x: 50, y: 80 } },
  { nama: "Kiri", nilai: { x: 20, y: 50 } },
  { nama: "Kanan", nilai: { x: 80, y: 50 } },
];

export function PengaturPosisiFoto({
  fotoUrl,
  nilaiAwal,
  judulContoh,
}: {
  fotoUrl: string | null;
  nilaiAwal: NilaiPosisi;
  judulContoh: string;
}) {
  const router = useRouter();
  const [nilai, setNilai] = useState<NilaiPosisi>(nilaiAwal);
  const [pesan, setPesan] = useState<{ jenis: "ok" | "bad"; teks: string } | null>(null);
  const [sedang, setSedang] = useState(false);

  const posisiCss = `${nilai.x}% ${nilai.y}%`;

  function ubahTitik(e: React.MouseEvent<HTMLDivElement>) {
    if (!fotoUrl) return;
    const kotak = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - kotak.left) / kotak.width) * 100);
    const y = Math.round(((e.clientY - kotak.top) / kotak.height) * 100);
    setNilai({ x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) });
    setPesan(null);
  }

  async function simpan() {
    setPesan(null);
    setSedang(true);
    const hasil = await simpanPosisiFoto(nilai.x, nilai.y);
    setSedang(false);
    if (!hasil.sukses) {
      setPesan({ jenis: "bad", teks: hasil.pesan });
      return;
    }
    setPesan({ jenis: "ok", teks: hasil.pesan });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[13.5px] font-medium text-n-700 mb-1">Posisi foto beranda</p>
        <p className="teks-3 text-n-500">
          Tentukan bagian foto mana yang tampil di halaman depan. Ketuk langsung pada pratinjau di
          titik yang ingin dijadikan pusat, atau geser kedua pengait di bawahnya.
        </p>
      </div>

      {!fotoUrl && (
        <p className="text-[13.5px] text-n-600 rounded-token bg-n-50 border border-n-200 px-3 py-2">
          Foto beranda belum dipilih. Unggah foto lebih dulu, lalu atur posisinya di sini.
        </p>
      )}

      {/* Pratinjau — ketuk untuk memindahkan titik fokus */}
      <div>
        <p className="text-[13.5px] font-medium text-n-700 mb-2">Pratinjau (ketuk untuk mengarahkan)</p>
        <div
          onClick={ubahTitik}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") e.preventDefault();
          }}
          className="relative rounded-[18px] overflow-hidden h-[240px] cursor-crosshair"
          style={{
            backgroundColor: "var(--dasar-700)",
            backgroundImage: fotoUrl ? `url(${fotoUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: posisiCss,
          }}
        >
          {/* Lapisan gelap tipis supaya tulisan contoh tetap terbaca */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(90deg, rgba(18,36,15,0.88), rgba(18,36,15,0.35))" }}
          />
          <div className="relative h-full flex flex-col justify-center px-6 sm:px-8 pointer-events-none">
            <p
              className="text-[11.5px] font-bold tracking-[0.14em] uppercase mb-2"
              style={{ color: "var(--aksen-300)" }}
            >
              Selamat Datang
            </p>
            <p className="text-[20px] sm:text-[24px] font-extrabold leading-tight text-n-0 max-w-[420px]">
              {judulContoh}
            </p>
            <span
              className="mt-4 inline-flex w-fit items-center justify-center min-h-[40px] px-5 rounded-full font-bold text-[13.5px]"
              style={{ backgroundColor: "var(--tombol-600)", color: "var(--tombol-teks)" }}
            >
              Lihat Agenda Kegiatan
            </span>
          </div>

          {/* Penanda titik fokus */}
          {fotoUrl && (
            <span
              aria-hidden="true"
              className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-white shadow-md pointer-events-none"
              style={{
                left: `${nilai.x}%`,
                top: `${nilai.y}%`,
                backgroundColor: "var(--aksen-500)",
                opacity: 0.9,
              }}
            />
          )}
        </div>
      </div>

      {/* Titik cepat */}
      <div className="flex flex-wrap gap-2">
        {TITIK_CEPAT.map((t) => {
          const aktif = nilai.x === t.nilai.x && nilai.y === t.nilai.y;
          return (
            <button
              key={t.nama}
              type="button"
              onClick={() => {
                setNilai(t.nilai);
                setPesan(null);
              }}
              className={`min-h-[44px] px-4 rounded-token border text-[13.5px] font-medium transition-colors ${
                aktif ? "border-brand-500 bg-brand-50 text-brand-800" : "border-n-200 bg-n-0 text-n-700 hover:bg-n-50"
              }`}
            >
              {t.nama}
            </button>
          );
        })}
      </div>

      {/* Pengait halus */}
      <div className="space-y-4">
        <div>
          <label className="block text-[13.5px] font-medium text-n-700 mb-1.5">
            Geser kiri ↔ kanan: <span className="font-mono">{nilai.x}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={nilai.x}
            aria-label="Posisi foto kiri ke kanan"
            onChange={(e) => {
              setNilai({ ...nilai, x: Number(e.target.value) });
              setPesan(null);
            }}
            className="w-full h-11 cursor-pointer"
          />
          <div className="flex justify-between teks-3 text-n-500 mt-0.5">
            <span>Sisi kiri foto</span>
            <span>Sisi kanan foto</span>
          </div>
        </div>

        <div>
          <label className="block text-[13.5px] font-medium text-n-700 mb-1.5">
            Geser atas ↕ bawah: <span className="font-mono">{nilai.y}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={nilai.y}
            aria-label="Posisi foto atas ke bawah"
            onChange={(e) => {
              setNilai({ ...nilai, y: Number(e.target.value) });
              setPesan(null);
            }}
            className="w-full h-11 cursor-pointer"
          />
          <div className="flex justify-between teks-3 text-n-500 mt-0.5">
            <span>Atas foto</span>
            <span>Bawah foto</span>
          </div>
        </div>
      </div>

      {pesan && (
        <p
          className={`text-[14px] rounded-token px-3 py-2 border ${
            pesan.jenis === "ok"
              ? "text-ok-700 bg-ok-50 border-ok-200"
              : "text-bahaya-700 bg-bahaya-50 border-bahaya-200"
          }`}
        >
          {pesan.teks}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <TombolUtama type="button" onClick={simpan} disabled={sedang || !fotoUrl}>
          {sedang ? "Menyimpan…" : "Simpan Posisi Foto"}
        </TombolUtama>
        <TombolSekunder type="button" onClick={() => setNilai(nilaiAwal)} disabled={sedang}>
          Kembalikan ke Sebelumnya
        </TombolSekunder>
        <span className="teks-3 text-n-600">
          Menyimpan posisi foto saja — foto dan tulisan tidak diunggah ulang.
        </span>
      </div>
    </div>
  );
}
