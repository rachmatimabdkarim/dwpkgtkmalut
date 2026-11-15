"use client";

/**
 * FORMULIR: CATAT LAPORAN KEGIATAN LANGSUNG
 *
 * Satu halaman, tanpa langkah berjenjang. Dipakai untuk kegiatan yang sudah
 * terlaksana: kegiatan pusat/undangan yang diikuti Ketua atau anggota, atau
 * kegiatan lama sebelum sistem ini ada.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Kartu, Kolom, Isian, AreaTeks, Pilihan, TombolUtama } from "@/components/dasar";
import { catatKegiatanLangsung } from "../aksi-langsung";

export function FormLaporanLangsung({
  bidang,
}: {
  bidang: { id: string; nama: string }[];
}) {
  const router = useRouter();
  const [sedang, mulai] = useTransition();
  const [pesan, setPesan] = useState<{ jenis: "ok" | "bad"; teks: string } | null>(null);

  function kirim(form: FormData) {
    setPesan(null);
    mulai(async () => {
      const hasil = await catatKegiatanLangsung(form);
      if (!hasil.sukses) {
        setPesan({ jenis: "bad", teks: hasil.pesan });
        return;
      }
      setPesan({ jenis: "ok", teks: hasil.pesan });
      router.refresh();
      if (hasil.kegiatanId) {
        router.push(`/admin/kegiatan/${hasil.kegiatanId}`);
      }
    });
  }

  return (
    <form action={kirim} className="space-y-4">
      <Kartu>
        <p className="text-[15px] font-semibold text-n-800 mb-1">Kegiatan yang dilaporkan</p>
        <p className="teks-3 text-n-500 mb-4">
          Isi sesuai kejadian sebenarnya. Tanggal yang dipakai adalah tanggal kegiatan, bukan
          tanggal hari ini — kegiatan lama tetap tercatat pada tanggalnya.
        </p>

        <div className="space-y-4">
          <Kolom label="Nama kegiatan" bantuan="Contoh: Rapat Koordinasi DWP Tingkat Nasional">
            <Isian name="judul" required placeholder="Nama kegiatan yang dilaksanakan atau diikuti" />
          </Kolom>

          <div className="grid sm:grid-cols-2 gap-4">
            <Kolom label="Jenis kegiatan" bantuan="Menentukan penjelasan di web publik.">
              <Pilihan name="asal" defaultValue="pusat">
                <option value="pusat">Kegiatan pusat / undangan dari luar</option>
                <option value="dwp">Kegiatan DWP KGTK Malut sendiri</option>
              </Pilihan>
            </Kolom>
            <Kolom label="Bidang">
              <Pilihan name="bidang" defaultValue={bidang[0]?.id ?? ""}>
                {bidang.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nama}
                  </option>
                ))}
              </Pilihan>
            </Kolom>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Kolom label="Tanggal mulai">
              <Isian type="date" name="tanggalMulai" required />
            </Kolom>
            <Kolom label="Tanggal selesai" bantuan="Isi sama bila hanya satu hari.">
              <Isian type="date" name="tanggalSelesai" />
            </Kolom>
          </div>

          <Kolom label="Tempat">
            <Isian name="tempat" placeholder="Contoh: Hotel Santika, Jakarta" />
          </Kolom>

          <Kolom label="Peserta / yang menghadiri" bantuan="Ketik nama pengurus yang menghadiri atau jumlah peserta.">
            <Isian name="peserta" placeholder="Contoh: Ketua DWP dan 2 anggota" />
          </Kolom>

          <Kolom label="Uraian kegiatan">
            <AreaTeks name="uraian" rows={3} placeholder="Apa yang dilakukan dalam kegiatan ini" />
          </Kolom>

          <Kolom label="Hasil yang dicapai" bantuan="Dipakai sebagai ringkasan berita.">
            <AreaTeks name="hasil" rows={2} placeholder="Hasil atau keputusan penting dari kegiatan" />
          </Kolom>

          <Kolom label="Realisasi biaya (opsional)" bantuan="Kosongkan bila tanpa biaya.">
            <Isian name="realisasi" inputMode="numeric" placeholder="Contoh: 1500000" />
          </Kolom>

          <Kolom label="Publikasi" bantuan="Berita akan tertanggal sesuai tanggal kegiatan.">
            <Pilihan name="terbitkan" defaultValue="ya">
              <option value="ya">Terbitkan sebagai berita setelah divalidasi Ketua</option>
              <option value="tidak">Simpan sebagai catatan saja, tanpa berita</option>
            </Pilihan>
          </Kolom>
        </div>
      </Kartu>

      {pesan && (
        <p
          className={`rounded-token border px-3 py-2 text-[13.5px] ${
            pesan.jenis === "ok" ? "border-ok-200 bg-ok-50 text-ok-700" : "border-bad-line bg-bad-bg text-bad-fg"
          }`}
        >
          {pesan.teks}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <TombolUtama type="submit" disabled={sedang}>
          {sedang ? "Menyimpan…" : "Simpan Laporan"}
        </TombolUtama>
        <span className="teks-3 text-n-600">
          Setelah disimpan, laporan menunggu validasi Ketua sebelum tayang di web publik.
        </span>
      </div>
    </form>
  );
}
