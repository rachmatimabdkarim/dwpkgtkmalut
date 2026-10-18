"use server";

import { revalidatePath } from "next/cache";
import { klienServer, penggunaSaatIni } from "@/lib/supabase-server";

/**
 * SERVER ACTIONS PELAKSANAAN KEGIATAN
 * Menangani panitia, tugas panitia, presensi peserta, dan dokumentasi foto.
 * Setiap perubahan wajib mencatat riwayat ke tabel activity_logs.
 */

/* ============================================================
   0. PENGAMAN BERSAMA — data pelaksanaan terkunci setelah laporan diajukan
   ============================================================ */

/**
 * Menolak penulisan bila laporan sudah diajukan.
 *
 * Panitia, tugas, presensi, dan dokumentasi adalah ISI YANG DINILAI penyetuju.
 * Kalau bisa diubah di tengah penilaian, penyetuju bisa memutuskan atas data
 * yang sudah berbeda. Karena itu seluruh penulisan pelaksanaan ditutup begitu
 * status masuk `laporan_diajukan` dan sesudahnya.
 */
async function pastikanBelumDiajukan(
  sb: Awaited<ReturnType<typeof klienServer>>,
  activityId: string,
): Promise<{ galat: string } | null> {
  const { data } = await sb
    .from("activities")
    .select("status")
    .eq("id", activityId)
    .maybeSingle<{ status: string }>();
  if (!data) return { galat: "Kegiatan tidak ditemukan." };
  if (["laporan_diajukan", "laporan_dalam_review", "laporan_disetujui", "arsip"].includes(data.status)) {
    return {
      galat:
        "Laporan sudah diajukan, jadi data pelaksanaan tidak dapat diubah lagi. " +
        "Bila ada yang harus diperbaiki, minta penyetuju mengembalikan laporan.",
    };
  }
  return null;
}

/**
 * Hanya PENANGGUNG JAWAB kegiatan (atau Super Admin) yang boleh menyusun
 * panitia dan menugaskan pekerjaan.
 *
 * Aturan pemilik: "yang bisa menambahkan ketua panitia dan anggota panitia
 * hanya penanggung jawab kegiatan", dan penanggung jawab yang menugaskan
 * pengelola presensi/dokumentasi.
 *
 * Dipisah dari pastikanBelumDiajukan karena orang yang berbeda bisa
 * memegang keduanya: pengelola presensi boleh mencatat kehadiran tanpa
 * berhak mengubah susunan panitia.
 */
async function pastikanPengurusPanitia(
  sb: Awaited<ReturnType<typeof klienServer>>,
  activityId: string,
): Promise<{ galat: string } | null> {
  const { data } = await sb
    .from("activities")
    .select("penanggung_jawab")
    .eq("id", activityId)
    .maybeSingle<{ penanggung_jawab: string | null }>();
  if (!data) return { galat: "Kegiatan tidak ditemukan." };

  const { data: boleh } = await sb.rpc("boleh_urus_panitia", { p_activity: activityId });
  if (boleh === false) {
    return {
      galat:
        "Hanya penanggung jawab kegiatan yang dapat menyusun panitia dan menugaskan pekerjaan.",
    };
  }
  return null;
}

/**
 * Presensi dan dokumentasi hanya boleh dikelola PENUGAS yang ditunjuk
 * penanggung jawab. Penanggung jawab dan Super Admin tetap bisa sebagai
 * cadangan bila pengelola berhalangan.
 *
 * Aturan pemilik: "yang bisa membuka dan mengelola tab presensi dan
 * dokumentasi hanya yang ditugaskan."
 *
 * Diperiksa di server, bukan hanya dengan menyembunyikan tab — permintaan
 * bisa dikirim langsung tanpa melewati tampilan.
 */
async function pastikanPengelolaBagian(
  sb: Awaited<ReturnType<typeof klienServer>>,
  activityId: string,
  bagian: "presensi" | "dokumentasi",
): Promise<{ galat: string } | null> {
  const { data: boleh } = await sb.rpc("boleh_kelola_bagian", {
    p_activity: activityId,
    p_bagian: bagian,
  });
  if (boleh === false) {
    const nama = bagian === "presensi" ? "presensi" : "dokumentasi";
    return {
      galat: `Hanya pengelola ${nama} yang ditugaskan penanggung jawab yang dapat mengubah bagian ini.`,
    };
  }
  return null;
}

/* ============================================================
   1. PANITIA KEGIATAN
   ============================================================ */

export async function tambahPanitia(
  activityId: string,
  data: {
    profileId?: string | null;
    namaLuar?: string | null;
    peran: string;
  },
) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };
  if (!data.peran?.trim()) return { galat: "Peran panitia wajib diisi." };
  if (!data.profileId && !data.namaLuar?.trim()) {
    return { galat: "Pilih pengurus atau tulis nama panitia luar." };
  }

  const sb = await klienServer();

  const bukanPengurusPanitia = await pastikanPengurusPanitia(sb, activityId);
  if (bukanPengurusPanitia) return { galat: bukanPengurusPanitia.galat };

  const terhalang = await pastikanBelumDiajukan(sb, activityId);
  if (terhalang) return { galat: terhalang.galat };
  let namaTercatat = data.namaLuar?.trim() || "";

  if (data.profileId) {
    const { data: prof } = await sb
      .from("profiles")
      .select("nama")
      .eq("id", data.profileId)
      .maybeSingle();
    if (prof?.nama) namaTercatat = prof.nama;
  }

  const { error } = await sb.from("committees").insert({
    activity_id: activityId,
    profile_id: data.profileId || null,
    nama_luar: data.profileId ? null : data.namaLuar?.trim() || null,
    peran: data.peran.trim(),
  });
  if (error) return { galat: "Gagal menambahkan panitia: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "tambah_panitia",
    keterangan: `Menambahkan panitia: ${namaTercatat} (${data.peran.trim()})`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

export async function hapusPanitia(activityId: string, committeeId: string) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };
  const sb = await klienServer();

  const bukanPengurusPanitia = await pastikanPengurusPanitia(sb, activityId);
  if (bukanPengurusPanitia) return { galat: bukanPengurusPanitia.galat };

  const terhalang = await pastikanBelumDiajukan(sb, activityId);
  if (terhalang) return { galat: terhalang.galat };

  const { data: panitia } = await sb
    .from("committees")
    .select(`
      id, peran, nama_luar,
      profiles(nama)
    `)
    .eq("id", committeeId)
    .maybeSingle();

  const profilRaw = panitia?.profiles as unknown;
  const profil = (Array.isArray(profilRaw) ? profilRaw[0] : profilRaw) as { nama: string } | null | undefined;
  const nama = profil?.nama || panitia?.nama_luar || "Panitia";
  const peran = panitia?.peran || "";

  // Hapus tugas yang terikat dengan panitia ini
  await sb.from("tasks").delete().eq("committee_id", committeeId);

  const { error } = await sb.from("committees").delete().eq("id", committeeId);
  if (error) return { galat: "Gagal menghapus panitia: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "hapus_panitia",
    keterangan: `Menghapus panitia: ${nama}${peran ? ` (${peran})` : ""}`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

/* ============================================================
   2. TUGAS PANITIA
   ============================================================ */

export async function tambahTugas(
  activityId: string,
  data: {
    committeeId?: string | null;
    judul: string;
    batas?: string | null;
  },
) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };
  if (!data.judul?.trim()) return { galat: "Judul tugas wajib diisi." };

  const sb = await klienServer();

  const bukanPengurusPanitia = await pastikanPengurusPanitia(sb, activityId);
  if (bukanPengurusPanitia) return { galat: bukanPengurusPanitia.galat };

  const terhalang = await pastikanBelumDiajukan(sb, activityId);
  if (terhalang) return { galat: terhalang.galat };
  const { error } = await sb.from("tasks").insert({
    activity_id: activityId,
    committee_id: data.committeeId || null,
    judul: data.judul.trim(),
    batas: data.batas || null,
    selesai: false,
  });
  if (error) return { galat: "Gagal menambahkan tugas: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "tambah_tugas",
    keterangan: `Menambahkan tugas: "${data.judul.trim()}"`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

export async function ubahStatusTugas(
  activityId: string,
  taskId: string,
  selesai: boolean,
) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const sb = await klienServer();

  const bukanPengurusPanitia = await pastikanPengurusPanitia(sb, activityId);
  if (bukanPengurusPanitia) return { galat: bukanPengurusPanitia.galat };

  const terhalang = await pastikanBelumDiajukan(sb, activityId);
  if (terhalang) return { galat: terhalang.galat };
  const { data: t } = await sb
    .from("tasks")
    .select("judul")
    .eq("id", taskId)
    .maybeSingle();

  const { error } = await sb
    .from("tasks")
    .update({ selesai })
    .eq("id", taskId)
    .eq("activity_id", activityId);
  if (error) return { galat: "Gagal memperbarui status tugas: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "ubah_status_tugas",
    keterangan: selesai
      ? `Menandai selesai tugas: "${t?.judul ?? "Tugas"}"`
      : `Menandai belum selesai tugas: "${t?.judul ?? "Tugas"}"`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

export async function hapusTugas(activityId: string, taskId: string) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const sb = await klienServer();

  const bukanPengurusPanitia = await pastikanPengurusPanitia(sb, activityId);
  if (bukanPengurusPanitia) return { galat: bukanPengurusPanitia.galat };

  const terhalang = await pastikanBelumDiajukan(sb, activityId);
  if (terhalang) return { galat: terhalang.galat };
  const { data: t } = await sb
    .from("tasks")
    .select("judul")
    .eq("id", taskId)
    .maybeSingle();

  const { error } = await sb
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("activity_id", activityId);
  if (error) return { galat: "Gagal menghapus tugas: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "hapus_tugas",
    keterangan: `Menghapus tugas: "${t?.judul ?? "Tugas"}"`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

/* ============================================================
   3. PRESENSI PESERTA
   ============================================================ */

export async function tambahPeserta(
  activityId: string,
  data: {
    profileId?: string | null;
    nama?: string | null;
    keterangan?: string | null; // Hadir / Izin / Sakit
  },
) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const sb = await klienServer();

  const bukanPengelola = await pastikanPengelolaBagian(sb, activityId, "presensi");
  if (bukanPengelola) return { galat: bukanPengelola.galat };

  const terhalang = await pastikanBelumDiajukan(sb, activityId);
  if (terhalang) return { galat: terhalang.galat };
  let namaPeserta = data.nama?.trim() || "";

  if (data.profileId) {
    const { data: prof } = await sb
      .from("profiles")
      .select("nama")
      .eq("id", data.profileId)
      .maybeSingle();
    if (prof?.nama) namaPeserta = prof.nama;
  }

  if (!namaPeserta) {
    return { galat: "Pilih pengurus atau masukkan nama peserta." };
  }

  const ket = data.keterangan || "Hadir";

  // CEGAH DOBEL. Temuan pemilik: peserta yang sama bisa dimasukkan berkali-kali
  // sehingga jumlah hadir di laporan menjadi tidak benar (mis. 27 padahal 20).
  // Diperiksa dua cara: lewat akun pengurus, dan lewat nama (untuk peserta tamu
  // yang tidak punya akun). Nama dibandingkan tanpa membedakan huruf besar/kecil
  // dan spasi berlebih, supaya "Siti Aminah" dan " siti  aminah " dianggap sama.
  const { data: sudahAda } = await sb
    .from("attendances")
    .select("id, profile_id, nama")
    .eq("activity_id", activityId);
  const rapikan = (t: string) => t.trim().toLowerCase().replace(/\s+/g, " ");
  const kembar = (sudahAda ?? []).find((a) =>
    data.profileId
      ? a.profile_id === data.profileId
      : rapikan(String(a.nama ?? "")) === rapikan(namaPeserta),
  );
  if (kembar) {
    return {
      galat: `${namaPeserta} sudah tercatat hadir di kegiatan ini. Satu peserta cukup dicatat sekali.`,
    };
  }

  const { error } = await sb.from("attendances").insert({
    activity_id: activityId,
    profile_id: data.profileId || null,
    nama: namaPeserta,
    keterangan: ket,
  });
  if (error) return { galat: "Gagal menambahkan peserta: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "tambah_peserta",
    keterangan: `Mencatat presensi peserta: ${namaPeserta} (${ket})`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

export async function hapusPeserta(activityId: string, attendanceId: string) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const sb = await klienServer();

  const bukanPengelola = await pastikanPengelolaBagian(sb, activityId, "presensi");
  if (bukanPengelola) return { galat: bukanPengelola.galat };

  const terhalang = await pastikanBelumDiajukan(sb, activityId);
  if (terhalang) return { galat: terhalang.galat };
  const { data: pres } = await sb
    .from("attendances")
    .select("nama")
    .eq("id", attendanceId)
    .maybeSingle();

  const { error } = await sb
    .from("attendances")
    .delete()
    .eq("id", attendanceId)
    .eq("activity_id", activityId);
  if (error) return { galat: "Gagal menghapus peserta: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "hapus_peserta",
    keterangan: `Menghapus presensi peserta: ${pres?.nama ?? "Peserta"}`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

export async function tandaiSemuaHadir(activityId: string) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const sb = await klienServer();

  const bukanPengelola = await pastikanPengelolaBagian(sb, activityId, "presensi");
  if (bukanPengelola) return { galat: bukanPengelola.galat };

  const terhalang = await pastikanBelumDiajukan(sb, activityId);
  if (terhalang) return { galat: terhalang.galat };
  const { error } = await sb
    .from("attendances")
    .update({ keterangan: "Hadir" })
    .eq("activity_id", activityId);
  if (error) return { galat: "Gagal memperbarui presensi: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "tandai_semua_hadir",
    keterangan: "Menandai semua peserta presensi menjadi Hadir",
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

/* ============================================================
   4. DOKUMENTASI FOTO KEGIATAN
   ============================================================ */

export async function simpanKeteranganFoto(
  activityId: string,
  attachmentId: string,
  keterangan: string,
) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const sb = await klienServer();

  const bukanPengelola = await pastikanPengelolaBagian(sb, activityId, "dokumentasi");
  if (bukanPengelola) return { galat: bukanPengelola.galat };

  const terhalang = await pastikanBelumDiajukan(sb, activityId);
  if (terhalang) return { galat: terhalang.galat };
  const { error } = await sb
    .from("attachments")
    .update({ keterangan: keterangan.trim() || null })
    .eq("id", attachmentId);
  if (error) return { galat: "Gagal menyimpan keterangan foto: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "simpan_keterangan_foto",
    keterangan: `Memperbarui keterangan foto${keterangan.trim() ? `: "${keterangan.trim()}"` : ""}`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

export async function ubahVisibilitasFoto(
  activityId: string,
  attachmentId: string,
  bolehPublik: boolean,
) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const sb = await klienServer();

  const bukanPengelola = await pastikanPengelolaBagian(sb, activityId, "dokumentasi");
  if (bukanPengelola) return { galat: bukanPengelola.galat };

  const terhalang = await pastikanBelumDiajukan(sb, activityId);
  if (terhalang) return { galat: terhalang.galat };

  // Periksa hak akses: HANYA penanggung jawab kegiatan atau pengurus inti
  // (super_admin, ketua, wakil_ketua, sekretaris) yang boleh mengubah
  const { data: keg } = await sb
    .from("activities")
    .select("penanggung_jawab")
    .eq("id", activityId)
    .maybeSingle();

  const peranPengguna = pengguna.peran;
  const pengurusInti = ["super_admin", "ketua", "wakil_ketua", "sekretaris"];
  const boleh =
    peranPengguna.some((p) => pengurusInti.includes(p)) ||
    (keg?.penanggung_jawab && keg.penanggung_jawab === pengguna.id);

  if (!boleh) {
    return {
      galat: "Hanya penanggung jawab kegiatan atau pengurus inti yang berhak mengubah visibilitas foto.",
    };
  }

  // Batas: maksimal 10 foto yang boleh ditandai publik
  if (bolehPublik) {
    const { count, error: errCount } = await sb
      .from("attachments")
      .select("id", { count: "exact", head: true })
      .eq("entitas_id", activityId)
      .eq("visibilitas", "publik")
      .neq("id", attachmentId);

    if (!errCount && (count ?? 0) >= 10) {
      return {
        galat: "Maksimal 10 foto yang boleh ditampilkan ke publik. Silakan nonaktifkan visibilitas foto lain terlebih dahulu.",
      };
    }
  }

  const { error } = await sb
    .from("attachments")
    .update({ visibilitas: bolehPublik ? "publik" : "privat" })
    .eq("id", attachmentId);
  if (error) return { galat: "Gagal mengubah visibilitas foto: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "ubah_visibilitas_foto",
    keterangan: bolehPublik
      ? "Foto dokumentasi ditandai boleh tampil di web publik"
      : "Foto dokumentasi disetel sebagai internal (privat)",
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

export async function hapusFoto(activityId: string, attachmentId: string) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const sb = await klienServer();

  const bukanPengelola = await pastikanPengelolaBagian(sb, activityId, "dokumentasi");
  if (bukanPengelola) return { galat: bukanPengelola.galat };

  const terhalang = await pastikanBelumDiajukan(sb, activityId);
  if (terhalang) return { galat: terhalang.galat };
  const { data: berkas } = await sb
    .from("attachments")
    .select("id, bucket, path, nama_asli")
    .eq("id", attachmentId)
    .maybeSingle();

  if (berkas) {
    await sb.storage.from(berkas.bucket).remove([berkas.path]);
    const { error } = await sb.from("attachments").delete().eq("id", attachmentId);
    if (error) return { galat: "Gagal menghapus catatan foto: " + error.message };
  }

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "hapus_foto",
    keterangan: berkas
      ? `Menghapus foto: "${berkas.nama_asli}"`
      : "Menghapus foto dokumentasi kegiatan",
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

export async function sahkanFoto(activityId: string, attachmentIds: string[] | string) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const ids = Array.isArray(attachmentIds) ? attachmentIds : [attachmentIds];
  if (ids.length === 0) return { ok: true };

  const sb = await klienServer();

  const bukanPengelola = await pastikanPengelolaBagian(sb, activityId, "dokumentasi");
  if (bukanPengelola) return { galat: bukanPengelola.galat };

  const terhalang = await pastikanBelumDiajukan(sb, activityId);
  if (terhalang) return { galat: terhalang.galat };
  const { error } = await sb
    .from("attachments")
    .update({
      status: "resmi",
      entitas: "activities",
      entitas_id: activityId,
      resmi_pada: new Date().toISOString(),
    })
    .in("id", ids);

  if (error) return { galat: "Gagal mengesahkan foto: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "sahkan_foto",
    keterangan: `${ids.length} foto dokumentasi kegiatan disahkan`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

/* ============================================================
   PENUGASAN PENGELOLA PRESENSI & DOKUMENTASI
   ============================================================ */

/**
 * Menunjuk seorang panitia sebagai pengelola presensi atau dokumentasi.
 *
 * Aturan pemilik: penanggung jawab kegiatan yang menugaskan; hanya yang
 * ditugaskan yang bisa membuka dan mengelola bagian itu.
 *
 * Satu kegiatan hanya punya SATU pengelola per bagian — menunjuk orang baru
 * otomatis menggantikan yang lama, karena dua pencatat pada satu bagian
 * membuat data ganda dan sulit dipertanggungjawabkan.
 */
export async function tugaskanPengelola(
  activityId: string,
  committeeId: string,
  bagian: "presensi" | "dokumentasi",
) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const sb = await klienServer();

  const bukanPengurus = await pastikanPengurusPanitia(sb, activityId);
  if (bukanPengurus) return { galat: bukanPengurus.galat };

  const { data: panitia } = await sb
    .from("committees")
    .select("id, profile_id, nama_luar, peran")
    .eq("id", committeeId)
    .eq("activity_id", activityId)
    .maybeSingle<{ id: string; profile_id: string | null; nama_luar: string | null; peran: string }>();
  if (!panitia) return { galat: "Panitia tidak ditemukan pada kegiatan ini." };

  // Penugasan hanya berlaku untuk orang yang punya akun — tanpa akun, orang
  // itu tidak dapat masuk dan membuka tab yang ditugaskan.
  if (!panitia.profile_id) {
    return {
      galat:
        "Panitia ini tidak memiliki akun SI-ANGGUN, jadi tidak dapat membuka tab. " +
        "Pilih panitia yang terdaftar sebagai pengurus.",
    };
  }

  const { error } = await sb.from("penugasan_pengelola").upsert(
    {
      activity_id: activityId,
      committee_id: committeeId,
      bagian,
      ditugaskan_oleh: pengguna.id,
    },
    { onConflict: "activity_id,bagian" },
  );
  if (error) return { galat: "Gagal menugaskan: " + error.message };

  const nama = panitia.nama_luar || "panitia";
  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "tugaskan_pengelola",
    keterangan: `Penanggung jawab menugaskan ${nama} sebagai pengelola ${bagian}`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

/** Mencabut penugasan pengelola pada satu bagian. */
export async function cabutPenugasan(activityId: string, bagian: "presensi" | "dokumentasi") {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const sb = await klienServer();

  const bukanPengurus = await pastikanPengurusPanitia(sb, activityId);
  if (bukanPengurus) return { galat: bukanPengurus.galat };

  const { error } = await sb
    .from("penugasan_pengelola")
    .delete()
    .eq("activity_id", activityId)
    .eq("bagian", bagian);
  if (error) return { galat: "Gagal mencabut penugasan: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "cabut_penugasan",
    keterangan: `Penanggung jawab mencabut penugasan pengelola ${bagian}`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}
