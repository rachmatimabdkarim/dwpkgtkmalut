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
  namaAplikasi: string;
  namaUnit: string;
  namaOrganisasi: string;
  alamat?: string;
  telepon?: string;
  email?: string;
  sambutan?: string;
  profilSingkat?: string;
  subJudulAgenda?: string;
  subJudulBerita?: string;
  subJudulGaleri?: string;
  subJudulUnduhan?: string;
}): Promise<HasilAksi> {
  try {
    const pengguna = await periksaSuperAdmin();
    const sb = await klienServer();

    if (!input.namaAplikasi?.trim()) {
      return { sukses: false, pesan: "Nama sistem tidak boleh kosong." };
    }
    if (!input.namaUnit?.trim()) {
      return { sukses: false, pesan: "Nama unit tidak boleh kosong." };
    }
    if (!input.namaOrganisasi?.trim()) {
      return { sukses: false, pesan: "Nama organisasi tidak boleh kosong." };
    }

    const { data: lama } = await sb.from("site_settings").select("*").eq("id", 1).maybeSingle();

    const nilaiBaru = {
      id: 1,
      nama_aplikasi: input.namaAplikasi.trim(),
      nama_unit: input.namaUnit.trim(),
      nama_organisasi: input.namaOrganisasi.trim(),
      alamat: input.alamat?.trim() ?? null,
      telepon: input.telepon?.trim() ?? null,
      email: input.email?.trim() ?? null,
      sambutan: input.sambutan?.trim() || null,
      profil_singkat: input.profilSingkat?.trim() || null,
      sub_judul_agenda: input.subJudulAgenda?.trim() || null,
      sub_judul_berita: input.subJudulBerita?.trim() || null,
      sub_judul_galeri: input.subJudulGaleri?.trim() || null,
      sub_judul_unduhan: input.subJudulUnduhan?.trim() || null,
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
