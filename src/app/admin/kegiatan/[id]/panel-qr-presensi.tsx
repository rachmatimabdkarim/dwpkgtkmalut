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
  judulKegiatan,
  tempat,
  rentangTanggal,
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
  judulKegiatan: string;
  tempat: string | null;
  rentangTanggal: string;
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

  /**
   * Menyusun satu gambar utuh (judul kegiatan, tanggal, tempat, QR, dan tautan)
   * lalu mengunduhnya. Dibuat di peramban supaya petugas bisa langsung
   * membagikannya lewat WhatsApp tanpa perlu mengolah lagi.
   */
  async function unduhGambar() {
    if (!dataUrl) return;
    const L = 900;
    const barisJudul = Math.min(3, Math.ceil(judulKegiatan.length / 32));
    const T = 880 + barisJudul * 34;
    const kanvas = document.createElement("canvas");
    kanvas.width = L;
    kanvas.height = T;
    const g = kanvas.getContext("2d");
    if (!g) return;

    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, L, T);

    const tengah = L / 2;
    g.textAlign = "center";

    // Kepala
    g.fillStyle = "#1B4A22";
    g.fillRect(0, 0, L, 10);

    g.fillStyle = "#6b7280";
    g.font = "500 20px Arial, sans-serif";
    g.fillText("DHARMA WANITA PERSATUAN", tengah, 66);
    g.fillText("KANTOR GTK PROVINSI MALUKU UTARA", tengah, 94);

    g.fillStyle = "#111827";
    g.font = "bold 30px Arial, sans-serif";
    g.fillText("PRESENSI KEGIATAN", tengah, 152);

    // Judul kegiatan (dipatahkan bila panjang)
    g.font = "bold 25px Arial, sans-serif";
    const kata = judulKegiatan.split(" ");
    const baris: string[] = [];
    let kini = "";
    for (const k of kata) {
      const coba = kini ? kini + " " + k : k;
      if (g.measureText(coba).width > L - 100) {
        baris.push(kini);
        kini = k;
      } else kini = coba;
    }
    if (kini) baris.push(kini);
    let y = 202;
    for (const b of baris.slice(0, 3)) {
      g.fillText(b, tengah, y);
      y += 34;
    }

    // Tanggal & tempat
    g.fillStyle = "#374151";
    g.font = "22px Arial, sans-serif";
    g.fillText(rentangTanggal, tengah, y + 12);
    if (tempat) g.fillText(tempat, tengah, y + 44);

    // QR
    const gambar = new Image();
    gambar.src = dataUrl;
    await new Promise<void>((selesai) => {
      gambar.onload = () => selesai();
      gambar.onerror = () => selesai();
    });
    const ukuran = 460;
    const qrAtas = y + 84;
    g.drawImage(gambar, tengah - ukuran / 2, qrAtas, ukuran, ukuran);

    // Keterangan
    g.fillStyle = "#111827";
    g.font = "bold 21px Arial, sans-serif";
    g.fillText("Pindai untuk mencatat kehadiran", tengah, qrAtas + ukuran + 52);

    g.fillStyle = "#6b7280";
    g.font = "18px Arial, sans-serif";
    g.fillText("Kehadiran dinyatakan sah setelah diperiksa petugas.", tengah, qrAtas + ukuran + 84);

    const alamat = tautan ? `${window.location.origin}${tautan}` : "";
    g.font = "16px Arial, sans-serif";
    g.fillText(alamat, tengah, qrAtas + ukuran + 114);

    const a = document.createElement("a");
    a.download = `presensi-${judulKegiatan.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.png`;
    a.href = kanvas.toDataURL("image/png");
    a.click();
  }

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
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-n-0 px-6 py-5 overflow-y-auto">
          <div className="text-center max-w-[560px]">
            <p className="teks-3 text-n-500 font-medium">Presensi Kegiatan</p>
            <h2 className="mt-1 text-[21px] font-bold text-n-900 leading-snug">
              {judulKegiatan}
            </h2>
            <p className="mt-1.5 text-[14.5px] text-n-700">{rentangTanggal}</p>
            {tempat && <p className="text-[14.5px] text-n-600">{tempat}</p>}
          </div>

          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt="Kode QR presensi"
              className="mt-4 w-[min(56vw,320px)] h-auto"
            />
          ) : (
            <p className="mt-8 teks-3 text-n-500">Menyiapkan kode QR…</p>
          )}

          <p className="mt-4 text-center text-[13.5px] text-n-600 max-w-[460px]">
            Buka kamera HP, arahkan ke kode ini, lalu isi nama Anda.
            Kehadiran dinyatakan sah setelah petugas memeriksa di lokasi.
          </p>

          <p className="mt-2 teks-3 text-n-400 break-all text-center max-w-[420px]">
            {typeof window !== "undefined" ? window.location.origin : ""}
            {tautan}
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <TombolUtama type="button" onClick={unduhGambar}>
              Unduh gambar QR
            </TombolUtama>
            <TombolSekunder type="button" onClick={() => setQrTampil(false)}>
              Tutup layar QR
            </TombolSekunder>
          </div>
        </div>
      )}
    </>
  );
}
