"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Kartu, JudulSeksi, TombolUtama, TombolSekunder, TombolHalus, Kolom, Isian, AreaTeks,
} from "@/components/dasar";
import { perbaikiKegiatan } from "../aksi";

/**
 * Pengusul memperbaiki data kegiatan secara langsung.
 *
 * Dipakai selagi laporan belum diajukan — supaya pengusul tidak perlu
 * "mengajukan perubahan kepada dirinya sendiri". Setelah laporan diajukan,
 * perbaikan harus lewat pengajuan perubahan resmi dan tombol ini tidak muncul.
 */
export function PanelPerbaikan({
  activityId,
  judul,
  tujuan,
  sasaran,
  tanggalMulai,
  tanggalSelesai,
  tempat,
  ringkasan,
}: {
  activityId: string;
  judul: string;
  tujuan: string | null;
  sasaran: string | null;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  tempat: string | null;
  ringkasan: string | null;
}) {
  const router = useRouter();
  const [terbuka, setTerbuka] = useState(false);
  const [sedang, setSedang] = useState(false);
  const [galat, setGalat] = useState("");
  const [berhasil, setBerhasil] = useState(false);

  const [nm, setNm] = useState(judul);
  const [tj, setTj] = useState(tujuan ?? "");
  const [ss, setSs] = useState(sasaran ?? "");
  const [tgl, setTgl] = useState(tanggalMulai ?? "");
  const [tglSelesai, setTglSelesai] = useState(tanggalSelesai ?? "");
  const [tmpt, setTmpt] = useState(tempat ?? "");
  const [ringkas, setRingkas] = useState(ringkasan ?? "");

  async function kirim() {
    setGalat("");
    setBerhasil(false);
    setSedang(true);
    const r = await perbaikiKegiatan(activityId, {
      judul: nm,
      tujuan: tj,
      sasaran: ss,
      tanggalMulai: tgl,
      tanggalSelesai: tglSelesai,
      tempat: tmpt,
      ringkasan: ringkas,
    });
    setSedang(false);
    if (r?.galat) return setGalat(r.galat);
    setBerhasil(true);
    setTerbuka(false);
    router.refresh();
  }

  if (!terbuka) {
    return (
      <div>
        {berhasil && (
          <p className="mb-3 rounded-token border border-ok-line bg-ok-bg px-3 py-2 text-[13px] text-ok-fg">
            Perbaikan tersimpan dan tercatat di riwayat kegiatan.
          </p>
        )}
        <TombolSekunder onClick={() => setTerbuka(true)}>
          Perbaiki Data Kegiatan
        </TombolSekunder>
        <p className="mt-2 text-[12.5px] text-n-500">
          Mengubah <strong>seluruh data kegiatan</strong> — nama, tujuan, sasaran,
          tanggal, tempat, dan ringkasan publik —{" "}
          <strong>langsung tersimpan</strong>, tidak perlu persetujuan ulang.
        </p>
      </div>
    );
  }

  return (
    <Kartu className="p-4 sm:p-5">
      <JudulSeksi>Perbaiki Data Kegiatan</JudulSeksi>
      <p className="teks-3 text-n-500 mb-4">
        Karena Anda pengusul kegiatan ini, Anda dapat memperbaikinya langsung.
        Setiap perbaikan tercatat di riwayat.
      </p>

      {galat && (
        <p className="mb-3 rounded-token border border-bad-line bg-bad-bg px-3 py-2 text-[13px] text-bad-fg">
          {galat}
        </p>
      )}

      <div className="space-y-4">
        <Kolom label="Nama kegiatan">
          <Isian value={nm} onChange={(e) => setNm(e.target.value)} />
        </Kolom>
        <Kolom label="Tujuan kegiatan" bantuan="Ditulis singkat; dipakai sebagai ringkasan di agenda publik.">
          <AreaTeks value={tj} onChange={(e) => setTj(e.target.value)} />
        </Kolom>
        <Kolom label="Sasaran peserta">
          <Isian
            value={ss}
            onChange={(e) => setSs(e.target.value)}
            placeholder="Contoh: 30 anggota DWP"
          />
        </Kolom>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Kolom label="Tanggal mulai">
            <Isian type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} />
          </Kolom>
          <Kolom
            label="Tanggal selesai"
            bantuan="Kosongkan bila satu hari."
            galat={
              tgl && tglSelesai && tglSelesai < tgl
                ? "Tidak boleh lebih awal dari tanggal mulai."
                : undefined
            }
          >
            <Isian
              type="date"
              value={tglSelesai}
              onChange={(e) => setTglSelesai(e.target.value)}
            />
          </Kolom>
        </div>
        <Kolom label="Tempat">
          <Isian
            value={tmpt}
            onChange={(e) => setTmpt(e.target.value)}
            placeholder="Contoh: Aula Kantor GTK Malut, Tidore"
          />
        </Kolom>
        <Kolom
          label="Ringkasan untuk publik"
          bantuan="Muncul di halaman Agenda. Boleh dikosongkan."
        >
          <AreaTeks
            value={ringkas}
            onChange={(e) => setRingkas(e.target.value)}
            placeholder="Satu sampai dua kalimat"
          />
        </Kolom>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <TombolUtama
          onClick={kirim}
          disabled={sedang || (!!tgl && !!tglSelesai && tglSelesai < tgl) || !nm.trim()}
        >
          {sedang ? "Menyimpan…" : "Simpan Perbaikan"}
        </TombolUtama>
        <TombolHalus onClick={() => setTerbuka(false)}>Batal</TombolHalus>
      </div>
    </Kartu>
  );
}
