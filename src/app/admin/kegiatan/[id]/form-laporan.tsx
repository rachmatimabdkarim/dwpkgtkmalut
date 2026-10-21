"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Kartu,
  JudulSeksi,
  Isian,
  AreaTeks,
  Kolom,
  TombolUtama,
  TombolSekunder,
} from "@/components/dasar";
import { simpanLaporan, ubahTahap } from "./aksi";
import type { DataLaporan } from "@/lib/laporan-data";

/**
 * FORM ISIAN LAPORAN — hanya bagian yang TIDAK bisa ditarik otomatis.
 *
 * Semua yang sudah tercatat di aplikasi (panitia, presensi, RAB, foto) tidak
 * ditampilkan di sini karena sudah otomatis masuk lembar laporan. Yang diisi
 * di sini: realisasi per baris RAB, biaya di luar RAB, dan teks naratif.
 */
export function FormLaporan({
  activityId,
  data,
  bisaUbah,
  bisaAjukan = false,
}: {
  activityId: string;
  data: DataLaporan;
  bisaUbah: boolean;
  /** Boleh diajukan? Hanya saat kegiatan berstatus selesai (sebelum diajukan). */
  bisaAjukan?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [ringkasan, setRingkasan] = useState(data.isian.ringkasan);
  const [hasil, setHasil] = useState(data.isian.hasil);
  const [kendala, setKendala] = useState(data.isian.kendala);
  const [rekomendasi, setRekomendasi] = useState(data.isian.rekomendasi);
  const [catatanPenutup, setCatatanPenutup] = useState(data.isian.catatanPenutup);

  // Realisasi per baris RAB
  const [realisasi, setRealisasi] = useState<Record<string, string>>(
    Object.fromEntries(
      data.anggaran.baris.map((b) => [b.id, b.realisasi ? String(b.realisasi) : ""]),
    ),
  );
  const [biayaLainKet, setBiayaLainKet] = useState(data.anggaran.biayaLainKeterangan ?? "");
  const [biayaLainJml, setBiayaLainJml] = useState(
    data.anggaran.biayaLainJumlah ? String(data.anggaran.biayaLainJumlah) : "",
  );

  const [galat, setGalat] = useState("");
  const [pesan, setPesan] = useState("");

  const rupiah = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

  const totalRealisasi =
    data.anggaran.baris.reduce((n, b) => n + (Number(realisasi[b.id]) || 0), 0) +
    (Number(biayaLainJml) || 0);

  const beda = totalRealisasi - data.anggaran.totalRencana;

  function simpan() {
    setGalat("");
    setPesan("");
    if (!ringkasan.trim() || !hasil.trim()) {
      setGalat("Ringkasan pelaksanaan dan hasil yang dicapai wajib diisi.");
      return;
    }
    startTransition(async () => {
      const r = await simpanLaporan(activityId, kumpulkanIsian());
      if (r.galat) return setGalat(r.galat);
      setPesan("Draf laporan tersimpan. Silakan periksa pratinjau di bawah.");
      router.refresh();
    });
  }

  /** Menyusun isian form menjadi bentuk yang diterima server. */
  function kumpulkanIsian() {
    const angka: Record<string, number> = {};
    for (const [id, v] of Object.entries(realisasi)) {
      angka[id] = Number(v) || 0;
    }
    return {
      ringkasan,
      hasil,
      kendala,
      rekomendasi,
      jumlahHadir: data.presensi.hadir,
      catatanPenutup,
      biayaLainKeterangan: biayaLainKet,
      biayaLainJumlah: Number(biayaLainJml) || 0,
      realisasi: angka,
    };
  }

  /**
   * SIMPAN SEKALIGUS AJUKAN.
   * Isian disimpan lebih dulu supaya laporan yang diperiksa penyetuju tidak
   * pernah kosong — sama seperti perilaku tombol lama.
   */
  function ajukan() {
    setGalat("");
    setPesan("");
    if (!ringkasan.trim() || !hasil.trim()) {
      setGalat("Lengkapi ringkasan dan hasil sebelum mengajukan laporan.");
      return;
    }
    startTransition(async () => {
      const r = await simpanLaporan(activityId, kumpulkanIsian());
      if (r.galat) return setGalat(r.galat);
      const a = await ubahTahap(activityId, "ajukan_laporan", {
        ringkasan,
        hasil,
        kendala,
        rekomendasi,
        jumlahHadir: data.presensi.hadir,
      });
      if (a.galat) return setGalat(a.galat);
      setPesan("Laporan diajukan untuk persetujuan berjenjang.");
      router.refresh();
    });
  }

  return (
    <Kartu className="p-4 sm:p-5">
      <JudulSeksi>Isian laporan</JudulSeksi>
      <p className="teks-3 text-n-600 mt-1">
        Bagian kepanitiaan, presensi, dan dokumentasi diambil otomatis dari data kegiatan.
        Yang perlu diisi di sini hanya realisasi anggaran dan uraian pelaksanaan.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        {/* ---- Realisasi anggaran ---- */}
        {data.anggaran.baris.length > 0 && (
          <div className="rounded-token border border-n-200 p-3">
            <p className="text-[13.5px] font-semibold text-n-800">Realisasi anggaran</p>
            <p className="teks-3 text-n-500 mt-0.5">
              Isi nominal yang benar-benar dikeluarkan. Rencana sudah terisi dari RAB.
            </p>

            <div className="mt-3 flex flex-col gap-2">
              {data.anggaran.baris.map((b) => (
                <div
                  key={b.id}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-2 items-center"
                >
                  <div className="min-w-0">
                    <p className="text-[13.5px] text-n-800 break-words">{b.uraian}</p>
                    <p className="teks-3 text-n-500">
                      {b.jumlah} {b.satuan ?? ""} · Rencana {rupiah(b.rencana)}
                    </p>
                  </div>
                  <Isian
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="0"
                    value={realisasi[b.id] ?? ""}
                    onChange={(e) =>
                      setRealisasi((lama) => ({ ...lama, [b.id]: e.target.value }))
                    }
                    disabled={!bisaUbah}
                  />
                </div>
              ))}
            </div>

            {/* Biaya lain */}
            <div className="mt-4 pt-3 border-t border-n-200">
              <p className="text-[13.5px] font-semibold text-n-800">Biaya lain (di luar RAB)</p>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_170px] gap-2">
                <Isian
                  type="text"
                  placeholder="Contoh: sewa tenda, transportasi peserta luar daerah"
                  value={biayaLainKet}
                  onChange={(e) => setBiayaLainKet(e.target.value)}
                  disabled={!bisaUbah}
                />
                <Isian
                  type="number"
                  min={0}
                  placeholder="0"
                  value={biayaLainJml}
                  onChange={(e) => setBiayaLainJml(e.target.value)}
                  disabled={!bisaUbah}
                />
              </div>
            </div>

            {/* Ringkasan angka */}
            <div className="mt-3 rounded-token bg-n-50 p-2.5 flex flex-wrap gap-x-6 gap-y-1">
              <span className="text-[13px] text-n-700">
                Rencana: <strong>{rupiah(data.anggaran.totalRencana)}</strong>
              </span>
              <span className="text-[13px] text-n-700">
                Realisasi: <strong>{rupiah(totalRealisasi)}</strong>
              </span>
              <span
                className={`text-[13px] font-medium ${
                  beda > 0 ? "text-bad-fg" : "text-ok-fg"
                }`}
              >
                {beda > 0 ? "Melebihi" : "Hemat"}: {rupiah(Math.abs(beda))}
              </span>
            </div>
            {beda > 0 && (
              <p className="teks-3 text-warn-fg mt-1">
                Realisasi melebihi rencana. Pastikan ada dasar/persetujuan untuk kelebihan ini.
              </p>
            )}
          </div>
        )}

        {/* ---- Uraian ---- */}
        <Kolom label="Ringkasan pelaksanaan" bantuan="Wajib. 2–3 paragraf.">
          <AreaTeks
            value={ringkasan}
            onChange={(e) => setRingkasan(e.target.value)}
            disabled={!bisaUbah}
            rows={4}
          />
        </Kolom>

        <Kolom label="Hasil yang dicapai" bantuan="Wajib. Dampak nyata kegiatan.">
          <AreaTeks
            value={hasil}
            onChange={(e) => setHasil(e.target.value)}
            disabled={!bisaUbah}
            rows={3}
          />
        </Kolom>

        <Kolom label="Kendala" bantuan="Boleh dikosongkan bila tidak ada.">
          <AreaTeks
            value={kendala}
            onChange={(e) => setKendala(e.target.value)}
            disabled={!bisaUbah}
            rows={3}
          />
        </Kolom>

        <Kolom label="Rekomendasi / tindak lanjut" bantuan="Boleh dikosongkan.">
          <AreaTeks
            value={rekomendasi}
            onChange={(e) => setRekomendasi(e.target.value)}
            disabled={!bisaUbah}
            rows={3}
          />
        </Kolom>

        <Kolom label="Catatan penutup" bantuan="Boleh dikosongkan — memakai kalimat baku.">
          <AreaTeks
            value={catatanPenutup}
            onChange={(e) => setCatatanPenutup(e.target.value)}
            disabled={!bisaUbah}
            rows={2}
          />
        </Kolom>

        {galat && (
          <p className="rounded-token border border-bad-line bg-bad-bg px-3 py-2 text-[13px] text-bad-fg">
            {galat}
          </p>
        )}
        {pesan && (
          <p className="rounded-token border border-ok-line bg-ok-bg px-3 py-2 text-[13px] text-ok-fg">
            {pesan}
          </p>
        )}

        {bisaUbah && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Aksi utama di kiri; di layar lebar tombol tersusun sejajar rapi,
                di HP tetap turun ke bawah selebar wadahnya. */}
            <TombolUtama
              type="button"
              onClick={simpan}
              disabled={isPending}
              className="sm:w-auto w-full"
            >
              {isPending ? "Menyimpan…" : "Simpan draf"}
            </TombolUtama>
            <TombolSekunder
              type="button"
              onClick={() => router.refresh()}
              disabled={isPending}
              className="sm:w-auto w-full"
            >
              Segarkan pratinjau
            </TombolSekunder>
            {bisaAjukan && (
              <TombolUtama
                type="button"
                onClick={ajukan}
                disabled={isPending}
                className="sm:w-auto w-full"
              >
                {isPending ? "Mengajukan…" : "Simpan & Ajukan Laporan"}
              </TombolUtama>
            )}
          </div>
        )}
      </div>
    </Kartu>
  );
}
