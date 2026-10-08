import { klienAdmin } from "./supabase-admin";

/**
 * MODUL PENYAPU BERKAS OTOMATIS
 * Bertugas mencari dan membersihkan berkas yatim (tidak dirujuk data apa pun)
 * serta berkas sementara (tmp/) yang telah kedaluwarsa.
 *
 * Mengutamakan KEAMANAN: berkas yang masih dirujuk tidak boleh dihapus.
 * Dilengkapi pembatas pengaman (maksimal 50 berkas atau 20% total objek).
 */

export type LogBerkasParam = {
  attachment_id?: string | null;
  aksi: "unggah" | "resmi" | "ganti" | "hapus" | "bersih_otomatis" | "sapu";
  bucket: string;
  path: string;
  nama_asli?: string | null;
  ukuran_byte?: number | null;
  hash_sha256?: string | null;
  alasan?: string | null;
  pemicu?: "pengguna" | "sistem" | "penyapu";
  pelaku_id?: string | null;
  pelaku_nama?: string | null;
};

export type BatasPenyapu = {
  maks_berkas: number;
  maks_persen: number;
  masa_tenggang_menit: number;
};

export type ObjekStorage = {
  name: string;
  path: string;
  id: string | null;
  created_at: string | null;
  updated_at: string | null;
  metadata: {
    size?: number;
    mimetype?: string;
  } | null;
};

export type KandidatBerkas = {
  path: string;
  nama: string;
  ukuran_byte: number;
  usia_menit: number;
  alasan: string;
  attachment_id?: string | null;
};

export type HasilCariYatim = {
  totalObjek: number;
  kandidat: KandidatBerkas[];
  dijeda: boolean;
  alasanJeda?: string;
  batasMaksBerkas: number;
  batasMaksPersen: number;
  ambangBatasHitung: number;
};

export type HasilPenyapu = {
  sukses: boolean;
  ujiCoba: boolean;
  dijeda: boolean;
  alasanJeda?: string;
  jumlahDiperiksa: number;
  jumlahDihapus: number;
  jumlahDijeda: number;
  daftarBerkas: string[];
  totalUkuranDibebaskan: number;
  waktu: string;
};

const BATAS_BAWAAN: BatasPenyapu = {
  maks_berkas: 50,
  maks_persen: 20,
  masa_tenggang_menit: 60,
};

/**
 * Format ukuran byte ke format ramah manusia (B, KB, MB, GB).
 */
export function formatUkuranByte(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${(byte / 1024).toFixed(0)} KB`;
  if (byte < 1024 * 1024 * 1024) return `${(byte / (1024 * 1024)).toFixed(2)} MB`;
  return `${(byte / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Klien admin dengan ketahanan hak akses: jika role service_role
 * belum diberikan grant tabel oleh owner database di Supabase Cloud,
 * secara otomatis masuk dengan sesi Super Admin.
 */
async function klienAdminDatabase() {
  // Memakai kunci rahasia server (SUPABASE_SERVICE_ROLE_KEY).
  // TIDAK BOLEH memuat kata sandi pengguna di dalam kode.
  return klienAdmin();
}

/**
 * Menulis satu baris ke tabel file_logs lewat klienAdmin.
 * Catatan bersifat tambah-saja (tidak bisa diubah/dihapus).
 */
export async function catatLogBerkas(param: LogBerkasParam): Promise<void> {
  try {
    const sb = await klienAdminDatabase();
    const { error } = await sb.from("file_logs").insert({
      attachment_id: param.attachment_id ?? null,
      aksi: param.aksi,
      bucket: param.bucket,
      path: param.path,
      nama_asli: param.nama_asli ?? null,
      ukuran_byte: param.ukuran_byte ?? null,
      hash_sha256: param.hash_sha256 ?? null,
      alasan: param.alasan ?? null,
      pemicu: param.pemicu ?? "penyapu",
      pelaku_id: param.pelaku_id ?? null,
      pelaku_nama: param.pelaku_nama ?? null,
    });
    if (error) {
      console.error("Gagal mencatat log berkas:", error.message);
    }
  } catch (err) {
    console.error("Kesalahan jaringan saat mencatat log berkas:", err);
  }
}

/**
 * Mengambil daftar seluruh objek dalam bucket penyimpanan secara rekursif.
 */
export async function daftarSemuaObjekStorage(
  sb: ReturnType<typeof klienAdmin>,
  bucket: string,
  folder = "",
): Promise<ObjekStorage[]> {
  const hasil: ObjekStorage[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await sb.storage.from(bucket).list(folder, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error || !data || data.length === 0) break;

    for (const item of data) {
      const pathLengkap = folder ? `${folder}/${item.name}` : item.name;
      // Di Supabase Storage, folder ditandai dengan id === null
      if (item.id === null) {
        const sub = await daftarSemuaObjekStorage(sb, bucket, pathLengkap);
        hasil.push(...sub);
      } else {
        hasil.push({
          name: item.name,
          path: pathLengkap,
          id: item.id,
          created_at: item.created_at,
          updated_at: item.updated_at,
          metadata: item.metadata,
        });
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return hasil;
}

/**
 * Memeriksa ulang secara instan apakah suatu path berkas masih dirujuk
 * sebelum proses penghapusan fisik dilakukan.
 */
async function periksaUlangRujukan(
  sb: Awaited<ReturnType<typeof klienAdminDatabase>>,
  path: string,
): Promise<boolean> {
  try {
    // 1. attachments dengan status resmi
    const { data: att } = await sb
      .from("attachments")
      .select("id")
      .eq("path", path)
      .eq("status", "resmi")
      .maybeSingle();
    if (att) return true;

    // 2. site_settings (logo & favicon)
    const { data: site } = await sb
      .from("site_settings")
      .select("logo_path, favicon_path")
      .eq("id", 1)
      .maybeSingle();
    if (site && (site.logo_path === path || site.favicon_path === path)) return true;

    // 3. profiles (foto_path)
    const { data: prof } = await sb
      .from("profiles")
      .select("id")
      .eq("foto_path", path)
      .maybeSingle();
    if (prof) return true;

    // 4. posts (gambar_path)
    const { data: post } = await sb
      .from("posts")
      .select("id")
      .eq("gambar_path", path)
      .maybeSingle();
    if (post) return true;

    // 5. posts isi teks
    const namaBerkas = path.split("/").pop() || path;
    const { data: postIsi } = await sb
      .from("posts")
      .select("id")
      .ilike("isi", `%${namaBerkas}%`)
      .maybeSingle();
    if (postIsi) return true;

    return false;
  } catch {
    // Jika galat pemeriksaan jaringan, jangan hapus demi keamanan
    return true;
  }
}

/**
 * Mencari berkas yatim dan berkas sementara kedaluwarsa di bucket publik.
 */
export async function cariBerkasYatim(): Promise<HasilCariYatim> {
  const sb = await klienAdminDatabase();

  // 1. Ambil aturan batas penyapu dari app_settings
  let batas: BatasPenyapu = { ...BATAS_BAWAAN };
  try {
    const { data: setRow } = await sb
      .from("app_settings")
      .select("nilai")
      .eq("kunci", "batas_penyapu")
      .maybeSingle();
    if (setRow?.nilai && typeof setRow.nilai === "object") {
      const n = setRow.nilai as Record<string, unknown>;
      batas = {
        maks_berkas: typeof n.maks_berkas === "number" ? n.maks_berkas : BATAS_BAWAAN.maks_berkas,
        maks_persen: typeof n.maks_persen === "number" ? n.maks_persen : BATAS_BAWAAN.maks_persen,
        masa_tenggang_menit:
          typeof n.masa_tenggang_menit === "number"
            ? n.masa_tenggang_menit
            : BATAS_BAWAAN.masa_tenggang_menit,
      };
    }
  } catch {
    // gunakan batas bawaan
  }

  // 2. Ambil seluruh objek di wadah publik
  const semuaObjek = await daftarSemuaObjekStorage(sb, "publik");
  const totalObjek = semuaObjek.length;

  // 3. Kumpulkan semua rujukan berkas aktif dari basis data
  const rujukanPath = new Set<string>();
  const idAttachmentMap = new Map<string, string>();
  const sekarangMs = Date.now();
  const masaTenggangMs = batas.masa_tenggang_menit * 60 * 1000;

  // 3a. Dari tabel attachments
  try {
    const { data: attachments } = await sb
      .from("attachments")
      .select("id, path, status, diunggah_pada");
    if (attachments) {
      for (const a of attachments) {
        idAttachmentMap.set(a.path, a.id);
        if (a.status === "resmi") {
          rujukanPath.add(a.path);
        } else if (a.status === "sementara" && a.diunggah_pada) {
          const tgl = new Date(a.diunggah_pada).getTime();
          // Masih dalam masa tenggang toleransi
          if (sekarangMs - tgl < masaTenggangMs) {
            rujukanPath.add(a.path);
          }
        }
      }
    }
  } catch (err) {
    console.error("Gagal membaca tabel attachments:", err);
  }

  // 3b. Dari tabel site_settings
  try {
    const { data: site } = await sb
      .from("site_settings")
      .select("logo_path, favicon_path")
      .eq("id", 1)
      .maybeSingle();
    if (site?.logo_path) rujukanPath.add(site.logo_path);
    if (site?.favicon_path) rujukanPath.add(site.favicon_path);
  } catch (err) {
    console.error("Gagal membaca site_settings:", err);
  }

  // 3c. Dari tabel profiles
  try {
    const { data: profiles } = await sb
      .from("profiles")
      .select("foto_path")
      .not("foto_path", "is", null);
    if (profiles) {
      for (const p of profiles) {
        if (p.foto_path) rujukanPath.add(p.foto_path);
      }
    }
  } catch (err) {
    console.error("Gagal membaca profiles:", err);
  }

  // 3d. Dari tabel posts
  let teksIsiPosts = "";
  try {
    const { data: posts } = await sb.from("posts").select("gambar_path, isi");
    if (posts) {
      for (const p of posts) {
        if (p.gambar_path) rujukanPath.add(p.gambar_path);
        if (p.isi) teksIsiPosts += " " + p.isi;
      }
    }
  } catch (err) {
    console.error("Gagal membaca posts:", err);
  }

  // 4. Periksa tiap objek untuk menentukan kandidat hapus
  const kandidat: KandidatBerkas[] = [];

  for (const objek of semuaObjek) {
    // Estimasi waktu buat objek
    let waktuBuatMs = sekarangMs;
    if (objek.created_at) {
      waktuBuatMs = new Date(objek.created_at).getTime();
    } else {
      // Coba ekstrak timestamp awalan nama berkas jika cocok (mis: 1791443450321-...)
      const cocokan = objek.name.match(/^(\d{13})-/);
      if (cocokan) {
        waktuBuatMs = Number(cocokan[1]);
      }
    }

    const usiaMenit = Math.max(0, Math.floor((sekarangMs - waktuBuatMs) / 60000));
    const ukuranByte = objek.metadata?.size ?? 0;
    const diFolderTmp = objek.path.startsWith("tmp/");

    if (diFolderTmp) {
      // Berkas di tmp/ yang lebih tua dari 1 jam (60 menit) selalu masuk kandidat
      if (usiaMenit >= batas.masa_tenggang_menit) {
        kandidat.push({
          path: objek.path,
          nama: objek.name,
          ukuran_byte: ukuranByte,
          usia_menit: usiaMenit,
          alasan: `Berkas sementara di folder tmp/ kedaluwarsa (${usiaMenit} menit > ${batas.masa_tenggang_menit} menit)`,
          attachment_id: idAttachmentMap.get(objek.path) ?? null,
        });
      }
    } else {
      // Di luar tmp: periksa apakah dirujuk
      const dirujukLangsung = rujukanPath.has(objek.path);
      const tersisipDiPost =
        teksIsiPosts.includes(objek.path) || teksIsiPosts.includes(objek.name);

      if (!dirujukLangsung && !tersisipDiPost) {
        // Tidak dirujuk siapa pun, periksa apakah usianya melewati masa tenggang
        if (usiaMenit >= batas.masa_tenggang_menit) {
          kandidat.push({
            path: objek.path,
            nama: objek.name,
            ukuran_byte: ukuranByte,
            usia_menit: usiaMenit,
            alasan: `Tidak dirujuk data mana pun dan melewati masa tenggang (${usiaMenit} menit)`,
            attachment_id: idAttachmentMap.get(objek.path) ?? null,
          });
        }
      }
    }
  }

  // 5. Terapkan batas pengaman
  // Maksimal 50 berkas ATAU 20% dari total objek, mana yang lebih kecil
  const batasPersenHitung =
    totalObjek > 0
      ? Math.max(1, Math.floor((totalObjek * batas.maks_persen) / 100))
      : batas.maks_berkas;
  const ambangBatasHitung = Math.min(batas.maks_berkas, batasPersenHitung);

  let dijeda = false;
  let alasanJeda: string | undefined;

  if (kandidat.length > ambangBatasHitung) {
    dijeda = true;
    alasanJeda =
      `Batas pengaman terlampaui: terdeteksi ${kandidat.length} kandidat berkas, ` +
      `sedangkan batas aman per proses adalah maksimal ${ambangBatasHitung} berkas ` +
      `(terkecil antara ${batas.maks_berkas} berkas dan ${batas.maks_persen}% dari total ${totalObjek} berkas). ` +
      `Penyapu berhenti otomatis demi mencegah salah hapus massal.`;
  }

  return {
    totalObjek,
    kandidat,
    dijeda,
    alasanJeda,
    batasMaksBerkas: batas.maks_berkas,
    batasMaksPersen: batas.maks_persen,
    ambangBatasHitung,
  };
}

/**
 * Menjalankan proses penyapu berkas.
 * Dalam mode uji coba (ujiCoba=true), tidak ada berkas yang dihapus fisik.
 */
export async function jalankanPenyapu({
  ujiCoba = false,
}: {
  ujiCoba?: boolean;
} = {}): Promise<HasilPenyapu> {
  const sekarang = new Date().toISOString();
  const sb = await klienAdminDatabase();
  const hasilCari = await cariBerkasYatim();

  // Jika terlampaui batas pengaman: hentikan dan catat pemberitahuan
  if (hasilCari.dijeda) {
    try {
      await sb
        .from("app_settings")
        .update({
          nilai: {
            dijeda: true,
            pesan: hasilCari.alasanJeda,
            jumlah: hasilCari.kandidat.length,
            waktu: sekarang,
          },
          diperbarui_pada: sekarang,
        })
        .eq("kunci", "pemberitahuan_penyapu");
    } catch (err) {
      console.error("Gagal memperbarui pemberitahuan_penyapu:", err);
    }

    return {
      sukses: false,
      ujiCoba,
      dijeda: true,
      alasanJeda: hasilCari.alasanJeda,
      jumlahDiperiksa: hasilCari.totalObjek,
      jumlahDihapus: 0,
      jumlahDijeda: hasilCari.kandidat.length,
      daftarBerkas: hasilCari.kandidat.map((k) => k.path),
      totalUkuranDibebaskan: 0,
      waktu: sekarang,
    };
  }

  // Mode uji coba (dry-run)
  if (ujiCoba) {
    const totalByteUji = hasilCari.kandidat.reduce((sum, k) => sum + k.ukuran_byte, 0);
    return {
      sukses: true,
      ujiCoba: true,
      dijeda: false,
      jumlahDiperiksa: hasilCari.totalObjek,
      jumlahDihapus: hasilCari.kandidat.length,
      jumlahDijeda: 0,
      daftarBerkas: hasilCari.kandidat.map((k) => k.path),
      totalUkuranDibebaskan: totalByteUji,
      waktu: sekarang,
    };
  }

  // Eksekusi nyata: hapus berkas fisik satu per satu dengan pemeriksaan ulang instan
  const berkasDihapus: string[] = [];
  let totalByteDibebaskan = 0;

  for (const item of hasilCari.kandidat) {
    // Periksa ulang rujukan tepat saat itu
    const masihDirujuk = await periksaUlangRujukan(sb, item.path);
    if (masihDirujuk) {
      console.warn(`Pembatalan hapus: berkas ${item.path} terdeteksi masih dirujuk saat pemeriksaan ulang.`);
      continue;
    }

    // 1. Hapus berkas fisik lewat Storage API
    const { error: errHapusStorage } = await sb.storage.from("publik").remove([item.path]);
    if (errHapusStorage) {
      console.error(`Gagal menghapus berkas fisik ${item.path}:`, errHapusStorage.message);
      continue;
    }

    // 2. Hapus baris attachments jika ada
    await sb.from("attachments").delete().eq("bucket", "publik").eq("path", item.path);

    // 3. Catat ke file_logs
    await catatLogBerkas({
      attachment_id: item.attachment_id,
      aksi: "sapu",
      bucket: "publik",
      path: item.path,
      nama_asli: item.nama,
      ukuran_byte: item.ukuran_byte,
      alasan: "yatim",
      pemicu: "penyapu",
    });

    berkasDihapus.push(item.path);
    totalByteDibebaskan += item.ukuran_byte;
  }

  // Bersihkan penanda jeda jika sebelumnya ada jeda
  try {
    await sb
      .from("app_settings")
      .update({
        nilai: { dijeda: false, pesan: null, waktu: sekarang },
        diperbarui_pada: sekarang,
      })
      .eq("kunci", "pemberitahuan_penyapu");
  } catch {
    // abaikan
  }

  // Perbarui ringkasan penyimpanan_terpakai
  try {
    const { data: viewPenyimpanan } = await sb
      .from("penggunaan_penyimpanan")
      .select("total_byte")
      .maybeSingle();
    if (viewPenyimpanan) {
      await sb
        .from("app_settings")
        .update({
          nilai: {
            total_byte: viewPenyimpanan.total_byte,
            diperbarui: sekarang,
          },
          diperbarui_pada: sekarang,
        })
        .eq("kunci", "penyimpanan_terpakai");
    }
  } catch {
    // abaikan
  }

  return {
    sukses: true,
    ujiCoba: false,
    dijeda: false,
    jumlahDiperiksa: hasilCari.totalObjek,
    jumlahDihapus: berkasDihapus.length,
    jumlahDijeda: 0,
    daftarBerkas: berkasDihapus,
    totalUkuranDibebaskan: totalByteDibebaskan,
    waktu: sekarang,
  };
}
