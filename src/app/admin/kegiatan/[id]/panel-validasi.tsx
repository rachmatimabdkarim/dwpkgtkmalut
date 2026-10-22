"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Kartu, JudulSeksi, TombolUtama, TombolHalus } from "@/components/dasar";
import { validasiLaporan, cabutValidasi } from "./aksi-validasi";

/**
 * PANEL VALIDASI KETUA DWP
 *
 * Muncul di tab Laporan. Nama Ketua sudah tercetak otomatis di area tanda
 * tangan; di sini Ketua menekan "Validasi" agar QR keaslian muncul.
 */
export function PanelValidasi({
  activityId,
  kode,
  divalidasiPada,
  bolehValidasi,
  statusLaporan,
}: {
  activityId: string;
  kode: string | null;
  divalidasiPada: string | null;
  bolehValidasi: boolean;
  statusLaporan: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [galat, setGalat] = useState("");
  const [pesan, setPesan] = useState("");

  if (!bolehValidasi && !kode) return null;

  return (
    <Kartu className="p-4 sm:p-5">
      <JudulSeksi>Validasi laporan</JudulSeksi>

      {kode ? (
        <>
          <p className="mt-1 text-[13.5px] text-ok-fg font-medium">
            ✓ Laporan sudah divalidasi
          </p>
          <p className="teks-3 text-n-600 mt-1">
            QR keaslian tercetak pada area tanda tangan laporan.
            {divalidasiPada && (
              <>
                {" "}
                Divalidasi{" "}
                {new Date(divalidasiPada).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                .
              </>
            )}
          </p>
          <p className="teks-3 text-n-500 mt-1 break-all">
            Kode: {kode} · /validasi/{kode}
          </p>

          {bolehValidasi && (
            <TombolHalus
              type="button"
              className="mt-3 text-bad-fg hover:bg-bad-bg"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  setGalat("");
                  setPesan("");
                  const r = await cabutValidasi(activityId);
                  if (r.galat) return setGalat(r.galat);
                  setPesan("Validasi dicabut. QR tidak berlaku lagi.");
                  router.refresh();
                })
              }
            >
              Cabut validasi
            </TombolHalus>
          )}
        </>
      ) : (
        <>
          <p className="mt-1 teks-3 text-n-600">
            Nama Ketua Dharma Wanita Persatuan sudah tercetak pada laporan.
            Setelah divalidasi, QR keaslian akan muncul di area tanda tangan.
          </p>
          {statusLaporan !== "laporan_disetujui" && (
            <p className="teks-3 text-warn-fg mt-2">
              Validasi dapat dilakukan setelah laporan disetujui penuh.
            </p>
          )}
          {bolehValidasi && statusLaporan === "laporan_disetujui" && (
            <TombolUtama
              type="button"
              className="mt-3"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  setGalat("");
                  setPesan("");
                  const r = await validasiLaporan(activityId);
                  if (r.galat) return setGalat(r.galat);
                  setPesan("Laporan divalidasi. QR keaslian sudah muncul.");
                  router.refresh();
                })
              }
            >
              {isPending ? "Memvalidasi…" : "Validasi laporan"}
            </TombolUtama>
          )}
        </>
      )}

      {galat && (
        <p className="mt-3 rounded-token border border-bad-line bg-bad-bg px-3 py-2 text-[13px] text-bad-fg">
          {galat}
        </p>
      )}
      {pesan && (
        <p className="mt-3 rounded-token border border-ok-line bg-ok-bg px-3 py-2 text-[13px] text-ok-fg">
          {pesan}
        </p>
      )}
    </Kartu>
  );
}
