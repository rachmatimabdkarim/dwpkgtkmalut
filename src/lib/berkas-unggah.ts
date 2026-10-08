"use client";

/**
 * UNGGAH DUA TAHAP
 * 1) Berkas naik dulu ke folder sementara (tmp/) dan terdaftar sebagai "sementara".
 * 2) Setelah formulir/data disimpan, berkas dipindahkan ke lokasi resmi dan
 *    statusnya menjadi "resmi".
 * Berkas sementara yang tidak pernah disimpan akan dihapus otomatis.
 */

import { klienPeramban } from "./supabase-peramban";
import { kompresGambar, buatThumb, hashBerkas, namaAman, type HasilKompresi } from "./berkas-kompres";

export type Bucket = "publik" | "internal";

export type BerkasTerunggah = {
  id: string;
  bucket: Bucket;
  path: string;
  url: string;
  thumbUrl?: string;
  ukuran: number;
  lebar?: number;
  tinggi?: number;
  namaAsli: string;
};

/** Mengunggah satu berkas yang SUDAH dikompres ke folder sementara. */
async function unggahSementara(
  berkas: File,
  bucket: Bucket,
  kategori: string,
  ukuran: { lebar?: number; tinggi?: number },
  hash: string,
  entitas?: string,
): Promise<BerkasTerunggah> {
  const sb = klienPeramban();
  const path = `tmp/${namaAman(berkas.name)}`;

  const { error: gagalUnggah } = await sb.storage.from(bucket).upload(path, berkas, {
    cacheControl: "3600",
    upsert: false,
    contentType: berkas.type,
  });
  if (gagalUnggah) throw new Error("Gagal mengunggah: " + gagalUnggah.message);

  const { data: baris, error: gagalCatat } = await sb
    .from("attachments")
    .insert({
      bucket,
      path,
      nama_asli: berkas.name,
      tipe_mime: berkas.type,
      ukuran_byte: berkas.size,
      hash_sha256: hash,
      visibilitas: bucket === "publik" ? "publik" : "privat",
      status: "sementara",
      kategori,
      entitas: entitas ?? null,
      lebar: ukuran.lebar ?? null,
      tinggi: ukuran.tinggi ?? null,
    })
    .select("id")
    .single();
  if (gagalCatat) {
    await sb.storage.from(bucket).remove([path]);
    throw new Error("Berkas gagal didaftarkan: " + gagalCatat.message);
  }

  const url = sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  return {
    id: baris.id,
    bucket,
    path,
    url,
    ukuran: berkas.size,
    lebar: ukuran.lebar,
    tinggi: ukuran.tinggi,
    namaAsli: berkas.name,
  };
}

/** Mengunggah foto: dikompres dulu, lalu naik ke folder sementara. */
export async function unggahFoto(
  berkasAsli: File,
  jenis: keyof typeof import("./berkas-kompres").BATAS,
  bucket: Bucket,
  entitas?: string,
  lapor?: (tahap: string) => void,
): Promise<BerkasTerunggah> {
  const hasil: HasilKompresi = await kompresGambar(berkasAsli, jenis, lapor);
  lapor?.("Mengunggah…");
  return unggahSementara(
    hasil.berkas,
    bucket,
    jenis,
    { lebar: hasil.lebar, tinggi: hasil.tinggi },
    hasil.hash,
    entitas,
  );
}

/** Mengunggah dokumen (PDF/DOCX/XLSX) dengan pemeriksaan ukuran dan jenis. */
export async function unggahDokumen(
  berkas: File,
  bucket: Bucket = "internal",
  batasMb = 2,
  entitas?: string,
): Promise<BerkasTerunggah> {
  const diizinkan = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  if (!diizinkan.includes(berkas.type)) {
    throw new Error("Jenis berkas tidak diizinkan. Gunakan PDF, DOCX, atau XLSX.");
  }
  if (berkas.size > batasMb * 1024 * 1024) {
    throw new Error(
      `Berkas terlalu besar (${(berkas.size / 1024 / 1024).toFixed(1)} MB). ` +
        `Maksimal ${batasMb} MB. Cara mengecilkan: buka berkas lalu pilih "Cetak ke PDF" dengan kualitas rendah, atau kompres lewat situs pemampat PDF.`,
    );
  }
  const hash = await hashBerkas(berkas);
  return unggahSementara(berkas, bucket, "dokumen", {}, hash, entitas);
}

/** Membuat gambar kecil dari berkas yang sudah diunggah. */
export async function unggahThumb(berkasAsli: File, bucket: Bucket): Promise<BerkasTerunggah | null> {
  try {
    const kecil = await buatThumb(berkasAsli);
    return await unggahSementara(
      kecil.berkas,
      bucket,
      "thumb",
      { lebar: kecil.lebar, tinggi: kecil.tinggi },
      kecil.hash,
    );
  } catch {
    return null; // gambar kecil bersifat pilihan
  }
}

/** Menghapus berkas (berkas fisik + catatannya) — dipakai saat batal/ganti. */
export async function hapusBerkas(item: { id: string; bucket: string; path: string }) {
  const sb = klienPeramban();
  await sb.storage.from(item.bucket).remove([item.path]);
  await sb.from("attachments").delete().eq("id", item.id);
}

/**
 * Memindahkan berkas dari folder sementara ke lokasi resmi.
 * Dipanggil setelah data induknya tersimpan.
 */
export async function jadikanResmi(
  item: BerkasTerunggah,
  tujuan: string,
  entitas: string,
  entitasId: string,
): Promise<BerkasTerunggah> {
  const sb = klienPeramban();
  const namaBaru = item.path.replace(/^tmp\//, `${tujuan}/`);

  const { error: gagalPindah } = await sb.storage.from(item.bucket).move(item.path, namaBaru);
  if (gagalPindah) throw new Error("Gagal memindahkan berkas: " + gagalPindah.message);

  const { error: gagalCatat } = await sb
    .from("attachments")
    .update({
      path: namaBaru,
      status: "resmi",
      entitas,
      entitas_id: entitasId,
      resmi_pada: new Date().toISOString(),
    })
    .eq("id", item.id);
  if (gagalCatat) throw new Error("Gagal memperbarui catatan berkas: " + gagalCatat.message);

  const url = sb.storage.from(item.bucket).getPublicUrl(namaBaru).data.publicUrl;
  return { ...item, path: namaBaru, url };
}
