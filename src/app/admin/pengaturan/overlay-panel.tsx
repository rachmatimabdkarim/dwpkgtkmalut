"use client";

/**
 * Pengatur lapisan warna & gradasi foto besar beranda.
 *
 * Foto kegiatan punya bagian terang dan gelap yang tidak bisa diduga, jadi
 * tulisan putih di atasnya perlu jaminan kontras. Pengatur ini membuat
 * tampilannya bisa dicoba-coba langsung sebelum disimpan.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TombolUtama, TombolSekunder, Isian, Kolom } from "@/components/dasar";
import { gradasiOverlay, warnaTeksTerbaik } from "@/lib/tema";
import { simpanOverlay } from "./aksi";

type NilaiOverlay = {
  warna: string;
  pekat: number;
  arah: string;
  bentuk: string;
};

/** Gaya siap pakai — sekali klik, semua pengaturan terisi. */
const GAYA_SIAP: { nama: string; keterangan: string; nilai: NilaiOverlay }[] = [
  {
    nama: "Standar (gelap di kiri)",
    keterangan: "Paling aman: tulisan selalu jelas, foto tetap terlihat",
    nilai: { warna: "#1b4a22", pekat: 88, arah: "kiri-ke-kanan", bentuk: "bertahap" },
  },
  {
    nama: "Kiri gelap pekat",
    keterangan: "Tulisan sangat jelas, sisi kanan foto terlihat penuh",
    nilai: { warna: "#12240f", pekat: 96, arah: "kiri-ke-kanan", bentuk: "tajam-di-kiri" },
  },
  {
    nama: "Merata lembut",
    keterangan: "Kegelapan sama rata — cocok kalau foto ramai di semua sisi",
    nilai: { warna: "#1b4a22", pekat: 62, arah: "merata", bentuk: "merata" },
  },
  {
    nama: "Bawah gelap",
    keterangan: "Cocok untuk foto dengan langit terang di bagian atas",
    nilai: { warna: "#12240f", pekat: 88, arah: "atas-ke-bawah", bentuk: "bertahap" },
  },
  {
    nama: "Sangat bening",
    keterangan: "Foto nyaris tanpa lapisan — hanya untuk foto yang sudah gelap",
    nilai: { warna: "#1b4a22", pekat: 28, arah: "kiri-ke-kanan", bentuk: "bertahap" },
  },
  {
    nama: "Hitam netral",
    keterangan: "Lapisan hitam, tidak berwarna — untuk foto yang sangat berwarna",
    nilai: { warna: "#111111", pekat: 78, arah: "kiri-ke-kanan", bentuk: "bertahap" },
  },
];

const ARAH = [
  { nilai: "kiri-ke-kanan", label: "Kiri → Kanan" },
  { nilai: "kanan-ke-kiri", label: "Kanan → Kiri" },
  { nilai: "atas-ke-bawah", label: "Atas → Bawah" },
  { nilai: "merata", label: "Merata (tanpa arah)" },
];

const BENTUK = [
  { nilai: "bertahap", label: "Bertahap (halus)" },
  { nilai: "tajam-di-kiri", label: "Tajam di sisi awal" },
  { nilai: "merata", label: "Sama rata" },
];

export function PengaturOverlay({
  fotoUrl,
  nilaiAwal,
  judulContoh,
}: {
  fotoUrl: string | null;
  nilaiAwal: NilaiOverlay;
  judulContoh: string;
}) {
  const router = useRouter();
  const [nilai, setNilai] = useState<NilaiOverlay>(nilaiAwal);
  const [pesan, setPesan] = useState<{ jenis: "ok" | "bad"; teks: string } | null>(null);
  const [sedang, setSedang] = useState(false);

  const sah = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test((nilai.warna ?? "").trim());

  // Hitung gradasi yang akan dipakai (untuk pratinjau langsung)
  const gradasi = useMemo(
    () => gradasiOverlay(nilai.warna, nilai.pekat, nilai.arah, nilai.bentuk),
    [nilai],
  );

  // Perkiraan keterbacaan tulisan putih di atas lapisan
  const perkiraan = useMemo(() => {
    if (!sah) return null;
    // Semakin pekat lapisan, semakin aman tulisan di sisi itu
    const sisi = nilai.arah === "kanan-ke-kiri" ? nilai.pekat * 0.55 : nilai.pekat;
    const campur = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
    const r = parseInt(nilai.warna.slice(1, 3), 16);
    const g = parseInt(nilai.warna.slice(3, 5), 16);
    const b = parseInt(nilai.warna.slice(5, 7), 16);
    const t = sisi / 100;
    const latarEfektif = `rgb(${campur(230, r, t)}, ${campur(230, g, t)}, ${campur(230, b, t)})`;
    return { warnaTeks: warnaTeksTerbaik(latarEfektif), jumlah: Math.round(sisi) };
  }, [nilai, sah]);

  async function simpan() {
    setPesan(null);
    setSedang(true);
    const hasil = await simpanOverlay(nilai);
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
        <p className="text-[13.5px] font-medium text-n-700 mb-1">Lapisan & gradasi foto beranda</p>
        <p className="teks-3 text-n-500">
          Lapisan gelap di atas foto membuat tulisan putih tetap terbaca, apa pun fotonya. Atur
          warnanya, seberapa gelap, dan arah gradasinya.
        </p>
      </div>

      {/* Gaya siap pakai */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {GAYA_SIAP.map((g) => {
          const contoh = gradasiOverlay(g.nilai.warna, g.nilai.pekat, g.nilai.arah, g.nilai.bentuk);
          const aktif =
            nilai.warna === g.nilai.warna &&
            nilai.pekat === g.nilai.pekat &&
            nilai.arah === g.nilai.arah &&
            nilai.bentuk === g.nilai.bentuk;
          return (
            <button
              key={g.nama}
              type="button"
              onClick={() => {
                setNilai(g.nilai);
                setPesan(null);
              }}
              className={`text-left rounded-token border p-3 transition-colors ${
                aktif ? "border-brand-500 bg-brand-50" : "border-n-200 hover:bg-n-50"
              }`}
            >
              <span
                className="block h-11 rounded-token mb-2.5"
                style={{
                  backgroundColor: "var(--dasar-700)",
                  backgroundImage: fotoUrl ? `url(${fotoUrl})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <span className="block h-full w-full rounded-token" style={{ background: contoh }} />
              </span>
              <span className="block text-[13.5px] font-medium text-n-800">{g.nama}</span>
              <span className="block teks-3 text-n-500 mt-0.5">{g.keterangan}</span>
            </button>
          );
        })}
      </div>

      {/* Atur sendiri */}
      <div className="space-y-4 pt-1">
        <div className="grid sm:grid-cols-2 gap-4">
          <Kolom label="Warna lapisan" bantuan="Warna yang ditumpuk di atas foto.">
            <div className="flex items-center gap-2.5">
              <input
                type="color"
                aria-label="Pilih warna lapisan"
                value={sah ? nilai.warna : "#1b4a22"}
                onChange={(e) => {
                  setNilai({ ...nilai, warna: e.target.value });
                  setPesan(null);
                }}
                className="h-11 w-14 rounded-token border border-n-200 cursor-pointer bg-n-0 p-1 shrink-0"
              />
              <Isian
                value={nilai.warna}
                onChange={(e) => {
                  setNilai({ ...nilai, warna: e.target.value });
                  setPesan(null);
                }}
                placeholder="#1b4a22"
                className="max-w-[140px] font-mono"
              />
            </div>
          </Kolom>

          <Kolom label="Arah gradasi" bantuan="Dari sisi mana lapisan mulai gelap.">
            <select
              value={nilai.arah}
              onChange={(e) => {
                setNilai({ ...nilai, arah: e.target.value });
                setPesan(null);
              }}
              className="min-h-[44px] w-full rounded-token border border-n-200 bg-n-0 px-3 text-[14.5px] text-n-800"
            >
              {ARAH.map((a) => (
                <option key={a.nilai} value={a.nilai}>
                  {a.label}
                </option>
              ))}
            </select>
          </Kolom>
        </div>

        <Kolom label="Bentuk gradasi" bantuan="Seberapa cepat lapisan menjadi bening.">
          <select
            value={nilai.bentuk}
            onChange={(e) => {
              setNilai({ ...nilai, bentuk: e.target.value });
              setPesan(null);
            }}
            className="min-h-[44px] w-full rounded-token border border-n-200 bg-n-0 px-3 text-[14.5px] text-n-800"
          >
            {BENTUK.map((b) => (
              <option key={b.nilai} value={b.nilai}>
                {b.label}
              </option>
            ))}
          </select>
        </Kolom>

        <div>
          <label className="block text-[13.5px] font-medium text-n-700 mb-1.5">
            Tingkat kegelapan: <span className="font-mono">{nilai.pekat}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={2}
            value={nilai.pekat}
            aria-label="Tingkat kegelapan lapisan"
            onChange={(e) => {
              setNilai({ ...nilai, pekat: Number(e.target.value) });
              setPesan(null);
            }}
            className="w-full h-11 cursor-pointer"
          />
          <div className="flex justify-between teks-3 text-n-500 mt-0.5">
            <span>Bening (foto terlihat penuh)</span>
            <span>Gelap penuh</span>
          </div>
        </div>
      </div>

      {/* Pratinjau langsung */}
      <div>
        <p className="text-[13.5px] font-medium text-n-700 mb-2">Pratinjau</p>
        <div
          className="relative rounded-[18px] overflow-hidden h-[240px]"
          style={{
            backgroundColor: "var(--dasar-700)",
            backgroundImage: fotoUrl ? `url(${fotoUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center 42%",
          }}
        >
          <div className="absolute inset-0" style={{ background: gradasi }} />
          <div className="relative h-full flex flex-col justify-center px-6 sm:px-8">
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
        </div>

        {perkiraan && (
          <p className="mt-2.5 text-[13.5px] text-n-600">
            Tulisan putih di sisi tergelap diperkirakan{" "}
            <strong className="text-ok-700">terbaca</strong> (latar {perkiraan.jumlah}% gelap).
          </p>
        )}
        {!sah && (
          <p className="mt-2.5 text-[13.5px] text-bahaya-700">
            Kode warna belum sah. Contoh yang benar: #1b4a22
          </p>
        )}
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

      <div className="flex flex-wrap gap-3">
        <TombolUtama type="button" onClick={simpan} disabled={sedang || !sah}>
          {sedang ? "Menyimpan…" : "Simpan Lapisan Foto"}
        </TombolUtama>
        <TombolSekunder type="button" onClick={() => setNilai(nilaiAwal)} disabled={sedang}>
          Kembalikan ke Sebelumnya
        </TombolSekunder>
      </div>
    </div>
  );
}
