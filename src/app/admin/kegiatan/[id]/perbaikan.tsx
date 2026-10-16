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
  tanggalMulai,
  tempat,
  ringkasan,
}: {
  activityId: string;
  tanggalMulai: string | null;
  tempat: string | null;
  ringkasan: string | null;
}) {
  const router = useRouter();
  const [terbuka, setTerbuka] = useState(false);
  const [sedang, setSedang] = useState(false);
  const [galat, setGalat] = useState("");
  const [berhasil, setBerhasil] = useState(false);

  const [tgl, setTgl] = useState(tanggalMulai ?? "");
  const [tmpt, setTmpt] = useState(tempat ?? "");
  const [ringkas, setRingkas] = useState(ringkasan ?? "");

  async function kirim() {
    setGalat("");
    setBerhasil(false);
    setSedang(true);
    const r = await perbaikiKegiatan(activityId, {
      tanggalMulai: tgl,
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
          Mengubah tanggal, tempat, atau ringkasan publik —{" "}
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
        <Kolom label="Tanggal mulai">
          <Isian type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} />
        </Kolom>
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
        <TombolUtama onClick={kirim} disabled={sedang}>
          {sedang ? "Menyimpan…" : "Simpan Perbaikan"}
        </TombolUtama>
        <TombolHalus onClick={() => setTerbuka(false)}>Batal</TombolHalus>
      </div>
    </Kartu>
  );
}
