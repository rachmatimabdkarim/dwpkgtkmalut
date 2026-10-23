"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TombolUtama, TombolHalus } from "@/components/dasar";
import { bukaArsip } from "./aksi-arsip";

/**
 * TOMBOL "BUKA DARI ARSIP"
 *
 * Muncul pada kegiatan yang sudah dikunci & diarsipkan. Alasannya wajib diisi
 * dan akan tercatat di riwayat kegiatan.
 */
export function BukaArsip({
  activityId,
  disabled,
}: {
  activityId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tanya, setTanya] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [galat, setGalat] = useState("");

  if (!tanya) {
    return (
      <div>
        <TombolUtama type="button" onClick={() => setTanya(true)} disabled={disabled}>
          Buka dari arsip
        </TombolUtama>
        <p className="teks-3 text-n-500 mt-2">
          Kegiatan akan dibuka kembali supaya dapat dilihat dan diperbaiki.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-token border border-n-200 bg-n-50 p-3">
      <p className="text-[13.5px] font-medium text-n-800">Alasan membuka arsip</p>
      <p className="teks-3 text-n-500 mt-0.5">
        Alasan ini tercatat di riwayat kegiatan dan bisa dibaca siapa pun yang berhak.
      </p>
      <textarea
        value={alasan}
        onChange={(e) => setAlasan(e.target.value)}
        rows={2}
        placeholder="Contoh: ada data laporan yang perlu diperbaiki"
        className="mt-2 w-full rounded-token border border-n-300 px-3 py-2 text-[14px] bg-n-0"
      />
      {galat && (
        <p className="mt-2 rounded-token border border-bad-line bg-bad-bg px-3 py-2 text-[13px] text-bad-fg">
          {galat}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <TombolUtama
          type="button"
          ukuran="kecil"
          disabled={isPending || alasan.trim().length < 10}
          onClick={() =>
            startTransition(async () => {
              setGalat("");
              const r = await bukaArsip(activityId, alasan);
              if (r.galat) return setGalat(r.galat);
              setTanya(false);
              setAlasan("");
              router.refresh();
            })
          }
        >
          {isPending ? "Membuka…" : "Buka sekarang"}
        </TombolUtama>
        <TombolHalus type="button" ukuran="kecil" onClick={() => setTanya(false)}>
          Batal
        </TombolHalus>
      </div>
    </div>
  );
}
