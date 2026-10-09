"use server";

/**
 * Aksi pengelolaan data pengurus (tambah, ubah, hapus).
 * Hanya untuk super admin, ketua, wakil ketua, dan sekretaris.
 */

import { revalidatePath } from "next/cache";
import { klienServer, penggunaSaatIni } from "@/lib/supabase-server";
import { klienAdmin } from "@/lib/supabase-admin";
import { ROLES } from "@/lib/peran";

const ROLES_SAH = Object.keys(ROLES);

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

/** Membuat akun masuk untuk seorang pengurus. */
export async function buatkanAkun(masukan: {
  officerId: string;
  email: string;
  peran: string;
  kirimUndangan?: boolean;
}): Promise<HasilAksi & { email?: string }> {
  const izin = await pastikanBerhak();
  if ("galat" in izin) return { galat: izin.galat };

  try {
    const email = periksaEmail(bersihkan(masukan.email, true));
    if (!email) throw new Error("Email wajib diisi.");

    const sb = await klienServer();
    const { data: orang } = await sb
      .from("officers")
      .select("nama, jabatan, profile_id, email")
      .eq("id", masukan.officerId)
      .maybeSingle<{ nama: string; jabatan: string; profile_id: string | null; email: string | null }>();
    if (!orang) return { galat: "Data pengurus tidak ditemukan." };
    if (orang.profile_id) return { galat: `${orang.nama} sudah punya akun.` };

    // Satu email hanya untuk satu akun
    const { data: pemakaiEmail } = await sb
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (pemakaiEmail) return { galat: `Email ${email} sudah dipakai akun lain.` };

    // Akun baru selalu diberi kata sandi sementara; wajib diganti saat masuk pertama
    const sandiSementara = buatSandiSementara();
    const admin = klienAdmin();
    const { data: dibuat, error: gagalBuat } = await admin.auth.admin.createUser({
      email,
      password: sandiSementara,
      email_confirm: true,
      user_metadata: { nama: orang.nama, wajib_ganti_sandi: true },
    });
    if (gagalBuat) return { galat: "Gagal membuat akun: " + gagalBuat.message };

    const idBaru = dibuat.user?.id;
    if (!idBaru) return { galat: "Akun terbentuk tetapi id-nya tidak diterima." };

    // Catat profil dan peran
    await sb.from("profiles").upsert({
      id: idBaru,
      nama: orang.nama,
      email,
      jabatan: orang.jabatan,
    });

    const peran = ROLES_SAH.includes(masukan.peran) ? masukan.peran : "pengurus";
    await sb.from("user_roles").upsert({ user_id: idBaru, peran });

    // Tautkan pengurus ke akunnya
    await sb.from("officers").update({ profile_id: idBaru, email }).eq("id", masukan.officerId);

    await catatAudit(sb, izin.pengguna, "buat_akun_pengurus",
      `Membuat akun untuk ${orang.nama} (${email}) dengan peran ${peran}`);

    revalidatePath("/admin/pengurus");
    revalidatePath("/admin");
    return { ok: true, email };
  } catch (e) {
    return { galat: e instanceof Error ? e.message : "Terjadi kesalahan saat membuat akun." };
  }
}

/** Kata sandi sementara yang mudah dibaca tetapi cukup kuat. */
function buatSandiSementara(): string {
  const kata = ["Bakau", "Cengkih", "Kenari", "Pala", "Rotan", "Serai", "Sukun", "Kunyit", "Gurita", "Melati"];
  const a = kata[Math.floor(Math.random() * kata.length)];
  const b = Math.floor(100 + Math.random() * 900);
  const tanda = ["#", "@", "!", "?"][Math.floor(Math.random() * 4)];
  return `${a}${b}${tanda}`;
}

/**
 * Mengatur ulang sandi akun seorang pengurus.
 * Hanya Super Admin. Sandi baru dikembalikan SEKALI untuk dikirim ke orangnya
 * dan TIDAK disimpan dalam bentuk yang bisa dibaca.
 */
export async function aturUlangSandi(profileId: string): Promise<
  HasilAksi & { sandi?: string; nama?: string; email?: string }
> {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir. Silakan masuk kembali." };
  if (!pengguna.peran.includes("super_admin")) {
    return { galat: "Hanya Super Admin yang dapat mengatur ulang kata sandi." };
  }

  try {
    const sb = await klienServer();
    const { data: orang } = await sb
      .from("profiles")
      .select("id, nama, email")
      .eq("id", profileId)
      .maybeSingle<{ id: string; nama: string; email: string }>();
    if (!orang) return { galat: "Pengguna tidak ditemukan." };

    const sandi = buatSandiSementara();
    const admin = klienAdmin();
    const { error } = await admin.auth.admin.updateUserById(orang.id, {
      password: sandi,
      user_metadata: { nama: orang.nama, wajib_ganti_sandi: true },
    });
    if (error) return { galat: "Gagal mengatur ulang sandi: " + error.message };

    // Catat waktu pengaturan ulang supaya bisa ditelusuri
    await sb
      .from("profiles")
      .update({
        sandi_diatur_ulang_pada: new Date().toISOString(),
        sandi_diatur_ulang_oleh: pengguna.id,
      })
      .eq("id", orang.id);

    await catatAudit(
      sb,
      pengguna,
      "atur_ulang_sandi",
      `Mengatur ulang kata sandi untuk ${orang.nama} (${orang.email})`,
    );

    revalidatePath("/admin/pengurus");
    return { ok: true, sandi, nama: orang.nama, email: orang.email };
  } catch (e) {
    return { galat: e instanceof Error ? e.message : "Terjadi kesalahan saat mengatur ulang sandi." };
  }
}
