"use server";

import { revalidatePath } from "next/cache";
import { klienServer, penggunaSaatIni } from "@/lib/supabase-server";

/**
 * AKSI PRESENSI QR — sisi petugas.
 *
 * Aturan yang dijaga:
 *  - hanya pengelola presensi yang ditugaskan (plus penanggung jawab &
 *    Super Admin) yang boleh mengatur jendela, membuat QR, dan mengonfirmasi;
 *  - membuka presensi di luar jadwal WAJIB beralasan, dan alasannya dicatat
 *    di riwayat kegiatan;
 *  - perbaikan nama peserta dilakukan PETUGAS, bukan peserta.
 */

async function pastikanPengelola(sb: Awaited<ReturnType<typeof klienServer>>, activityId: string) {
  const { data: boleh } = await sb.rpc("boleh_kelola_bagian", {
    p_activity: activityId,
    p_bagian: "presensi",
  });
  if (boleh === false) {
    return {
      galat:
        "Hanya pengelola presensi yang ditugaskan (atau penanggung jawab) yang dapat mengatur presensi.",
    };
  }
  return null;
}

/** Membuat/mengambil kode QR untuk kegiatan ini. */
export async function siapkanQr(activityId: string, jamMulai: string, jamSelesai: string) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };
  const sb = await klienServer();

  const tolak = await pastikanPengelola(sb, activityId);
  if (tolak) return { galat: tolak.galat };

  const sah = /^([01]\d|2[0-3]):[0-5]\d$/.test(jamMulai) && /^([01]\d|2[0-3]):[0-5]\d$/.test(jamSelesai);
  if (!sah) return { galat: "Jam harus dalam bentuk 24 jam, contoh 08:00." };
  if (jamSelesai <= jamMulai) {
    return { galat: "Jam tutup harus setelah jam buka." };
  }

  const { data: ada } = await sb
    .from("presensi_jendela")
    .select("kode_qr")
    .eq("activity_id", activityId)
    .maybeSingle<{ kode_qr: string | null }>();

  // Kode dibuat acak dan tidak mudah ditebak, supaya tidak bisa dipakai orang
  // di luar lokasi yang menemukan tautannya.
  const kode =
    ada?.kode_qr ??
    Array.from(crypto.getRandomValues(new Uint8Array(9)))
      .map((n) => "abcdefghjkmnpqrstuvwxyz23456789"[n % 31])
      .join("");

  const { error } = await sb.from("presensi_jendela").upsert(
    {
      activity_id: activityId,
      jam_mulai: jamMulai,
      jam_selesai: jamSelesai,
      kode_qr: kode,
      diperbarui_pada: new Date().toISOString(),
    },
    { onConflict: "activity_id" },
  );
  if (error) return { galat: "Gagal menyiapkan QR: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "atur_presensi_qr",
    keterangan: `Pengelola presensi mengatur jam presensi ${jamMulai}–${jamSelesai} dan menyiapkan QR.`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true, kode };
}

/** Membuka presensi di luar jadwal — WAJIB beralasan. */
export async function bukaPaksa(activityId: string, alasan: string) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };
  const sb = await klienServer();

  const tolak = await pastikanPengelola(sb, activityId);
  if (tolak) return { galat: tolak.galat };

  const bersih = alasan.trim();
  if (bersih.length < 10) {
    return {
      galat: "Alasan wajib ditulis minimal 10 huruf, supaya jelas mengapa presensi dibuka kembali.",
    };
  }

  const { error } = await sb
    .from("presensi_jendela")
    .update({
      dibuka_paksa: true,
      alasan_buka_paksa: bersih,
      dibuka_paksa_oleh: pengguna.id,
      dibuka_paksa_pada: new Date().toISOString(),
      diperbarui_pada: new Date().toISOString(),
    })
    .eq("activity_id", activityId);
  if (error) return { galat: "Gagal membuka presensi: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "buka_presensi_paksa",
    keterangan: `Presensi dibuka kembali di luar jadwal. Alasan: ${bersih}`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

/** Menutup kembali presensi yang tadi dibuka paksa. */
export async function tutupPaksa(activityId: string) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };
  const sb = await klienServer();

  const tolak = await pastikanPengelola(sb, activityId);
  if (tolak) return { galat: tolak.galat };

  const { error } = await sb
    .from("presensi_jendela")
    .update({
      dibuka_paksa: false,
      diperbarui_pada: new Date().toISOString(),
    })
    .eq("activity_id", activityId);
  if (error) return { galat: "Gagal menutup presensi: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "tutup_presensi_paksa",
    keterangan: "Presensi dikembalikan ke jadwal semula oleh pengelola presensi.",
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

/**
 * Konfirmasi kehadiran oleh petugas setelah memeriksa fisik.
 * `Hadir` = sah. `Tidak` = dikeluarkan dari daftar (absen palsu).
 */
export async function konfirmasiKehadiran(
  activityId: string,
  attendanceId: string,
  keputusan: "Hadir" | "Tidak",
) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };
  const sb = await klienServer();

  const tolak = await pastikanPengelola(sb, activityId);
  if (tolak) return { galat: tolak.galat };

  const { data: peserta } = await sb
    .from("attendances")
    .select("nama")
    .eq("id", attendanceId)
    .eq("activity_id", activityId)
    .maybeSingle<{ nama: string | null }>();
  if (!peserta) return { galat: "Data presensi tidak ditemukan." };

  if (keputusan === "Tidak") {
    // Tidak hadir: baris dihapus, karena absen lewat QR tanpa kehadiran fisik
    // tidak layak disimpan sebagai data kehadiran.
    const { error } = await sb
      .from("attendances")
      .delete()
      .eq("id", attendanceId)
      .eq("activity_id", activityId);
    if (error) return { galat: "Gagal menghapus: " + error.message };

    await sb.from("activity_logs").insert({
      activity_id: activityId,
      aksi: "tolak_presensi_qr",
      keterangan: `Petugas tidak menemukan ${peserta.nama ?? "peserta"} di lokasi; catatan absennya dihapus.`,
      pelaku_id: pengguna.id,
      pelaku_nama: pengguna.nama,
    });
  } else {
    const { error } = await sb
      .from("attendances")
      .update({ keterangan: "Hadir" })
      .eq("id", attendanceId)
      .eq("activity_id", activityId);
    if (error) return { galat: "Gagal mengonfirmasi: " + error.message };

    await sb.from("activity_logs").insert({
      activity_id: activityId,
      aksi: "konfirmasi_presensi",
      keterangan: `Petugas mengonfirmasi kehadiran ${peserta.nama ?? "peserta"} setelah pemeriksaan di lokasi.`,
      pelaku_id: pengguna.id,
      pelaku_nama: pengguna.nama,
    });
  }

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

/** Perbaikan nama peserta — dilakukan PETUGAS, bukan peserta. */
export async function perbaikiNamaPeserta(
  activityId: string,
  attendanceId: string,
  namaBaru: string,
) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };
  const sb = await klienServer();

  const tolak = await pastikanPengelola(sb, activityId);
  if (tolak) return { galat: tolak.galat };

  const bersih = namaBaru.trim();
  if (bersih.length < 3) return { galat: "Nama minimal 3 huruf." };

  const { error } = await sb
    .from("attendances")
    .update({ nama: bersih })
    .eq("id", attendanceId)
    .eq("activity_id", activityId);
  if (error) return { galat: "Gagal memperbaiki nama: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "perbaiki_nama_peserta",
    keterangan: `Petugas memperbaiki nama peserta menjadi "${bersih}".`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}
