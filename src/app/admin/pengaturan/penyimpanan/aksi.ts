"use server";

import { revalidatePath } from "next/cache";
import { klienServer, penggunaSaatIni } from "@/lib/supabase-server";
import { jalankanPenyapu, type HasilPenyapu } from "@/lib/penyapu";

export type BarisLogBerkas = {
  id: number;
  waktu: string;
  nama_asli: string | null;
  path: string | null;
  aksi: string;
  alasan: string | null;
  pelaku_nama: string | null;
  pemicu: string;
  ukuran_byte: number | null;
};

export type StatistikPenyimpanan = {
  jumlah_berkas: number;
  total_byte: number;
  jumlah_publik: number;
  byte_publik: number;
  jumlah_internal: number;
  byte_internal: number;
  jumlah_sementara: number;
  unggah_30hari: number;
  dibersihkanBulanIni: number;
  ukuranDibebaskanBulanIni: number;
  pemberitahuanPenyapu?: {
    dijeda?: boolean;
    pesan?: string | null;
    jumlah?: number;
    waktu?: string;
  } | null;
  catatanLog: BarisLogBerkas[];
};

/**
 * Memastikan pengguna memiliki sesi aktif dan memiliki peran Super Admin.
 */
async function periksaSuperAdmin() {
  const pengguna = await penggunaSaatIni();
  if (!pengguna || !pengguna.peran.includes("super_admin")) {
    throw new Error("Hanya Super Admin yang berhak mengakses pengaturan penyimpanan.");
  }
  return pengguna;
}

/**
 * Mengambil ringkasan penggunaan penyimpanan dan 25 catatan berkas terakhir.
 */
export async function ambilDataPenyimpanan(): Promise<StatistikPenyimpanan> {
  await periksaSuperAdmin();
  const sb = await klienServer();

  // 1. Ambil dari view penggunaan_penyimpanan
  let ringkasan = {
    jumlah_berkas: 0,
    total_byte: 0,
    jumlah_publik: 0,
    byte_publik: 0,
    jumlah_internal: 0,
    byte_internal: 0,
    jumlah_sementara: 0,
    unggah_30hari: 0,
  };

  try {
    const { data: viewData, error: errView } = await sb
      .from("penggunaan_penyimpanan")
      .select("*")
      .maybeSingle();

    if (!errView && viewData) {
      ringkasan = {
        jumlah_berkas: Number(viewData.jumlah_berkas ?? 0),
        total_byte: Number(viewData.total_byte ?? 0),
        jumlah_publik: Number(viewData.jumlah_publik ?? 0),
        byte_publik: Number(viewData.byte_publik ?? 0),
        jumlah_internal: Number(viewData.jumlah_internal ?? 0),
        byte_internal: Number(viewData.byte_internal ?? 0),
        jumlah_sementara: Number(viewData.jumlah_sementara ?? 0),
        unggah_30hari: Number(viewData.unggah_30hari ?? 0),
      };
    }
  } catch (err) {
    console.error("Gagal membaca view penggunaan_penyimpanan:", err);
  }

  // 2. Ambil pemberitahuan penyapu dari app_settings
  let pemberitahuanPenyapu = null;
  try {
    const { data: setPemberitahuan } = await sb
      .from("app_settings")
      .select("nilai")
      .eq("kunci", "pemberitahuan_penyapu")
      .maybeSingle();
    if (setPemberitahuan?.nilai && typeof setPemberitahuan.nilai === "object") {
      pemberitahuanPenyapu = setPemberitahuan.nilai as {
        dijeda?: boolean;
        pesan?: string | null;
        jumlah?: number;
        waktu?: string;
      };
    }
  } catch (err) {
    console.error("Gagal membaca app_settings pemberitahuan_penyapu:", err);
  }

  // 3. Ambil statistik pembersihan bulan ini
  let dibersihkanBulanIni = 0;
  let ukuranDibebaskanBulanIni = 0;

  // Tanggal awal bulan ini
  const awalBulan = new Date();
  awalBulan.setDate(1);
  awalBulan.setHours(0, 0, 0, 0);
  const awalBulanIso = awalBulan.toISOString();

  try {
    const { data: logsBulanIni } = await sb
      .from("file_logs")
      .select("ukuran_byte")
      .in("aksi", ["bersih_otomatis", "sapu"])
      .gte("waktu", awalBulanIso);

    if (logsBulanIni && logsBulanIni.length > 0) {
      dibersihkanBulanIni = logsBulanIni.length;
      ukuranDibebaskanBulanIni = logsBulanIni.reduce(
        (sum, item) => sum + Number(item.ukuran_byte ?? 0),
        0,
      );
    }
  } catch (err) {
    console.error("Gagal membaca statistik pembersihan bulan ini:", err);
  }

  // 4. Ambil 25 baris terakhir dari file_logs
  let catatanLog: BarisLogBerkas[] = [];
  try {
    const { data: logsTerakhir, error: errLogs } = await sb
      .from("file_logs")
      .select("id, waktu, nama_asli, path, aksi, alasan, pelaku_nama, pemicu, ukuran_byte")
      .order("waktu", { ascending: false })
      .limit(25);

    if (!errLogs && logsTerakhir) {
      catatanLog = logsTerakhir.map((l) => ({
        id: Number(l.id),
        waktu: l.waktu,
        nama_asli: l.nama_asli,
        path: l.path,
        aksi: l.aksi,
        alasan: l.alasan,
        pelaku_nama: l.pelaku_nama,
        pemicu: l.pemicu,
        ukuran_byte: l.ukuran_byte ? Number(l.ukuran_byte) : null,
      }));
    }
  } catch (err) {
    console.error("Gagal membaca daftar file_logs terakhir:", err);
  }

  return {
    ...ringkasan,
    dibersihkanBulanIni,
    ukuranDibebaskanBulanIni,
    pemberitahuanPenyapu,
    catatanLog,
  };
}

/**
 * Server action untuk memicu penyapu berkas (mode uji coba atau eksekusi nyata).
 */
export async function jalankanPenyapuAksi(ujiCoba: boolean): Promise<HasilPenyapu> {
  await periksaSuperAdmin();
  const hasil = await jalankanPenyapu({ ujiCoba });
  revalidatePath("/admin/pengaturan/penyimpanan");
  return hasil;
}
