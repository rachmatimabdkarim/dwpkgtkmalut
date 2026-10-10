"use client";

/**
 * Pengatur tema warna website.
 *
 * Super Admin memilih warna untuk lima bagian. Setiap warna menghasilkan
 * satu skala penuh (terang→gelap) secara otomatis, dan warna huruf di atas
 * tiap blok dihitung supaya selalu terbaca. Ada pula palet siap pakai
 * supaya tidak perlu memilih satu per satu.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Kartu, TombolUtama, TombolSekunder, JudulSeksi, Isian } from "@/components/dasar";
import { rasioKontras, warnaTeksTerbaik } from "@/lib/tema";
import { simpanWarnaLengkap } from "./aksi";

type Palet = {
  dasar: string;
  aksen: string;
  tombol: string;
  halaman: string;
  teks: string;
};

/** Palet siap pakai — sekali klik, semua warna terisi. */
const PALET_SIAP: { nama: string; keterangan: string; warna: Palet }[] = [
  {
    nama: "DWP — Hijau & Emas",
    keterangan: "Warna khas Dharma Wanita Persatuan (dari lambang resmi)",
    warna: {
      dasar: "#1b4a22",
      aksen: "#c99a1e",
      tombol: "#c99a1e",
      halaman: "#f7f6ef",
      teks: "#33382f",
    },
  },
  {
    nama: "DWP — Hijau Daun",
    keterangan: "Hijau lebih terang, kesan segar dan ringan",
    warna: {
      dasar: "#205020",
      aksen: "#e0a020",
      tombol: "#2e6b2e",
      halaman: "#f5f8f3",
      teks: "#2f3a2c",
    },
  },
  {
    nama: "DWP — Merah & Emas",
    keterangan: "Merah Sang Saka dengan aksen emas putik bunga",
    warna: {
      dasar: "#7a1414",
      aksen: "#c99a1e",
      tombol: "#a01010",
      halaman: "#fdf6f4",
      teks: "#3a2e2e",
    },
  },
  {
    nama: "Biru Resmi",
    keterangan: "Biru tua pemerintahan, kesan formal dan tenang",
    warna: {
      dasar: "#1c244b",
      aksen: "#c99a1e",
      tombol: "#2f5fa8",
      halaman: "#f5f7fb",
      teks: "#33373d",
    },
  },
  {
    nama: "Hijau Zaitun",
    keterangan: "Hijau lembut, nyaman dibaca dalam waktu lama",
    warna: {
      dasar: "#3d4a24",
      aksen: "#c08a2e",
      tombol: "#5c7033",
      halaman: "#f7f7f0",
      teks: "#343a2a",
    },
  },
];

const BAGIAN: { kunci: keyof Palet; label: string; bantuan: string }[] = [
  {
    kunci: "dasar",
    label: "Warna dasar (gelap)",
    bantuan: "Dipakai pada menu, footer, judul, dan blok gelap.",
  },
  {
    kunci: "aksen",
    label: "Warna aksen",
    bantuan: "Dipakai pada garis sorotan, tanda kutip, dan ikon.",
  },
  {
    kunci: "tombol",
    label: "Warna tombol",
    bantuan: "Dipakai pada tombol ajakan seperti “Lihat Agenda”.",
  },
  {
    kunci: "halaman",
    label: "Latar halaman",
    bantuan: "Latar lembut untuk memisahkan bagian-bagian halaman.",
  },
  {
    kunci: "teks",
    label: "Warna huruf",
    bantuan: "Warna tulisan pada latar terang.",
  },
];

export function PengaturWarna({
  temaAwal,
}: {
  temaAwal: Palet;
}) {
  const router = useRouter();
  const [palet, setPalet] = useState<Palet>(temaAwal);
  const [pesan, setPesan] = useState<{ jenis: "ok" | "bad"; teks: string } | null>(null);
  const [sedang, setSedang] = useState(false);
  const [terbuka, setTerbuka] = useState(false);

  const sah = (w: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test((w ?? "").trim());

  // Pemeriksaan keterbacaan langsung, sebelum disimpan
  const periksa = useMemo(() => {
    if (!BAGIAN.every((b) => sah(palet[b.kunci]))) return null;
    const rasioTeks = rasioKontras(palet.teks, palet.halaman);
    const rasioTombol = Math.max(rasioKontras("#ffffff", palet.tombol), rasioKontras("#1a1a1a", palet.tombol));
    return {
      rasioTeks,
      rasioTombol,
      teksTombol: warnaTeksTerbaik(palet.tombol),
      aman: rasioTeks >= 3.0 && rasioTombol >= 3.0,
    };
  }, [palet]);

  async function simpan() {
    setPesan(null);
    setSedang(true);
    const hasil = await simpanWarnaLengkap(palet);
    setSedang(false);
    if (!hasil.sukses) {
      setPesan({ jenis: "bad", teks: hasil.pesan });
      return;
    }
    setPesan({ jenis: "ok", teks: hasil.pesan });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Palet siap pakai */}
      <Kartu className="p-5">
        <JudulSeksi>Palet Siap Pakai</JudulSeksi>
        <p className="teks-3 text-n-600 mb-4">
          Pilih salah satu untuk mengisi semua warna sekaligus. Setelah itu masih bisa disesuaikan
          satu per satu di bawah.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PALET_SIAP.map((p) => (
            <button
              key={p.nama}
              type="button"
              onClick={() => {
                setPalet(p.warna);
                setPesan(null);
              }}
              className="text-left rounded-token border border-n-200 hover:border-brand-400 hover:bg-n-50 p-4 transition-colors"
            >
              <div className="flex gap-1.5 mb-3">
                {[p.warna.dasar, p.warna.aksen, p.warna.tombol, p.warna.halaman, p.warna.teks].map(
                  (w) => (
                    <span
                      key={w}
                      className="h-6 w-6 rounded-full border border-n-200"
                      style={{ backgroundColor: w }}
                    />
                  ),
                )}
              </div>
              <p className="text-n-800 font-medium text-[14px]">{p.nama}</p>
              <p className="teks-3 text-n-500 mt-0.5">{p.keterangan}</p>
            </button>
          ))}
        </div>
      </Kartu>

      {/* Atur satu per satu */}
      <Kartu className="p-5">
        <button
          type="button"
          onClick={() => setTerbuka(!terbuka)}
          className="w-full flex items-center justify-between gap-3 min-h-[44px] text-left"
          aria-expanded={terbuka}
        >
          <span className="judul-3 text-n-900">Atur Satu per Satu</span>
          <span className="text-n-500 text-[18px]">{terbuka ? "−" : "+"}</span>
        </button>

        {terbuka && (
          <div className="mt-5 space-y-5">
            {BAGIAN.map((b) => (
              <div key={b.kunci} className="grid sm:grid-cols-[auto_1fr] gap-4 items-start">
                <input
                  type="color"
                  aria-label={`Pilih warna ${b.label}`}
                  value={sah(palet[b.kunci]) ? palet[b.kunci] : "#000000"}
                  onChange={(e) => {
                    setPalet({ ...palet, [b.kunci]: e.target.value });
                    setPesan(null);
                  }}
                  className="h-12 w-16 rounded-token border border-n-200 cursor-pointer bg-n-0 p-1"
                />
                <div>
                  <p className="text-n-800 font-medium text-[14.5px]">{b.label}</p>
                  <p className="teks-3 text-n-500 mb-2">{b.bantuan}</p>
                  <Isian
                    value={palet[b.kunci]}
                    onChange={(e) => {
                      setPalet({ ...palet, [b.kunci]: e.target.value });
                      setPesan(null);
                    }}
                    placeholder="#1b4a22"
                    className="max-w-[180px] font-mono"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Kartu>

      {/* Pratinjau langsung */}
      <Kartu className="p-5">
        <JudulSeksi>Pratinjau</JudulSeksi>
        <div className="rounded-token overflow-hidden border border-n-200">
          <div className="px-5 py-3 text-[13.5px]" style={{ backgroundColor: palet.dasar, color: warnaTeksTerbaik(palet.dasar) }}>
            Menu · Tentang · Agenda · Berita
          </div>
          <div className="px-5 py-8 space-y-3" style={{ backgroundColor: palet.halaman }}>
            <p className="text-[19px] font-bold" style={{ color: palet.dasar }}>
              Judul Besar Halaman
            </p>
            <p className="text-[14.5px]" style={{ color: palet.teks }}>
              Ini contoh tulisan biasa pada latar halaman, supaya Bapak bisa menilai apakah
              nyaman dibaca.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <span
                className="inline-flex items-center px-5 min-h-[42px] rounded-full text-[14px] font-semibold"
                style={{ backgroundColor: palet.tombol, color: warnaTeksTerbaik(palet.tombol) }}
              >
                Tombol Utama
              </span>
              <span
                className="inline-flex items-center px-5 min-h-[42px] rounded-full text-[14px] font-semibold border-2"
                style={{ borderColor: palet.dasar, color: palet.dasar }}
              >
                Tombol Kedua
              </span>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <span className="h-[3px] w-12 rounded" style={{ backgroundColor: palet.aksen }} />
              <span className="text-[12.5px] font-semibold uppercase tracking-wide" style={{ color: palet.aksen }}>
                Teks aksen
              </span>
            </div>
          </div>
        </div>

        {periksa && (
          <div className="mt-4 space-y-1.5">
            <p className={`text-[13.5px] ${periksa.rasioTeks >= 3.0 ? "text-ok-700" : "text-bahaya-700"}`}>
              Huruf di atas latar: kontras {periksa.rasioTeks.toFixed(1)}:1{" "}
              {periksa.rasioTeks >= 3.0 ? "(terbaca)" : "(terlalu samar)"}
            </p>
            <p className={`text-[13.5px] ${periksa.rasioTombol >= 3.0 ? "text-ok-700" : "text-bahaya-700"}`}>
              Tulisan di tombol: kontras {periksa.rasioTombol.toFixed(1)}:1{" "}
              {periksa.rasioTombol >= 3.0 ? "(terbaca)" : "(terlalu samar)"}
            </p>
          </div>
        )}
      </Kartu>

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
        <TombolUtama type="button" onClick={simpan} disabled={sedang || (periksa ? !periksa.aman : true)}>
          {sedang ? "Menyimpan…" : "Simpan Tema Warna"}
        </TombolUtama>
        <TombolSekunder type="button" onClick={() => setPalet(temaAwal)} disabled={sedang}>
          Kembalikan ke Sebelumnya
        </TombolSekunder>
      </div>

      <p className="teks-3 text-n-500">
        Setelah disimpan, warna langsung berlaku di seluruh website. Warna teks di atas tiap blok
        dihitung otomatis supaya selalu terbaca.
      </p>
    </div>
  );
}
