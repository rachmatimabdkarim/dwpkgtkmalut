import Link from "next/link";
import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajib } from "@/lib/sesi-server";
import { klienServer } from "@/lib/supabase-server";
import { Kartu, Lencana, type NadaStatus } from "@/components/dasar";
import { formatTanggal, labelStatus } from "@/lib/kegiatan";

export const metadata = { title: "Kalender Kegiatan" };
export const instant = false;

const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const HARI_PEKAN = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

type KegiatanKalender = {
  id: string;
  kode: string | null;
  judul: string;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  tempat: string | null;
  status: string;
};

function warnaStatus(status: string): { bg: string; teks: string; border: string; nada: NadaStatus } {
  if (["disetujui", "selesai", "laporan_disetujui", "arsip"].includes(status)) {
    return { bg: "bg-ok-bg", teks: "text-ok-fg", border: "border-ok-line", nada: "ok" };
  }
  if (["diajukan", "dalam_review", "laporan_diajukan", "laporan_dalam_review"].includes(status)) {
    return { bg: "bg-warn-bg", teks: "text-warn-fg", border: "border-warn-line", nada: "warn" };
  }
  if (["revisi", "ditolak"].includes(status)) {
    return { bg: "bg-bad-bg", teks: "text-bad-fg", border: "border-bad-line", nada: "bad" };
  }
  if (status === "berjalan") {
    return { bg: "bg-brand-50", teks: "text-brand-700", border: "border-brand-200", nada: "brand" };
  }
  return { bg: "bg-n-100", teks: "text-n-600", border: "border-n-200", nada: "netral" };
}

export default async function HalamanKalender({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string; tahun?: string }>;
}) {
  const pengguna = await sesiWajib();
  const { bulan: paramBulan, tahun: paramTahun } = await searchParams;

  const sekarang = new Date();
  const tahunIni = sekarang.getFullYear();
  const bulanIni = sekarang.getMonth() + 1; // 1-12

  const tahun = paramTahun ? parseInt(paramTahun, 10) || tahunIni : tahunIni;
  const bulan = paramBulan ? Math.min(12, Math.max(1, parseInt(paramBulan, 10) || bulanIni)) : bulanIni;

  // Navigasi bulan sebelumnya & berikutnya
  const bulanLalu = bulan === 1 ? 12 : bulan - 1;
  const tahunBulanLalu = bulan === 1 ? tahun - 1 : tahun;

  const bulanDepan = bulan === 12 ? 1 : bulan + 1;
  const tahunBulanDepan = bulan === 12 ? tahun + 1 : tahun;

  // Tanggal awal dan akhir bulan
  const pad = (n: number) => String(n).padStart(2, "0");
  const jumlahHari = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
  const tanggalAwalBulan = `${tahun}-${pad(bulan)}-01`;
  const tanggalAkhirBulan = `${tahun}-${pad(bulan)}-${pad(jumlahHari)}`;

  const sb = await klienServer();
  // Ambil kegiatan yang bersinggungan dengan rentang bulan ini
  const { data: dataKeg } = await sb
    .from("activities")
    .select("id, kode, judul, tanggal_mulai, tanggal_selesai, tempat, status")
    .lte("tanggal_mulai", tanggalAkhirBulan)
    .order("tanggal_mulai", { ascending: true });

  const semuaKegiatan: KegiatanKalender[] = (dataKeg ?? []).filter((k) => {
    if (!k.tanggal_mulai) return false;
    const selesai = k.tanggal_selesai || k.tanggal_mulai;
    return selesai >= tanggalAwalBulan;
  });

  // Hari pertama dalam pekan (0: Senin, 6: Minggu)
  const dFirst = new Date(Date.UTC(tahun, bulan - 1, 1)).getUTCDay();
  const hariMulaiOffset = (dFirst === 0 ? 7 : dFirst) - 1; // Senin = 0

  // Hari di bulan sebelumnya untuk sel kosong di awal
  const jumlahHariLalu = new Date(Date.UTC(tahun, bulan - 1, 0)).getUTCDate();

  // Susun sel kalender
  type SelKalender = {
    hari: number;
    tanggalStr: string;
    bulanIni: boolean;
    kegiatan: KegiatanKalender[];
  };

  const selDaftar: SelKalender[] = [];

  // Sel bulan lalu
  for (let i = hariMulaiOffset - 1; i >= 0; i--) {
    const h = jumlahHariLalu - i;
    const tglStr = `${tahunBulanLalu}-${pad(bulanLalu)}-${pad(h)}`;
    const kegDiTgl = semuaKegiatan.filter(
      (k) =>
        k.tanggal_mulai &&
        k.tanggal_mulai <= tglStr &&
        (k.tanggal_selesai ? k.tanggal_selesai >= tglStr : k.tanggal_mulai === tglStr),
    );
    selDaftar.push({ hari: h, tanggalStr: tglStr, bulanIni: false, kegiatan: kegDiTgl });
  }

  // Sel bulan ini
  for (let d = 1; d <= jumlahHari; d++) {
    const tglStr = `${tahun}-${pad(bulan)}-${pad(d)}`;
    const kegDiTgl = semuaKegiatan.filter(
      (k) =>
        k.tanggal_mulai &&
        k.tanggal_mulai <= tglStr &&
        (k.tanggal_selesai ? k.tanggal_selesai >= tglStr : k.tanggal_mulai === tglStr),
    );
    selDaftar.push({ hari: d, tanggalStr: tglStr, bulanIni: true, kegiatan: kegDiTgl });
  }

  // Sel bulan depan untuk melengkapi baris (kelipatan 7)
  const sisaSel = (7 - (selDaftar.length % 7)) % 7;
  for (let d = 1; d <= sisaSel; d++) {
    const tglStr = `${tahunBulanDepan}-${pad(bulanDepan)}-${pad(d)}`;
    const kegDiTgl = semuaKegiatan.filter(
      (k) =>
        k.tanggal_mulai &&
        k.tanggal_mulai <= tglStr &&
        (k.tanggal_selesai ? k.tanggal_selesai >= tglStr : k.tanggal_mulai === tglStr),
    );
    selDaftar.push({ hari: d, tanggalStr: tglStr, bulanIni: false, kegiatan: kegDiTgl });
  }

  // Hari ini
  const hariIniStr = sekarang.toISOString().slice(0, 10);

  // Daftar kegiatan bulan ini untuk tampilan HP
  const kegiatanBulanIni = semuaKegiatan.filter((k) => {
    if (!k.tanggal_mulai) return false;
    const selesai = k.tanggal_selesai || k.tanggal_mulai;
    return k.tanggal_mulai <= tanggalAkhirBulan && selesai >= tanggalAwalBulan;
  });

  return (
    <KerangkaAdmin
      pengguna={pengguna}
      judul="Kalender Kegiatan"
      aksi={
        <Link
          href="/admin/kegiatan"
          className="inline-flex h-11 items-center rounded-token border border-n-300 bg-n-0 px-3.5 text-[14px] font-medium text-n-700 hover:bg-n-50 transition-colors"
        >
          ← Daftar Kegiatan
        </Link>
      }
    >
      {/* Pengatur Bulan & Navigasi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="judul-1 text-n-900">
            {NAMA_BULAN[bulan - 1]} {tahun}
          </h2>
          <p className="teks-3 text-n-500 mt-0.5">
            {kegiatanBulanIni.length} kegiatan tercatat pada periode ini
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/admin/kalender?bulan=${bulanLalu}&tahun=${tahunBulanLalu}`}
            className="inline-flex h-9 items-center rounded-token border border-n-300 bg-n-0 px-3 text-[13px] font-medium text-n-700 hover:bg-n-50 transition-colors"
          >
            ← {NAMA_BULAN[bulanLalu - 1]}
          </Link>
          <Link
            href={`/admin/kalender?bulan=${bulanIni}&tahun=${tahunIni}`}
            className="inline-flex h-9 items-center rounded-token border border-n-300 bg-n-0 px-3 text-[13px] font-medium text-n-700 hover:bg-n-50 transition-colors"
          >
            Bulan Ini
          </Link>
          <Link
            href={`/admin/kalender?bulan=${bulanDepan}&tahun=${tahunBulanDepan}`}
            className="inline-flex h-9 items-center rounded-token border border-n-300 bg-n-0 px-3 text-[13px] font-medium text-n-700 hover:bg-n-50 transition-colors"
          >
            {NAMA_BULAN[bulanDepan - 1]} →
          </Link>
        </div>
      </div>

      {/* Legenda Warna Status */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-token bg-n-50 border border-n-200 mb-6 text-[13px]">
        <span className="font-medium text-n-700">Status:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-ok-fg" />
          <span className="text-n-600">Disetujui / Selesai</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-600" />
          <span className="text-n-600">Berjalan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-warn-fg" />
          <span className="text-n-600">Menunggu</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-bad-fg" />
          <span className="text-n-600">Revisi / Ditolak</span>
        </div>
      </div>

      {/* ===== TAMPILAN DESKTOP: GRID BULANAN PENUH ===== */}
      <div className="hidden sm:block">
        <Kartu className="overflow-hidden">
          {/* Header Nama Hari */}
          <div className="grid grid-cols-7 border-b border-n-200 bg-n-50 text-center">
            {HARI_PEKAN.map((hari) => (
              <div key={hari} className="py-2.5 teks-3 font-semibold text-n-700">
                {hari}
              </div>
            ))}
          </div>

          {/* Grid Tanggal */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-n-200 border-b border-n-200">
            {selDaftar.map((sel, idx) => {
              const apakahHariIni = sel.tanggalStr === hariIniStr;
              return (
                <div
                  key={idx}
                  className={`min-h-[105px] p-2 flex flex-col transition-colors ${
                    !sel.bulanIni ? "bg-n-50/50 text-n-400" : "bg-n-0 text-n-800"
                  } ${apakahHariIni ? "ring-2 ring-inset ring-brand-500" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[12px] font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                        apakahHariIni
                          ? "bg-brand-600 text-brand-contrast"
                          : sel.bulanIni
                          ? "text-n-800"
                          : "text-n-400"
                      }`}
                    >
                      {sel.hari}
                    </span>
                    {sel.kegiatan.length > 0 && (
                      <span className="teks-3 text-n-400 font-medium">
                        {sel.kegiatan.length}
                      </span>
                    )}
                  </div>

                  {/* Daftar Kegiatan di Sel Ini */}
                  <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {sel.kegiatan.slice(0, 3).map((keg) => {
                      const warna = warnaStatus(keg.status);
                      return (
                        <Link
                          key={keg.id}
                          href={`/admin/kegiatan/${keg.id}`}
                          title={`${keg.judul} (${keg.tempat || "Tanpa lokasi"})`}
                          className={`block truncate rounded px-1.5 py-0.5 text-[11px] font-medium border ${warna.bg} ${warna.teks} ${warna.border} hover:opacity-85 transition-opacity`}
                        >
                          {keg.judul}
                        </Link>
                      );
                    })}

                    {sel.kegiatan.length > 3 && (
                      <span className="text-[10px] text-n-500 font-medium pl-1">
                        +{sel.kegiatan.length - 3} lainnya
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Kartu>
      </div>

      {/* ===== TAMPILAN HP: KALENDER MINI + DAFTAR KARTU KEGIATAN ===== */}
      <div className="sm:hidden space-y-6">
        {/* Ringkasan Kalender Mini untuk Navigasi */}
        <Kartu className="p-3">
          <div className="grid grid-cols-7 text-center border-b border-n-100 pb-2 mb-2">
            {HARI_PEKAN.map((h) => (
              <span key={h} className="text-[11px] font-semibold text-n-500">
                {h.slice(0, 3)}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 text-center gap-y-1">
            {selDaftar.map((sel, idx) => {
              const apakahHariIni = sel.tanggalStr === hariIniStr;
              const adaKegiatan = sel.kegiatan.length > 0;
              return (
                <div
                  key={idx}
                  className={`h-9 flex flex-col items-center justify-center rounded-token relative ${
                    apakahHariIni ? "bg-brand-100 font-bold" : ""
                  }`}
                >
                  <span
                    className={`text-[12px] ${
                      !sel.bulanIni
                        ? "text-n-300"
                        : apakahHariIni
                        ? "text-brand-800"
                        : "text-n-700"
                    }`}
                  >
                    {sel.hari}
                  </span>
                  {adaKegiatan && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-600 mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>
        </Kartu>

        {/* Daftar Kegiatan Per Hari di Bawah Kalender (Kartu) */}
        <div className="space-y-3">
          <h3 className="font-semibold text-n-800 text-[15px]">
            Daftar Kegiatan {NAMA_BULAN[bulan - 1]} {tahun}
          </h3>

          {kegiatanBulanIni.length === 0 ? (
            <Kartu className="p-6 text-center text-n-500 text-[14px]">
              Tidak ada kegiatan pada bulan ini.
            </Kartu>
          ) : (
            <div className="space-y-3">
              {kegiatanBulanIni.map((keg) => {
                const st = labelStatus(keg.status);

                return (
                  <Link
                    key={keg.id}
                    href={`/admin/kegiatan/${keg.id}`}
                    className="block rounded-token border border-n-200 bg-n-0 p-4 shadow-xs hover:border-brand-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Lencana nada={st.nada}>{st.label}</Lencana>
                      <span className="teks-3 text-n-500 font-mono">
                        {keg.kode || "—"}
                      </span>
                    </div>

                    <h4 className="font-semibold text-n-900 text-[15px] mb-2 leading-snug">
                      {keg.judul}
                    </h4>

                    <div className="space-y-1 text-[13px] text-n-600">
                      <div className="flex items-center gap-1.5">
                        <span className="text-n-400">📅</span>
                        <span>
                          {formatTanggal(keg.tanggal_mulai)}
                          {keg.tanggal_selesai && keg.tanggal_selesai !== keg.tanggal_mulai
                            ? ` s.d. ${formatTanggal(keg.tanggal_selesai)}`
                            : ""}
                        </span>
                      </div>
                      {keg.tempat && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-n-400">📍</span>
                          <span>{keg.tempat}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </KerangkaAdmin>
  );
}
