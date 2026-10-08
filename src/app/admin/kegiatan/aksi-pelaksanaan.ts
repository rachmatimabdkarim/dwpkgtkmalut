"use server";

import { revalidatePath } from "next/cache";
import { klienServer, penggunaSaatIni } from "@/lib/supabase-server";

/**
 * SERVER ACTIONS PELAKSANAAN KEGIATAN
 * Menangani panitia, tugas panitia, presensi peserta, dan dokumentasi foto.
 * Setiap perubahan wajib mencatat riwayat ke tabel activity_logs.
 */

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
