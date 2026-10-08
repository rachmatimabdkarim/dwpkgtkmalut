"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Kartu,
  JudulSeksi,
  TombolSekunder,
  TombolBahaya,
  Lencana,
  Kosong,
  type NadaStatus,
} from "@/components/dasar";
import { formatUkuranByte, type HasilPenyapu } from "@/lib/penyapu";
import {
  jalankanPenyapuAksi,
  type StatistikPenyimpanan,
  type BarisLogBerkas,
} from "./aksi";

const BATAS_GRATIS_BYTE = 1024 * 1024 * 1024; // 1 GB (1.073.741.824 byte)

function formatTanggal(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jayapura", // WIT
    }).format(d) + " WIT";
  } catch {
    return iso;
  }
}

function lencanaAksi(aksi: string): { label: string; nada: NadaStatus } {
  switch (aksi) {
    case "unggah":
      return { label: "Unggah", nada: "brand" };
    case "resmi":
      return { label: "Resmi", nada: "ok" };
    case "ganti":
      return { label: "Ganti", nada: "warn" };
    case "hapus":
      return { label: "Hapus", nada: "bad" };
    case "bersih_otomatis":
      return { label: "Bersih Otomatis", nada: "warn" };
    case "sapu":
      return { label: "Sapu", nada: "warn" };
    default:
      return { label: aksi, nada: "netral" };
  }
}

export function PanelPenyimpanan({ dataAwal }: { dataAwal: StatistikPenyimpanan }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [hasilProses, setHasilProses] = useState<HasilPenyapu | null>(null);
  const [bukaKonfirmasi, setBukaKonfirmasi] = useState(false);
  const [pesanGalat, setPesanGalat] = useState("");

  const totalByte = dataAwal.total_byte;
  const persen = Math.min(100, Number(((totalByte / BATAS_GRATIS_BYTE) * 100).toFixed(2)));

  // Penentuan warna berdasarkan persentase
  let warnaBilah = "bg-ok-fg";
  let nadaStatus: NadaStatus = "ok";
  if (persen >= 90) {
    warnaBilah = "bg-bad-fg";
    nadaStatus = "bad";
  } else if (persen >= 70) {
    warnaBilah = "bg-warn-fg";
    nadaStatus = "warn";
  }

  function handleJalankan(ujiCoba: boolean) {
    setPesanGalat("");
    startTransition(async () => {
      try {
        const res = await jalankanPenyapuAksi(ujiCoba);
        setHasilProses(res);
        setBukaKonfirmasi(false);
        router.refresh();
      } catch (err) {
        setPesanGalat(err instanceof Error ? err.message : "Gagal menjalankan penyapu");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Peringatan Kapasitas bila >= 70% atau >= 90% */}
      {persen >= 90 ? (
        <div className="rounded-token p-4 bg-bad-bg border border-bad-line text-bad-fg">
          <div className="flex items-start gap-3">
            <span className="font-semibold text-[15px]">Peringatan Kritis Penyimpanan</span>
          </div>
          <p className="teks-3 mt-1">
            Penggunaan penyimpanan telah melampaui <strong>90%</strong> ({persen}% dari batas 1 GB).
            Segera bersihkan berkas sementara atau berkas yatim yang tidak terikat data agar pengunggahan berkas baru tidak terhenti.
          </p>
        </div>
      ) : persen >= 70 ? (
        <div className="rounded-token p-4 bg-warn-bg border border-warn-line text-warn-fg">
          <div className="flex items-start gap-3">
            <span className="font-semibold text-[15px]">Peringatan Kapasitas Penyimpanan</span>
          </div>
          <p className="teks-3 mt-1">
            Penggunaan penyimpanan telah mencapai <strong>70%</strong> ({persen}% dari batas 1 GB).
            Disarankan untuk memantau penggunaan dan menjalankan penyapu berkas yatim.
          </p>
        </div>
      ) : null}

      {/* Peringatan Penjeda bila sebelumnya ada pemberitahuan penyapu dijeda */}
      {dataAwal.pemberitahuanPenyapu?.dijeda && (
        <div className="rounded-token p-4 bg-warn-bg border border-warn-line text-warn-fg">
          <span className="font-semibold text-[15px] block">Pemberitahuan Sistem Penyapu</span>
          <p className="teks-3 mt-1">
            {dataAwal.pemberitahuanPenyapu.pesan ||
              "Penyapu berkas otomatis sempat dijeda karena jumlah kandidat berkas melebihi batas pengaman."}
          </p>
        </div>
      )}

      {/* Galat jika aksi gagal */}
      {pesanGalat && (
        <div className="rounded-token p-4 bg-bad-bg border border-bad-line text-bad-fg">
          <p className="teks-3 font-medium">{pesanGalat}</p>
        </div>
      )}

      {/* 1. KARTU RINGKASAN KAPASITAS */}
      <Kartu className="p-5 sm:p-6">
        <JudulSeksi
          aksi={
            <Lencana nada={nadaStatus}>
              {persen >= 90 ? "Kritis" : persen >= 70 ? "Waspada" : "Aman"}
            </Lencana>
          }
        >
          Kapasitas Penyimpanan
        </JudulSeksi>

        <div className="mt-4">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="judul-1 text-n-900">{formatUkuranByte(totalByte)}</span>
              <span className="text-n-500 teks-3 ml-2">terpakai dari 1 GB (1.024 MB)</span>
            </div>
            <span className="judul-2 text-n-800 font-semibold">{persen}%</span>
          </div>

          {/* Bilah Kemajuan (Progress Bar) */}
          <div className="w-full bg-n-200 h-3.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${warnaBilah}`}
              style={{ width: `${Math.max(1, persen)}%` }}
            />
          </div>
        </div>

        {/* Rincian Wadah */}
        <div className="mt-6 pt-6 border-t border-n-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-n-50 rounded-token border border-n-200">
            <span className="teks-3 text-n-500 block mb-1">Total Berkas</span>
            <span className="judul-2 text-n-800">{dataAwal.jumlah_berkas.toLocaleString("id-ID")}</span>
          </div>
          <div className="p-3 bg-n-50 rounded-token border border-n-200">
            <span className="teks-3 text-n-500 block mb-1">Wadah Publik</span>
            <span className="judul-2 text-n-800">{formatUkuranByte(dataAwal.byte_publik)}</span>
          </div>
          <div className="p-3 bg-n-50 rounded-token border border-n-200">
            <span className="teks-3 text-n-500 block mb-1">Wadah Internal</span>
            <span className="judul-2 text-n-800">{formatUkuranByte(dataAwal.byte_internal)}</span>
          </div>
          <div className="p-3 bg-n-50 rounded-token border border-n-200">
            <span className="teks-3 text-n-500 block mb-1">Folder Sementara (tmp)</span>
            <span className="judul-2 text-n-800">{dataAwal.jumlah_sementara.toLocaleString("id-ID")}</span>
          </div>
        </div>
      </Kartu>

      {/* 2. STATISTIK BULAN INI & AKSI PENYAPU */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tiga Baris Statistik */}
        <Kartu className="p-5 sm:p-6 lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="judul-2 text-n-800 mb-4">Aktivitas Bulan Ini</h3>
            <div className="space-y-4">
              <div className="border-b border-n-100 pb-3">
                <span className="teks-3 text-n-500 block">Berkas Dibersihkan Otomatis</span>
                <span className="judul-2 text-n-800 font-semibold">
                  {dataAwal.dibersihkanBulanIni.toLocaleString("id-ID")} berkas
                </span>
              </div>
              <div className="border-b border-n-100 pb-3">
                <span className="teks-3 text-n-500 block">Ukuran yang Dibebaskan</span>
                <span className="judul-2 text-ok-fg font-semibold">
                  {formatUkuranByte(dataAwal.ukuranDibebaskanBulanIni)}
                </span>
              </div>
              <div>
                <span className="teks-3 text-n-500 block">Riwayat Log</span>
                <a
                  href="#catatan-berkas"
                  className="teks-3 text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1 mt-1"
                >
                  Lihat catatan berkas &darr;
                </a>
              </div>
            </div>
          </div>
        </Kartu>

        {/* Tindakan Penyapu Berkas */}
        <Kartu className="p-5 sm:p-6 lg:col-span-2">
          <JudulSeksi>Operasi Penyapu Berkas</JudulSeksi>
          <p className="teks-3 text-n-600 mb-4 leading-relaxed">
            Penyapu memeriksa berkas di wadah publik dan mendeteksi berkas yang tidak terikat pada data kegiatan,
            berita, profil, maupun identitas situs, serta berkas sementara di folder <code>tmp/</code> yang berumur lebih dari 1 jam.
            Dilengkapi pengaman maksimal 50 berkas atau 20% total objek per proses.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <TombolSekunder
              disabled={isPending}
              onClick={() => handleJalankan(true)}
              className="min-h-[44px]"
            >
              {isPending ? "Memproses…" : "Jalankan Uji Coba Penyapu"}
            </TombolSekunder>

            <TombolBahaya
              disabled={isPending}
              onClick={() => setBukaKonfirmasi(true)}
              className="min-h-[44px]"
            >
              Jalankan Penyapu
            </TombolBahaya>
          </div>

          {/* Konfirmasi Penghapusan Permanen */}
          {bukaKonfirmasi && (
            <div className="mt-4 p-4 rounded-token bg-bad-bg border border-bad-line text-bad-fg">
              <span className="font-semibold block mb-1 text-[15px]">
                Konfirmasi Pembersihan Permanen
              </span>
              <p className="teks-3 mb-3">
                Penyapu akan menghapus fisik berkas yatim dan berkas sementara yang kedaluwarsa.
                Tindakan ini permanen dan tidak dapat dibatalkan. Pastikan Anda telah menguji coba terlebih dahulu.
              </p>
              <div className="flex items-center gap-2">
                <TombolBahaya
                  ukuran="kecil"
                  disabled={isPending}
                  onClick={() => handleJalankan(false)}
                >
                  {isPending ? "Sedang Menghapus…" : "Ya, Hapus Berkas Yatim"}
                </TombolBahaya>
                <TombolSekunder
                  ukuran="kecil"
                  disabled={isPending}
                  onClick={() => setBukaKonfirmasi(false)}
                >
                  Batal
                </TombolSekunder>
              </div>
            </div>
          )}

          {/* Ringkasan Hasil Eksekusi */}
          {hasilProses && (
            <div className="mt-5 p-4 rounded-token bg-n-50 border border-n-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-semibold text-n-800 text-[15px]">
                  Hasil Penyapu ({hasilProses.ujiCoba ? "Mode Uji Coba" : "Eksekusi Nyata"})
                </span>
                <Lencana nada={hasilProses.dijeda ? "warn" : hasilProses.sukses ? "ok" : "bad"}>
                  {hasilProses.dijeda ? "Dijeda Pengaman" : hasilProses.sukses ? "Selesai" : "Gagal"}
                </Lencana>
              </div>

              {hasilProses.alasanJeda && (
                <p className="teks-3 text-warn-fg mb-2 bg-warn-bg p-2 rounded-token border border-warn-line">
                  {hasilProses.alasanJeda}
                </p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 teks-3 text-n-700 mt-2">
                <div>
                  <span className="text-n-500 block">Diperiksa:</span>
                  <span className="font-medium">{hasilProses.jumlahDiperiksa} objek</span>
                </div>
                <div>
                  <span className="text-n-500 block">
                    {hasilProses.ujiCoba ? "Kandidat Hapus:" : "Dihapus:"}
                  </span>
                  <span className="font-medium text-bad-fg font-semibold">
                    {hasilProses.jumlahDihapus} berkas
                  </span>
                </div>
                <div>
                  <span className="text-n-500 block">Dijeda:</span>
                  <span className="font-medium">{hasilProses.jumlahDijeda} berkas</span>
                </div>
                <div>
                  <span className="text-n-500 block">Ukuran Dibebaskan:</span>
                  <span className="font-medium text-ok-fg font-semibold">
                    {formatUkuranByte(hasilProses.totalUkuranDibebaskan)}
                  </span>
                </div>
              </div>

              {hasilProses.daftarBerkas.length > 0 && (
                <details className="mt-3 text-n-700 teks-3">
                  <summary className="cursor-pointer text-brand-600 hover:underline font-medium">
                    Lihat daftar berkas ({hasilProses.daftarBerkas.length})
                  </summary>
                  <ul className="mt-2 max-h-40 overflow-y-auto space-y-1 bg-n-0 p-2 rounded border border-n-200 text-[12px] font-mono text-n-600">
                    {hasilProses.daftarBerkas.map((b, idx) => (
                      <li key={idx} className="truncate">
                        {b}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </Kartu>
      </div>

      {/* 3. TABEL CATATAN BERKAS TERAKHIR (25 BARIS) */}
      <div id="catatan-berkas" className="scroll-mt-6">
        <Kartu className="p-5 sm:p-6">
          <JudulSeksi>Catatan Aktivitas Berkas Terakhir</JudulSeksi>
        <p className="teks-3 text-n-500 mb-4">
          Menampilkan hingga 25 aktivitas berkas terbaru (unggah, pengesahan, penggantian, dan penyapuan).
        </p>

        {dataAwal.catatanLog.length === 0 ? (
          <Kosong pesan="Belum ada catatan aktivitas berkas yang tersimpan." />
        ) : (
          <div>
            {/* Tampilan Desktop: Tabel */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-[14px]">
                <thead>
                  <tr className="border-b border-n-200 text-n-500 teks-3">
                    <th className="py-2.5 px-3 font-medium">Waktu</th>
                    <th className="py-2.5 px-3 font-medium">Nama Berkas</th>
                    <th className="py-2.5 px-3 font-medium">Aksi</th>
                    <th className="py-2.5 px-3 font-medium">Alasan</th>
                    <th className="py-2.5 px-3 font-medium">Pelaku</th>
                    <th className="py-2.5 px-3 font-medium text-right">Ukuran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-n-100 text-n-800">
                  {dataAwal.catatanLog.map((log: BarisLogBerkas) => {
                    const lencana = lencanaAksi(log.aksi);
                    return (
                      <tr key={log.id} className="hover:bg-n-50/60">
                        <td className="py-3 px-3 whitespace-nowrap text-n-600 text-[13px]">
                          {formatTanggal(log.waktu)}
                        </td>
                        <td className="py-3 px-3 max-w-[220px]">
                          <span className="block truncate font-medium text-n-800" title={log.nama_asli || log.path || "-"}>
                            {log.nama_asli || log.path?.split("/").pop() || "-"}
                          </span>
                          {log.path && (
                            <span className="block truncate text-[11px] text-n-400 font-mono" title={log.path}>
                              {log.path}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <Lencana nada={lencana.nada}>{lencana.label}</Lencana>
                        </td>
                        <td className="py-3 px-3 text-n-600 text-[13px]">
                          {log.alasan || "-"}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-[13px] text-n-700">
                          {log.pelaku_nama || (log.pemicu === "penyapu" ? "Penyapu Otomatis" : log.pemicu)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-right text-n-600 text-[13px]">
                          {log.ukuran_byte ? formatUkuranByte(log.ukuran_byte) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tampilan HP: Kartu bertumpuk (Mobile-first) */}
            <div className="sm:hidden space-y-3">
              {dataAwal.catatanLog.map((log: BarisLogBerkas) => {
                const lencana = lencanaAksi(log.aksi);
                return (
                  <div key={log.id} className="p-3 bg-n-50 rounded-token border border-n-200 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Lencana nada={lencana.nada}>{lencana.label}</Lencana>
                      <span className="text-[12px] text-n-500">{formatTanggal(log.waktu)}</span>
                    </div>
                    <div>
                      <span className="font-medium text-n-800 text-[14px] block break-all">
                        {log.nama_asli || log.path?.split("/").pop() || "-"}
                      </span>
                      {log.path && (
                        <span className="text-[11px] text-n-400 font-mono block break-all">
                          {log.path}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[12px] text-n-600 pt-1 border-t border-n-200/60">
                      <span>Alasan: {log.alasan || "-"}</span>
                      <span>{log.ukuran_byte ? formatUkuranByte(log.ukuran_byte) : ""}</span>
                    </div>
                    <div className="text-[12px] text-n-500">
                      Pelaku: {log.pelaku_nama || (log.pemicu === "penyapu" ? "Penyapu Otomatis" : log.pemicu)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Kartu>
      </div>
    </div>
  );
}
