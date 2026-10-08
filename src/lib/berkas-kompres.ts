"use client";

/**
 * PENGECOMPRES GAMBAR DI PERAMBAN
 * Semua foto dikompres SEBELUM diunggah supaya kuota penyimpanan gratis
 * tidak cepat habis. Foto juga diperkecil dan metadata lokasi (GPS)
 * dihapus otomatis oleh proses penggambaran ulang.
 */

import imageCompression from "browser-image-compression";

export type BatasGambar = {
  maxSisi: number;
  maxByte: number;
  kualitasAwal: number;
  kualitasMin: number;
};

/** Aturan ukuran sesuai spesifikasi. */
export const BATAS: Record<string, BatasGambar> = {
  foto_kegiatan: { maxSisi: 1600, maxByte: 200 * 1024, kualitasAwal: 0.75, kualitasMin: 0.5 },
  lampiran: { maxSisi: 1200, maxByte: 200 * 1024, kualitasAwal: 0.75, kualitasMin: 0.5 },
  foto_profil: { maxSisi: 800, maxByte: 150 * 1024, kualitasAwal: 0.75, kualitasMin: 0.5 },
  banner: { maxSisi: 1920, maxByte: 300 * 1024, kualitasAwal: 0.78, kualitasMin: 0.55 },
  thumb: { maxSisi: 400, maxByte: 30 * 1024, kualitasAwal: 0.7, kualitasMin: 0.5 },
  logo: { maxSisi: 400, maxByte: 100 * 1024, kualitasAwal: 0.85, kualitasMin: 0.6 },
  favicon: { maxSisi: 512, maxByte: 50 * 1024, kualitasAwal: 0.9, kualitasMin: 0.6 },
};

export type HasilKompresi = {
  berkas: File;
  namaAsli: string;
  ukuranAsli: number;
  ukuranHasil: number;
  lebar: number;
  tinggi: number;
  tipeMime: string;
  hash: string;
};

/** Menghitung sidik jari isi berkas (SHA-256) untuk mencegah unggahan ganda. */
export async function hashBerkas(berkas: Blob): Promise<string> {
  const buf = await berkas.arrayBuffer();
  const ringkas = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(ringkas))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function ukuranGambar(berkas: Blob): Promise<{ lebar: number; tinggi: number }> {
  return new Promise((selesai, gagal) => {
    const url = URL.createObjectURL(berkas);
    const img = new Image();
    img.onload = () => {
      selesai({ lebar: img.naturalWidth, tinggi: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      gagal(new Error("Gambar tidak dapat dibaca."));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** Apakah peramban mendukung WebP sebagai hasil kompresi. */
function dukungWebp(): boolean {
  try {
    const c = document.createElement("canvas");
    return c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

/**
 * Mengompres satu gambar. Kualitas diturunkan bertahap sampai ukurannya
 * di bawah batas, dengan batas bawah kualitas agar hasil tidak terlalu rusak.
 */
export async function kompresGambar(
  berkasAsli: File,
  jenis: keyof typeof BATAS,
  lapor?: (tahap: string) => void,
): Promise<HasilKompresi> {
  const batas = BATAS[jenis];
  const webp = dukungWebp();
  const tipeTarget = webp ? "image/webp" : "image/jpeg";
  const namaDasar = berkasAsli.name.replace(/\.[^.]+$/, "");

  let kualitas = batas.kualitasAwal;
  let batasSisi = batas.maxSisi;
  let hasil: File | Blob = berkasAsli;
  let putaran = 0;

  while (true) {
    putaran++;
    lapor?.(`Mengompres… (putaran ${putaran})`);
    const opsi = {
      maxWidthOrHeight: batasSisi,
      initialQuality: kualitas,
      fileType: tipeTarget,
      useWebWorker: true,
      maxIteration: 6,
      alwaysKeepResolution: false,
      preserveExif: false, // metadata termasuk lokasi GPS dihapus
    };
    hasil = await imageCompression(berkasAsli, opsi);

    if (hasil.size <= batas.maxByte) break;

    // Bila sudah di batas kualitas terendah tetapi masih terlalu besar,
    // perkecil dimensinya bertahap sampai ukuran target tercapai.
    if (kualitas <= batas.kualitasMin) {
      if (batasSisi <= 640) break; // sudah sekecil mungkin
      batasSisi = Math.max(640, Math.round(batasSisi * 0.78));
      continue;
    }

    kualitas = Math.max(batas.kualitasMin, Number((kualitas - 0.08).toFixed(2)));
  }

  const { lebar, tinggi } = await ukuranGambar(hasil);
  const ekstensi = tipeTarget === "image/webp" ? "webp" : "jpg";
  const file = new File([hasil], `${namaDasar}.${ekstensi}`, { type: tipeTarget });

  return {
    berkas: file,
    namaAsli: berkasAsli.name,
    ukuranAsli: berkasAsli.size,
    ukuranHasil: file.size,
    lebar,
    tinggi,
    tipeMime: tipeTarget,
    hash: await hashBerkas(file),
  };
}

/** Membuat gambar kecil (400 px) untuk daftar/galeri. */
export async function buatThumb(berkas: File, lapor?: (t: string) => void): Promise<HasilKompresi> {
  return kompresGambar(berkas, "thumb", lapor);
}

/**
 * Memangkas gambar menjadi persegi dan menghasilkan beberapa ukuran
 * (untuk ikon situs). Dijalankan di peramban.
 */
export async function buatPersegi(
  berkas: File,
  ukuran: number,
  tipe: "image/png" | "image/webp" = "image/png",
): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((selesai, gagal) => {
    const url = URL.createObjectURL(berkas);
    const i = new Image();
    i.onload = () => {
      selesai(i);
      URL.revokeObjectURL(url);
    };
    i.onerror = () => gagal(new Error("Gambar tidak dapat dibaca."));
    i.src = url;
  });

  const sisi = Math.min(img.naturalWidth, img.naturalHeight);
  const mulaiX = (img.naturalWidth - sisi) / 2;
  const mulaiY = (img.naturalHeight - sisi) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = ukuran;
  canvas.height = ukuran;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, mulaiX, mulaiY, sisi, sisi, 0, 0, ukuran, ukuran);

  return new Promise((selesai) => canvas.toBlob((b) => selesai(b!), tipe, 0.9));
}

/** Ukuran yang dipakai untuk ikon situs. */
export const UKURAN_FAVICON = [32, 180, 192, 512];

/** Format ukuran berkas agar mudah dibaca manusia. */
export function ukuranTerbaca(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${(byte / 1024).toFixed(0)} KB`;
  return `${(byte / 1024 / 1024).toFixed(2)} MB`;
}

/** Menyisipkan akhiran acak agar nama berkas tidak bentrok. */
export function namaAman(nama: string): string {
  const bersih = nama
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const acak = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}-${acak}-${bersih}`;
}
