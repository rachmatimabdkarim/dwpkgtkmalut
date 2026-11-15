"use client";

/**
 * PANEL VALIDASI LAPORAN KEGIATAN LANGSUNG
 *
 * Muncul pada kegiatan yang dicatat lewat jalur "Catat Laporan Kegiatan" dan
 * belum divalidasi. Hanya Ketua (dan Super Admin) yang melihat tombolnya.
 * Setelah divalidasi: kegiatan + beritanya tayang di web publik, tetap
 * tertanggal sesuai tanggal kegiatan.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Kartu, TombolUtama } from "@/components/dasar";
import { validasiKegiatanLangsung } from "../aksi-langsung";

export function PanelValidasiLangsung({
  activityId,
  sudahDivalidasi,
  bolehValidasi,
  tanggalKegiatan,
}: {
  activityId: string;
  sudahDivalidasi: boolean;
  bolehValidasi: boolean;
  tanggalKegiatan: string | null;
}) {
  const router = useRouter();
  const [sedang, mulai] = useTransition();
  const [pesan, setPesan] = useState<{ jenis: "ok" | "bad"; teks: string } | null>(null);

  if (!bolehValidasi && !sudahDivalidasi) {
    return (
      <Kartu>
        <p className="text-[14px] font-semibold text-n-800">Laporan kegiatan langsung</p>
        <p className="teks-3 text-n-600 mt-1">
          Laporan ini menunggu validasi Ketua sebelum tayang di web publik.
        </p>
      </Kartu>
    );
  }

  return (
    <Kartu>
      <p className="text-[14px] font-semibold text-n-800">Validasi laporan kegiatan langsung</p>
      <p className="teks-3 text-n-600 mt-1">
        {sudahDivalidasi
          ? "Sudah divalidasi Ketua. Kegiatan dan beritanya tayang tertanggal " +
            (tanggalKegiatan ?? "tanggal kegiatan") +
            "."
          : "Setelah divalidasi, kegiatan dan beritanya tayang di web publik dengan tanggal " +
            (tanggalKegiatan ?? "tanggal kegiatan") +
            " — bukan tanggal hari ini."}
      </p>

      {!sudahDivalidasi && bolehValidasi && (
        <div className="mt-3">
          <TombolUtama
            type="button"
            disabled={sedang}
            onClick={() =>
              mulai(async () => {
                const hasil = await validasiKegiatanLangsung(activityId);
                setPesan({ jenis: hasil.sukses ? "ok" : "bad", teks: hasil.pesan });
                if (hasil.sukses) router.refresh();
              })
            }
          >
            {sedang ? "Memvalidasi…" : "Validasi & Tayangkan"}
          </TombolUtama>
        </div>
      )}

      {pesan && (
        <p
          className={`mt-2 rounded-token border px-3 py-2 text-[13px] ${
            pesan.jenis === "ok" ? "border-ok-200 bg-ok-50 text-ok-700" : "border-bad-line bg-bad-bg text-bad-fg"
          }`}
        >
          {pesan.teks}
        </p>
      )}
    </Kartu>
  );
}
