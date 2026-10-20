"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Kartu, JudulSeksi, TombolUtama, TombolSekunder, TombolHalus } from "@/components/dasar";
import { siapkanQr, bukaPaksa, tutupPaksa } from "./aksi-presensi-qr";

/**
 * PANEL QR PRESENSI — bagian atas tab Presensi, khusus petugas.
 *
 * Isinya:
 *  1. Jendela waktu presensi (tanggal dari kegiatan, JAM diatur petugas).
 *  2. Tombol "Tampilkan QR" — layar penuh untuk proyektor atau cetak.
 *  3. Tombol "Buka di luar jadwal" — wajib beralasan, tercatat di riwayat.
 *
 * Semua tindakan hanya muncul untuk pengelola presensi / penanggung jawab;
 * server memeriksa ulang.
 */
export function PanelQrPresensi({
  activityId,
  kode,
  jamMulai,
  jamSelesai,
  dibukaPaksa,
  alasanPaksa,
  tanggalMulai,
  tanggalSelesai,
  statusTerbuka,
  sebab,
  bolehKelola,
  terkunci,
}: {
  activityId: string;
  kode: string | null;
  jamMulai: string;
  jamSelesai: string;
  dibukaPaksa: boolean;
  alasanPaksa: string | null;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  statusTerbuka: boolean;
  sebab: string;
  bolehKelola: boolean;
  terkunci: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [jamBuka, setJamBuka] = useState(jamMulai);
  const [jamTutup, setJamTutup] = useState(jamSelesai);
  const [galat, setGalat] = useState("");
  const [qrTampil, setQrTampil] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [tanyaAlasan, setTanyaAlasan] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const tautan = kode ? `/presensi/${kode}` : null;

  // Gambar QR dibuat di peramban supaya tidak membebani server.
  useEffect(() => {
    if (!tautan) return;
    const alamat = `${window.location.origin}${tautan}`;
    import("qrcode")
      .then((QR) => QR.toDataURL(alamat, { width: 640, margin: 1 }))
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [tautan]);

  const bolehUbah = bolehKelola && !terkunci;

  return (
    <>
      <Kartu className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <JudulSeksi>Presensi lewat QR</JudulSeksi>
            <p className="teks-3 text-n-600 mt-1">
              Peserta memindai QR, mengisi nama, lalu petugas mengonfirmasi kehadiran di lokasi.
            </p>
          </div>
          <span
            className={`inline-flex h-8 items-center rounded-full px-3 text-[12.5px] font-semibold ${
              statusTerbuka ? "bg-brand-50 text-brand-700" : "bg-warn-bg text-warn-fg"
            }`}
          >
            {statusTerbuka ? "Terbuka" : "Tertutup"}
          </span>
        </div>

        <p className="teks-3 text-n-600 mt-2">{sebab}</p>
        {dibukaPaksa && alasanPaksa && (
          <p className="teks-3 text-warn-fg mt-1">
            Dibuka di luar jadwal. Alasan: {alasanPaksa}
          </p>
        )}

        {/* Jendela waktu */}
        {bolehUbah ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
            <label className="block">
              <span className="block teks-3 text-n-700 mb-1 font-medium">
                Jam buka ({tanggalMulai ?? "tanggal kegiatan"})
              </span>
              <input
                type="time"
                value={jamBuka}
                onChange={(e) => setJamBuka(e.target.value)}
                className="w-full min-h-[44px] rounded-token border border-n-300 px-3 text-[15px] bg-n-0"
              />
            </label>
            <label className="block">
              <span className="block teks-3 text-n-700 mb-1 font-medium">
                Jam tutup ({tanggalSelesai ?? "tanggal selesai"})
              </span>
              <input
                type="time"
                value={jamTutup}
                onChange={(e) => setJamTutup(e.target.value)}
                className="w-full min-h-[44px] rounded-token border border-n-300 px-3 text-[15px] bg-n-0"
              />
            </label>
            <TombolSekunder
              type="button"
              disabled={isPending}
              onClick={() => {
                setGalat("");
                startTransition(async () => {
                  const r = await siapkanQr(activityId, jamBuka, jamTutup);
                  if (r.galat) setGalat(r.galat);
                  else router.refresh();
                });
              }}
            >
              Simpan jam
            </TombolSekunder>
          </div>
        ) : (
          <p className="teks-3 text-n-600 mt-3">
            Jam presensi: {jamMulai} – {jamSelesai}
          </p>
        )}

        {galat && (
          <p className="mt-3 teks-3 text-bad-fg rounded-token border border-bad-line bg-bad-bg p-2.5">
            {galat}
          </p>
        )}

        {/* Tombol QR */}
        <div className="mt-4 flex flex-wrap gap-2">
          {tautan ? (
            <TombolUtama type="button" onClick={() => setQrTampil(true)}>
              Tampilkan QR
            </TombolUtama>
          ) : (
            bolehUbah && (
              <p className="teks-3 text-n-500">
                Simpan jam dulu untuk membuat kode QR.
              </p>
            )
          )}

          {bolehUbah &&
            (dibukaPaksa ? (
              <TombolSekunder
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await tutupPaksa(activityId);
                    if (r.galat) setGalat(r.galat);
                    else router.refresh();
                  })
                }
              >
                Tutup sesuai jadwal
              </TombolSekunder>
            ) : (
              <TombolSekunder type="button" onClick={() => setTanyaAlasan(true)}>
                Buka di luar jadwal
              </TombolSekunder>
            ))}
        </div>

        {bolehUbah && tanyaAlasan && (
          <div className="mt-3 rounded-token border border-n-200 bg-n-50 p-3">
            <p className="teks-3 text-n-700 font-medium">Alasan membuka presensi di luar jadwal</p>
            <p className="teks-3 text-n-500 mt-0.5">
              Alasan ini tercatat di riwayat kegiatan dan bisa dibaca siapa pun yang berhak.
            </p>
            <textarea
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              rows={2}
              placeholder="Contoh: peserta dari luar daerah baru tiba pukul 16.30"
              className="mt-2 w-full rounded-token border border-n-300 px-3 py-2 text-[14px] bg-n-0"
            />
            <div className="mt-2 flex gap-2">
              <TombolUtama
                type="button"
                ukuran="kecil"
                disabled={isPending || alasan.trim().length < 10}
                onClick={() =>
                  startTransition(async () => {
                    const r = await bukaPaksa(activityId, alasan);
                    if (r.galat) setGalat(r.galat);
                    else {
                      setTanyaAlasan(false);
                      setAlasan("");
                      router.refresh();
                    }
                  })
                }
              >
                Buka sekarang
              </TombolUtama>
              <TombolHalus type="button" ukuran="kecil" onClick={() => setTanyaAlasan(false)}>
                Batal
              </TombolHalus>
            </div>
          </div>
        )}
      </Kartu>

      {/* ===== LAYAR QR PENUH ===== */}
      {qrTampil && tautan && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-n-0 p-6">
          <div className="text-center">
            <p className="teks-3 text-n-500 font-medium">Presensi Kegiatan</p>
            <h2 className="mt-1 text-[20px] font-bold text-n-900">
              Pindai untuk mencatat kehadiran
            </h2>
          </div>

          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt="Kode QR presensi"
              className="mt-5 w-[min(78vw,380px)] h-auto"
            />
          ) : (
            <p className="mt-8 teks-3 text-n-500">Menyiapkan kode QR…</p>
          )}

          <p className="mt-5 text-center text-[14px] text-n-600 max-w-[420px]">
            Buka kamera HP, arahkan ke kode ini, lalu isi nama Anda.
            Kehadiran dinyatakan sah setelah petugas memeriksa di lokasi.
          </p>

          <p className="mt-2 teks-3 text-n-400 break-all text-center max-w-[420px]">
            {typeof window !== "undefined" ? window.location.origin : ""}
            {tautan}
          </p>

          <TombolUtama type="button" className="mt-6" onClick={() => setQrTampil(false)}>
            Tutup layar QR
          </TombolUtama>
        </div>
      )}
    </>
  );
}
