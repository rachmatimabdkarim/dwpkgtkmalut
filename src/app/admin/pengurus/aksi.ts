"use server";

/**
 * Aksi pengelolaan data pengurus (tambah, ubah, hapus).
 * Hanya untuk super admin, ketua, wakil ketua, dan sekretaris.
 */

import { revalidatePath } from "next/cache";
import { klienServer, penggunaSaatIni } from "@/lib/supabase-server";

const PERAN_BERHAK = ["super_admin", "ketua", "wakil_ketua", "sekretaris"];

/** Mencatat perubahan ke catatan audit yang tidak bisa dihapus. */
async function catatAudit(
  sb: Awaited<ReturnType<typeof klienServer>>,
  pengguna: { id: string; nama: string },
  aksi: string,
  keterangan: string,
) {
  await sb.from("audit_logs").insert({
    jenis: "pengurus",
    aksi,
    keterangan,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });
}


export type HasilAksi = { ok?: boolean; galat?: string };

async function pastikanBerhak() {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir. Silakan masuk kembali." };
  const berhak = pengguna.peran.some((p) => PERAN_BERHAK.includes(p));
  if (!berhak) return { galat: "Anda tidak berwenang mengubah data pengurus." };
  return { pengguna };
}

/** Membersihkan teks masukan dan memastikan tidak kosong. */
function bersihkan(nilai: string | null | undefined, wajib = false): string | null {
  const t = (nilai ?? "").trim();
  if (!t) {
    if (wajib) throw new Error("Kolom wajib belum diisi.");
    return null;
  }
  return t.slice(0, 200);
}

function periksaNama(nama: string | null) {
  if (!nama) throw new Error("Nama pengurus wajib diisi.");
  if (nama.length < 2) throw new Error("Nama pengurus terlalu pendek.");
  return nama;
}

function periksaEmail(email: string | null) {
  if (!email) return null;
  const pola = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pola.test(email)) throw new Error("Alamat email tidak sah. Contoh: nama@dwpkgtkmalut.com");
  return email.toLowerCase();
}

/** Menambah satu pengurus baru. */
export async function tambahPengurus(masukan: {
  nama: string;
  jabatan: string;
  bidang: string;
  bidangBaru?: string;
  email?: string;
  catatan?: string;
  urutan?: number;
}): Promise<HasilAksi> {
  const izin = await pastikanBerhak();
  if ("galat" in izin) return { galat: izin.galat };
  const sb = await klienServer();

  try {
    const nama = periksaNama(bersihkan(masukan.nama, true));
    const jabatan = bersihkan(masukan.jabatan, true);
    if (!jabatan) throw new Error("Jabatan wajib diisi.");

    // Bila pengguna memilih menambahkan bidang baru, pakai itu
    const bidang = (masukan.bidangBaru?.trim() || masukan.bidang || "").trim();
    if (!bidang) throw new Error("Bidang wajib dipilih.");

    // Cegah nama yang sama pada bidang yang sama
    const { data: kembar } = await sb
      .from("officers")
      .select("id")
      .eq("nama", nama)
      .eq("bidang", bidang)
      .maybeSingle();
    if (kembar) return { galat: `Nama "${nama}" sudah ada di ${bidang}.` };

    const { data: periode } = await sb
      .from("periods")
      .select("id")
      .eq("aktif", true)
      .maybeSingle<{ id: string }>();

    const { error } = await sb.from("officers").insert({
      nama,
      jabatan,
      bidang,
      email: periksaEmail(bersihkan(masukan.email)),
      catatan: bersihkan(masukan.catatan),
      urutan: typeof masukan.urutan === "number" ? masukan.urutan : 99,
      periode_id: periode?.id ?? null,
    });
    if (error) return { galat: "Gagal menyimpan: " + error.message };

    await catatAudit(sb, izin.pengguna, "tambah_pengurus",
      `Menambah pengurus: ${nama} (${jabatan} · ${bidang})`);

    revalidatePath("/admin/pengurus");
    revalidatePath("/profil");
    return { ok: true };
  } catch (e) {
    return { galat: e instanceof Error ? e.message : "Terjadi kesalahan." };
  }
}

/** Mengubah data pengurus yang sudah ada. */
export async function ubahPengurus(masukan: {
  id: string;
  nama: string;
  jabatan: string;
  bidang: string;
  email?: string;
  catatan?: string;
}): Promise<HasilAksi> {
  const izin = await pastikanBerhak();
  if ("galat" in izin) return { galat: izin.galat };
  const sb = await klienServer();

  try {
    const nama = periksaNama(bersihkan(masukan.nama, true));
    const jabatan = bersihkan(masukan.jabatan, true);
    const bidang = bersihkan(masukan.bidang, true);
    if (!jabatan || !bidang) throw new Error("Jabatan dan bidang wajib diisi.");

    const { error } = await sb
      .from("officers")
      .update({
        nama,
        jabatan,
        bidang,
        email: periksaEmail(bersihkan(masukan.email)),
        catatan: bersihkan(masukan.catatan),
      })
      .eq("id", masukan.id);
    if (error) return { galat: "Gagal menyimpan: " + error.message };

    await catatAudit(sb, izin.pengguna, "ubah_pengurus",
      `Mengubah data pengurus: ${nama} (${jabatan})`);

    revalidatePath("/admin/pengurus");
    revalidatePath("/profil");
    return { ok: true };
  } catch (e) {
    return { galat: e instanceof Error ? e.message : "Terjadi kesalahan." };
  }
}

/** Menghapus pengurus dari daftar. */
export async function hapusPengurus(id: string): Promise<HasilAksi> {
  const izin = await pastikanBerhak();
  if ("galat" in izin) return { galat: izin.galat };
  const sb = await klienServer();

  try {
    const { data: orang } = await sb
      .from("officers")
      .select("nama, jabatan, profile_id")
      .eq("id", id)
      .maybeSingle<{ nama: string; jabatan: string; profile_id: string | null }>();
    if (!orang) return { galat: "Data pengurus tidak ditemukan." };

    // Pengurus yang sudah punya akun tidak dihapus, hanya dikeluarkan dari daftar
    // agar riwayat kegiatan dan catatan persetujuannya tidak ikut hilang.
    const { error } = await sb.from("officers").delete().eq("id", id);
    if (error) return { galat: "Gagal menghapus: " + error.message };

    await catatAudit(sb, izin.pengguna, "hapus_pengurus",
      `Menghapus pengurus dari daftar: ${orang.nama} (${orang.jabatan})`);

    revalidatePath("/admin/pengurus");
    revalidatePath("/profil");
    return { ok: true };
  } catch (e) {
    return { galat: e instanceof Error ? e.message : "Terjadi kesalahan." };
  }
}
