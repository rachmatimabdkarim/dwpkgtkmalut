"use server";

import { revalidatePath } from "next/cache";
import { klienServer, penggunaSaatIni } from "@/lib/supabase-server";
import { TEMA_BAWAAN, rasioKontras, warnaTeksTerbaik } from "@/lib/tema";
import { bersihkanCacheTema } from "@/lib/pengaturan";

export type HasilAksi = {
  sukses: boolean;
  pesan: string;
};

/** Memastikan pengguna sedang masuk dan memiliki peran super_admin */
async function periksaSuperAdmin() {
  const pengguna = await penggunaSaatIni();
  if (!pengguna || !pengguna.peran.includes("super_admin")) {
    throw new Error("Hanya Super Admin yang berhak mengubah pengaturan tampilan.");
  }
  return pengguna;
}

/** Mencatat perubahan ke tabel audit_logs */
async function catatAudit(
  sb: Awaited<ReturnType<typeof klienServer>>,
  data: {
    jenis: string;
    aksi: string;
    keterangan: string;
    nilaiLama: Record<string, unknown> | null;
    nilaiBaru: Record<string, unknown> | null;
    pelakuId: string;
    pelakuNama: string;
  },
) {
  try {
    await sb.from("audit_logs").insert({
      jenis: data.jenis,
      aksi: data.aksi,
      keterangan: data.keterangan,
      nilai_lama: data.nilaiLama,
      nilai_baru: data.nilaiBaru,
      pelaku_id: data.pelakuId,
      pelaku_nama: data.pelakuNama,
    });
  } catch (err) {
    // Jangan batalkan operasi utama bila audit_logs belum termigrasi
    console.error("Gagal mencatat audit log:", err);
  }
}

/** Menghapus berkas lama dari bucket penyimpanan publik dan lampiran */
async function bersihkanBerkasLama(
  sb: Awaited<ReturnType<typeof klienServer>>,
  pathBerkas: string | null | undefined,
) {
  if (!pathBerkas) return;
  try {
    await sb.storage.from("publik").remove([pathBerkas]);
    await sb.from("attachments").delete().eq("path", pathBerkas);
  } catch (err) {
    console.error(`Gagal menghapus berkas lama (${pathBerkas}):`, err);
  }
}

/** Menyimpan bagian Identitas */
export async function simpanIdentitas(input: {
  // Kolom di bawah ini SEMUA opsional dengan sengaja: yang tidak dikirim berarti
  // "jangan diubah". Hanya kirim kolom yang benar-benar diurus tombol pemanggil.
  namaAplikasi?: string;
  namaUnit?: string;
  namaOrganisasi?: string;
  alamat?: string;
  telepon?: string;
  email?: string;
  sambutan?: string;
  profilSingkat?: string;
  subJudulAgenda?: string;
  subJudulBerita?: string;
  subJudulGaleri?: string;
  subJudulUnduhan?: string;
  lat?: string;
  bujur?: string;
  // ===== Konten beranda =====
  heroTakbir?: string;
  heroJudul?: string;
  heroRingkasan?: string;
  heroTombol1?: string;
  heroTombol2?: string;
  visi?: string;
  misi?: string;
  bidang1Nama?: string;
  bidang1Isi?: string;
  bidang2Nama?: string;
  bidang2Isi?: string;
  bidang3Nama?: string;
  bidang3Isi?: string;
  heroFotoPath?: string | null;
}): Promise<HasilAksi> {
  try {
    const pengguna = await periksaSuperAdmin();
    const sb = await klienServer();

    // Kolom wajib hanya diperiksa bila memang DIKIRIM oleh tombol yang menekan.
    // Tombol simpan foto tidak mengirim nama sistem, jadi tidak boleh ditolak
    // dengan pesan "Nama sistem tidak boleh kosong".
    if (input.namaAplikasi !== undefined && !input.namaAplikasi.trim()) {
      return { sukses: false, pesan: "Nama sistem tidak boleh kosong." };
    }
    if (input.namaUnit !== undefined && !input.namaUnit.trim()) {
      return { sukses: false, pesan: "Nama unit tidak boleh kosong." };
    }
    if (input.namaOrganisasi !== undefined && !input.namaOrganisasi.trim()) {
      return { sukses: false, pesan: "Nama organisasi tidak boleh kosong." };
    }

    const { data: lama } = await sb.from("site_settings").select("*").eq("id", 1).maybeSingle();

    // PENTING: kolom yang TIDAK dikirim dari layar berarti "jangan diubah".
    // Dulu kolom teks seperti `sambutan` selalu ditulis dari nilai layar, sehingga
    // mengunggah foto beranda (yang hanya niat mengubah foto) ikut menimpa
    // sambutan dengan teks lama yang masih terbuka di formulir. Sekarang hanya
    // kolom yang benar-benar dikirim (undefined = kirim undefined) yang ditulis.
    const teks = (nilai: string | undefined, bersihkan = false) => {
      if (nilai === undefined) return undefined;
      const rapi = nilai.trim();
      return rapi ? rapi : bersihkan ? null : undefined;
    };

    const nilaiBaru = {
      id: 1,
      ...(input.namaAplikasi !== undefined ? { nama_aplikasi: input.namaAplikasi.trim() } : {}),
      ...(input.namaUnit !== undefined ? { nama_unit: input.namaUnit.trim() } : {}),
      ...(input.namaOrganisasi !== undefined
        ? { nama_organisasi: input.namaOrganisasi.trim() }
        : {}),
      ...(input.alamat !== undefined ? { alamat: teks(input.alamat, true) } : {}),
      ...(input.telepon !== undefined ? { telepon: teks(input.telepon, true) } : {}),
      ...(input.email !== undefined ? { email: teks(input.email, true) } : {}),
      ...(input.sambutan !== undefined ? { sambutan: teks(input.sambutan, true) } : {}),
      ...(input.profilSingkat !== undefined
        ? { profil_singkat: teks(input.profilSingkat, true) }
        : {}),
      ...(input.subJudulAgenda !== undefined
        ? { sub_judul_agenda: teks(input.subJudulAgenda, true) }
        : {}),
      ...(input.subJudulBerita !== undefined
        ? { sub_judul_berita: teks(input.subJudulBerita, true) }
        : {}),
      ...(input.subJudulGaleri !== undefined
        ? { sub_judul_galeri: teks(input.subJudulGaleri, true) }
        : {}),
      ...(input.subJudulUnduhan !== undefined
        ? { sub_judul_unduhan: teks(input.subJudulUnduhan, true) }
        : {}),
      ...(input.heroTakbir !== undefined ? { hero_takbir: teks(input.heroTakbir, true) } : {}),
      ...(input.heroJudul !== undefined ? { hero_judul: teks(input.heroJudul, true) } : {}),
      ...(input.heroRingkasan !== undefined
        ? { hero_ringkasan: teks(input.heroRingkasan, true) }
        : {}),
      ...(input.heroTombol1 !== undefined ? { hero_tombol1: teks(input.heroTombol1, true) } : {}),
      ...(input.heroTombol2 !== undefined ? { hero_tombol2: teks(input.heroTombol2, true) } : {}),
      ...(input.visi !== undefined ? { visi: teks(input.visi, true) } : {}),
      ...(input.misi !== undefined ? { misi: teks(input.misi, true) } : {}),
      ...(input.bidang1Nama !== undefined ? { bidang_1_nama: teks(input.bidang1Nama, true) } : {}),
      ...(input.bidang1Isi !== undefined ? { bidang_1_isi: teks(input.bidang1Isi, true) } : {}),
      ...(input.bidang2Nama !== undefined ? { bidang_2_nama: teks(input.bidang2Nama, true) } : {}),
      ...(input.bidang2Isi !== undefined ? { bidang_2_isi: teks(input.bidang2Isi, true) } : {}),
      ...(input.bidang3Nama !== undefined ? { bidang_3_nama: teks(input.bidang3Nama, true) } : {}),
      ...(input.bidang3Isi !== undefined ? { bidang_3_isi: teks(input.bidang3Isi, true) } : {}),
      ...(input.heroFotoPath !== undefined ? { hero_foto_path: input.heroFotoPath } : {}),
      ...(input.lat !== undefined
        ? {
            peta_lintang:
              input.lat && !Number.isNaN(Number(input.lat.replace(",", ".")))
                ? Number(input.lat.replace(",", "."))
                : null,
          }
        : {}),
      ...(input.bujur !== undefined
        ? {
            peta_bujur:
              input.bujur && !Number.isNaN(Number(input.bujur.replace(",", ".")))
                ? Number(input.bujur.replace(",", "."))
                : null,
          }
        : {}),
      diperbarui_pada: new Date().toISOString(),
      diperbarui_oleh: pengguna.id,
    };

    const { error } = await sb.from("site_settings").upsert(nilaiBaru);
    if (error) {
      return { sukses: false, pesan: "Gagal menyimpan identitas: " + error.message };
    }

    await catatAudit(sb, {
      jenis: "tampilan",
      aksi: "simpan_identitas",
      keterangan: "Memperbarui identitas situs",
      nilaiLama: lama ?? null,
      nilaiBaru,
      pelakuId: pengguna.id,
      pelakuNama: pengguna.nama,
    });

    bersihkanCacheTema();
    revalidatePath("/", "layout");

    return { sukses: true, pesan: "Identitas berhasil disimpan." };
  } catch (err) {
    return {
      sukses: false,
      pesan: err instanceof Error ? err.message : "Terjadi kesalahan sistem.",
    };
  }
}

/** Menyimpan warna tema */
export async function simpanWarna(warnaHex: string): Promise<HasilAksi> {
  try {
    const pengguna = await periksaSuperAdmin();
    const sb = await klienServer();

    const hexBersih = warnaHex.trim().toLowerCase();
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(hexBersih)) {
      return { sukses: false, pesan: "Format kode heksadesimal warna tidak valid (contoh: #0f766e)." };
    }

    const teksTerbaik = warnaTeksTerbaik(hexBersih);
    const rasio = rasioKontras(teksTerbaik, hexBersih);

    if (rasio < 3.0) {
      return {
        sukses: false,
        pesan: `Kontras warna terlalu rendah (${rasio.toFixed(1)}:1, di bawah batas minimum 3.0:1). Teks tidak akan terbaca dengan jelas.`,
      };
    }

    const { data: lama } = await sb.from("site_settings").select("*").eq("id", 1).maybeSingle();

    const nilaiBaru = {
      id: 1,
      warna_utama: hexBersih,
      diperbarui_pada: new Date().toISOString(),
      diperbarui_oleh: pengguna.id,
    };

    const { error } = await sb.from("site_settings").upsert(nilaiBaru);
    if (error) {
      return { sukses: false, pesan: "Gagal menyimpan warna: " + error.message };
    }

    await catatAudit(sb, {
      jenis: "tampilan",
      aksi: "simpan_warna",
      keterangan: `Mengubah warna tema ke ${hexBersih}`,
      nilaiLama: lama ?? null,
      nilaiBaru,
      pelakuId: pengguna.id,
      pelakuNama: pengguna.nama,
    });

    bersihkanCacheTema();
    revalidatePath("/", "layout");

    return { sukses: true, pesan: "Warna tema berhasil disimpan." };
  } catch (err) {
    return {
      sukses: false,
      pesan: err instanceof Error ? err.message : "Terjadi kesalahan sistem.",
    };
  }
}

/** Menyimpan seluruh pengaturan warna tema (dasar, aksen, tombol, halaman, teks). */
export async function simpanWarnaLengkap(palet: {
  dasar: string;
  aksen: string;
  tombol: string;
  halaman: string;
  teks: string;
}): Promise<HasilAksi> {
  try {
    const pengguna = await periksaSuperAdmin();
    const sb = await klienServer();

    // Periksa tiap kode warna
    const periksaHex = (nilai: string, nama: string): string | null => {
      const bersih = (nilai ?? "").trim().toLowerCase();
      if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(bersih)) {
        return `Kode warna ${nama} tidak valid (contoh: #1b4a22).`;
      }
      return null;
    };

    const pasangan: [string, string][] = [
      [palet.dasar, "dasar"],
      [palet.aksen, "aksen"],
      [palet.tombol, "tombol"],
      [palet.halaman, "latar halaman"],
      [palet.teks, "huruf"],
    ];
    for (const [nilai, nama] of pasangan) {
      const galat = periksaHex(nilai, nama);
      if (galat) return { sukses: false, pesan: galat };
    }

    // Huruf utama pada latar halaman harus cukup kontras supaya terbaca
    const rasioTeks = rasioKontras(palet.teks.trim().toLowerCase(), palet.halaman.trim().toLowerCase());
    if (rasioTeks < 3.0) {
      return {
        sukses: false,
        pesan: `Huruf terlalu samar di atas latar (kontras ${rasioTeks.toFixed(1)}:1, minimal 3.0:1). Pilih huruf yang lebih gelap atau latar yang lebih terang.`,
      };
    }

    // Tombol harus terbaca: teks otomatis dipilih, tetapi pastikan ada pilihan yang cukup kontras
    const latarTombol = palet.tombol.trim().toLowerCase();
    const rasioTombol = Math.max(
      rasioKontras("#ffffff", latarTombol),
      rasioKontras("#1a1a1a", latarTombol),
    );
    if (rasioTombol < 3.0) {
      return {
        sukses: false,
        pesan: `Warna tombol terlalu samar (kontras ${rasioTombol.toFixed(1)}:1, minimal 3.0:1). Pilih warna yang lebih tua atau lebih muda.`,
      };
    }

    const { data: lama } = await sb.from("site_settings").select("*").eq("id", 1).maybeSingle();

    const nilaiBaru = {
      id: 1,
      warna_dasar: palet.dasar.trim().toLowerCase(),
      warna_aksen: palet.aksen.trim().toLowerCase(),
      warna_tombol: palet.tombol.trim().toLowerCase(),
      warna_halaman: palet.halaman.trim().toLowerCase(),
      warna_teks: palet.teks.trim().toLowerCase(),
      // warna utama ikut warna dasar supaya seluruh halaman tetap senada
      warna_utama: palet.dasar.trim().toLowerCase(),
      diperbarui_pada: new Date().toISOString(),
      diperbarui_oleh: pengguna.id,
    };

    const { error } = await sb.from("site_settings").upsert(nilaiBaru);
    if (error) return { sukses: false, pesan: "Gagal menyimpan warna: " + error.message };

    await catatAudit(sb, {
      jenis: "tampilan",
      aksi: "simpan_warna_lengkap",
      keterangan: `Mengubah tema warna: dasar ${nilaiBaru.warna_dasar}, aksen ${nilaiBaru.warna_aksen}, tombol ${nilaiBaru.warna_tombol}`,
      nilaiLama: lama ?? null,
      nilaiBaru,
      pelakuId: pengguna.id,
      pelakuNama: pengguna.nama,
    });

    bersihkanCacheTema();
    revalidatePath("/", "layout");

    return { sukses: true, pesan: "Tema warna berhasil disimpan dan langsung berlaku." };
  } catch (err) {
    return {
      sukses: false,
      pesan: err instanceof Error ? err.message : "Terjadi kesalahan sistem.",
    };
  }
}

/**
 * Menyimpan lapisan warna & gradasi foto besar beranda.
 * Hanya Super Admin. Nilai diperiksa dulu supaya tidak ada tampilan yang
 * tulisannya tidak terbaca.
 */
export async function simpanOverlay(nilai: {
  warna: string;
  pekat: number;
  arah: string;
  bentuk: string;
}): Promise<HasilAksi> {
  try {
    const pengguna = await periksaSuperAdmin();
    const sb = await klienServer();

    // Periksa kode warna
    const warna = (nilai.warna ?? "").trim().toLowerCase();
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(warna)) {
      return { sukses: false, pesan: "Kode warna lapisan tidak sah (contoh: #1b4a22)." };
    }

    // Periksa tingkat kegelapan
    const pekat = Math.round(Number(nilai.pekat));
    if (!Number.isFinite(pekat) || pekat < 0 || pekat > 100) {
      return { sukses: false, pesan: "Tingkat kegelapan harus antara 0 sampai 100." };
    }

    // Periksa arah & bentuk terhadap daftar yang sah
    const arahSah = ["kiri-ke-kanan", "kanan-ke-kiri", "atas-ke-bawah", "merata"];
    const bentukSah = ["bertahap", "tajam-di-kiri", "merata"];
    if (!arahSah.includes(nilai.arah)) {
      return { sukses: false, pesan: "Arah gradasi tidak dikenal." };
    }
    if (!bentukSah.includes(nilai.bentuk)) {
      return { sukses: false, pesan: "Bentuk gradasi tidak dikenal." };
    }

    // Peringatan penting: lapisan terlalu bening membuat tulisan putih tidak terbaca
    if (pekat < 35) {
      return {
        sukses: false,
        pesan:
          "Lapisan terlalu bening (di bawah 35%). Tulisan putih di atas foto akan sulit terbaca. " +
          "Naikkan tingkat kegelapan, atau pilih foto yang memang sudah gelap.",
      };
    }

    const { data: lama } = await sb.from("site_settings").select("*").eq("id", 1).maybeSingle();

    const nilaiBaru = {
      id: 1,
      hero_overlay_warna: warna,
      hero_overlay_pekat: pekat,
      hero_overlay_arah: nilai.arah,
      hero_overlay_bentuk: nilai.bentuk,
      diperbarui_pada: new Date().toISOString(),
      diperbarui_oleh: pengguna.id,
    };

    const { error } = await sb.from("site_settings").upsert(nilaiBaru);
    if (error) return { sukses: false, pesan: "Gagal menyimpan lapisan: " + error.message };

    await catatAudit(sb, {
      jenis: "tampilan",
      aksi: "simpan_overlay_beranda",
      keterangan: `Mengubah lapisan foto beranda: warna ${warna}, ${pekat}%, arah ${nilai.arah}, bentuk ${nilai.bentuk}`,
      nilaiLama: lama ?? null,
      nilaiBaru,
      pelakuId: pengguna.id,
      pelakuNama: pengguna.nama,
    });

    bersihkanCacheTema();
    revalidatePath("/", "layout");

    return { sukses: true, pesan: "Lapisan foto beranda berhasil disimpan dan langsung berlaku." };
  } catch (err) {
    return {
      sukses: false,
      pesan: err instanceof Error ? err.message : "Terjadi kesalahan sistem.",
    };
  }
}

/** Menyimpan atau menghapus logo dan favicon */
export async function simpanBranding(opsi: {
  logoPath?: string | null;
  faviconPath?: string | null;
  hapusLogo?: boolean;
  hapusFavicon?: boolean;
}): Promise<HasilAksi> {
  try {
    const pengguna = await periksaSuperAdmin();
    const sb = await klienServer();

    const { data: lama } = await sb.from("site_settings").select("*").eq("id", 1).maybeSingle();

    let targetLogo = lama?.logo_path ?? null;
    let targetFavicon = lama?.favicon_path ?? null;

    if (opsi.hapusLogo) {
      await bersihkanBerkasLama(sb, lama?.logo_path);
      targetLogo = null;
    } else if (opsi.logoPath !== undefined) {
      if (lama?.logo_path && lama.logo_path !== opsi.logoPath) {
        await bersihkanBerkasLama(sb, lama.logo_path);
      }
      targetLogo = opsi.logoPath;
    }

    if (opsi.hapusFavicon) {
      await bersihkanBerkasLama(sb, lama?.favicon_path);
      targetFavicon = null;
    } else if (opsi.faviconPath !== undefined) {
      if (lama?.favicon_path && lama.favicon_path !== opsi.faviconPath) {
        await bersihkanBerkasLama(sb, lama.favicon_path);
      }
      targetFavicon = opsi.faviconPath;
    }

    const nilaiBaru = {
      id: 1,
      logo_path: targetLogo,
      favicon_path: targetFavicon,
      diperbarui_pada: new Date().toISOString(),
      diperbarui_oleh: pengguna.id,
    };

    const { error } = await sb.from("site_settings").upsert(nilaiBaru);
    if (error) {
      return { sukses: false, pesan: "Gagal menyimpan branding: " + error.message };
    }

    await catatAudit(sb, {
      jenis: "tampilan",
      aksi: "simpan_branding",
      keterangan: "Memperbarui logo dan ikon situs",
      nilaiLama: lama ?? null,
      nilaiBaru,
      pelakuId: pengguna.id,
      pelakuNama: pengguna.nama,
    });

    bersihkanCacheTema();
    revalidatePath("/", "layout");

    return { sukses: true, pesan: "Logo dan ikon situs berhasil diperbarui." };
  } catch (err) {
    return {
      sukses: false,
      pesan: err instanceof Error ? err.message : "Terjadi kesalahan sistem.",
    };
  }
}

/** Mengembalikan warna atau seluruh pengaturan ke nilai bawaan */
export async function kembalikanBawaan(bagian: "warna" | "semua" = "warna"): Promise<HasilAksi> {
  try {
    const pengguna = await periksaSuperAdmin();
    const sb = await klienServer();

    const { data: lama } = await sb.from("site_settings").select("*").eq("id", 1).maybeSingle();

    if (bagian === "warna") {
      const nilaiBaru = {
        id: 1,
        warna_utama: TEMA_BAWAAN.warnaUtama,
        diperbarui_pada: new Date().toISOString(),
        diperbarui_oleh: pengguna.id,
      };

      const { error } = await sb.from("site_settings").upsert(nilaiBaru);
      if (error) {
        return { sukses: false, pesan: "Gagal mengembalikan warna bawaan: " + error.message };
      }

      await catatAudit(sb, {
        jenis: "tampilan",
        aksi: "kembalikan_bawaan_warna",
        keterangan: "Mengembalikan warna utama ke nilai bawaan",
        nilaiLama: lama ?? null,
        nilaiBaru,
        pelakuId: pengguna.id,
        pelakuNama: pengguna.nama,
      });
    } else {
      if (lama?.logo_path) await bersihkanBerkasLama(sb, lama.logo_path);
      if (lama?.favicon_path) await bersihkanBerkasLama(sb, lama.favicon_path);

      const nilaiBaru = {
        id: 1,
        nama_aplikasi: TEMA_BAWAAN.namaAplikasi,
        nama_unit: TEMA_BAWAAN.namaUnit,
        nama_organisasi: TEMA_BAWAAN.namaOrganisasi,
        warna_utama: TEMA_BAWAAN.warnaUtama,
        logo_path: null,
        favicon_path: null,
        alamat: TEMA_BAWAAN.alamat ?? null,
        telepon: TEMA_BAWAAN.telepon ?? null,
        email: TEMA_BAWAAN.email ?? null,
        diperbarui_pada: new Date().toISOString(),
        diperbarui_oleh: pengguna.id,
      };

      const { error } = await sb.from("site_settings").upsert(nilaiBaru);
      if (error) {
        return { sukses: false, pesan: "Gagal mereset pengaturan: " + error.message };
      }

      await catatAudit(sb, {
        jenis: "tampilan",
        aksi: "kembalikan_bawaan_semua",
        keterangan: "Mengembalikan seluruh pengaturan tampilan ke nilai bawaan",
        nilaiLama: lama ?? null,
        nilaiBaru,
        pelakuId: pengguna.id,
        pelakuNama: pengguna.nama,
      });
    }

    bersihkanCacheTema();
    revalidatePath("/", "layout");

    return {
      sukses: true,
      pesan: `Pengaturan ${bagian === "warna" ? "warna" : "tampilan"} berhasil dikembalikan ke bawaan.`,
    };
  } catch (err) {
    return {
      sukses: false,
      pesan: err instanceof Error ? err.message : "Terjadi kesalahan sistem.",
    };
  }
}
