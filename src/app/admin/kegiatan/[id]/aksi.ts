"use server";

import { revalidatePath } from "next/cache";
import { klienServer, penggunaSaatIni } from "@/lib/supabase-server";
import type { Peran } from "@/lib/kegiatan";

/** Jenjang persetujuan untuk sebuah tahap (diambil dari tabel pengaturan alur). */
async function jenjang(sb: Awaited<ReturnType<typeof klienServer>>, tahap: "perencanaan" | "pelaporan") {
  const { data } = await sb
    .from("approval_flows")
    .select("id, approval_steps(urutan, peran)")
    .eq("nama", tahap)
    .maybeSingle();
  const langkah = ((data?.approval_steps ?? []) as { urutan: number; peran: string }[])
    .slice()
    .sort((a, b) => a.urutan - b.urutan);
  return langkah;
}

/**
 * Memberi keputusan pada sebuah kegiatan.
 * Aturan wajib: pengusul TIDAK boleh menyetujui usulannya sendiri.
 */
export async function beriKeputusan(
  activityId: string,
  tahap: "perencanaan" | "pelaporan",
  keputusan: "setuju" | "revisi" | "tolak",
  catatan: string,
) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };
  if ((keputusan === "revisi" || keputusan === "tolak") && !catatan.trim()) {
    return { galat: "Catatan wajib diisi untuk Minta Revisi atau Tolak." };
  }

  const sb = await klienServer();

  const { data: keg } = await sb
    .from("activities")
    .select("id, status, dibuat_oleh, judul")
    .eq("id", activityId)
    .maybeSingle<{ id: string; status: string; dibuat_oleh: string; judul: string }>();
  if (!keg) return { galat: "Kegiatan tidak ditemukan." };

  if (keg.dibuat_oleh === pengguna.id) {
    return { galat: "Anda pengusul kegiatan ini, jadi tidak dapat menyetujuinya sendiri." };
  }

  // pastikan pengguna berperan pada langkah yang sedang menunggu
  const langkah = await jenjang(sb, tahap);
  const sudah = await sb
    .from("approvals")
    .select("step_urutan, keputusan")
    .eq("activity_id", activityId)
    .eq("tahap", tahap)
    .order("dibuat_pada", { ascending: true });
  const sudahSetuju = new Set(
    (sudah.data ?? [])
      .filter((a: { keputusan: string }) => a.keputusan === "setuju")
      .map((a: { step_urutan: number }) => a.step_urutan),
  );
  const berikut = langkah.find((l) => !sudahSetuju.has(l.urutan));
  if (!berikut) return { galat: "Semua jenjang sudah memberi keputusan." };

  const bolehDelegasi = await cekDelegasi(sb, berikut.peran, pengguna.peran as Peran[]);
  if (berikut.peran !== "super_admin" && !pengguna.peran.includes(berikut.peran as Peran) && !bolehDelegasi) {
    return { galat: `Saat ini menunggu keputusan ${berikut.peran.replace("_", " ")}.` };
  }

  const { error } = await sb.from("approvals").insert({
    activity_id: activityId,
    tahap,
    step_urutan: berikut.urutan,
    peran: berikut.peran,
    keputusan,
    catatan: catatan.trim() || null,
    oleh: pengguna.id,
  });
  if (error) return { galat: "Gagal menyimpan keputusan: " + error.message };

  // tentukan status kegiatan berikutnya
  let statusBaru = keg.status;
  if (keputusan === "revisi") statusBaru = tahap === "perencanaan" ? "revisi" : "selesai";
  else if (keputusan === "tolak") statusBaru = "ditolak";
  else {
    const sisa = langkah.filter((l) => l.urutan > berikut.urutan);
    const semuaSetuju =
      sisa.length === 0 ||
      langkah.every(
        (l) =>
          l.urutan === berikut.urutan ||
          sudahSetuju.has(l.urutan),
      );
    if (semuaSetuju) {
      statusBaru = tahap === "perencanaan" ? "disetujui" : "laporan_disetujui";
    } else {
      statusBaru = tahap === "perencanaan" ? "dalam_review" : "laporan_dalam_review";
    }
  }

  const perubahan: Record<string, unknown> = { status: statusBaru };
  await sb.from("activities").update(perubahan).eq("id", activityId);

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: `keputusan_${keputusan}`,
    keterangan:
      `${berikut.peran} memberi keputusan "${keputusan}" pada tahap ${tahap}` +
      (catatan.trim() ? ` — catatan: ${catatan.trim()}` : ""),
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  revalidatePath("/admin/kegiatan");
  revalidatePath("/admin");
  return { ok: true, statusBaru };
}

async function cekDelegasi(
  sb: Awaited<ReturnType<typeof klienServer>>,
  peranDibutuhkan: string,
  peranSaya: Peran[],
): Promise<boolean> {
  const hariIni = new Date().toISOString().slice(0, 10);
  const { data } = await sb
    .from("delegations")
    .select("dari_peran, ke_peran, mulai, selesai")
    .eq("dari_peran", peranDibutuhkan)
    .lte("mulai", hariIni)
    .gte("selesai", hariIni);
  if (!data) return false;
  return (data as { ke_peran: string }[]).some((d) => peranSaya.includes(d.ke_peran as Peran));
}

/** Mengubah status pelaksanaan: mulai berjalan, selesai, atau mengajukan laporan. */
export async function ubahTahap(
  activityId: string,
  aksi: "mulai" | "selesai" | "ajukan_laporan" | "arsipkan",
) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };
  const sb = await klienServer();

  const peta: Record<string, { dari: string[]; ke: string; label: string }> = {
    mulai: { dari: ["disetujui"], ke: "berjalan", label: "Kegiatan mulai dilaksanakan" },
    selesai: { dari: ["berjalan"], ke: "selesai", label: "Kegiatan selesai dilaksanakan" },
    ajukan_laporan: {
      dari: ["selesai"],
      ke: "laporan_diajukan",
      label: "Laporan diajukan untuk persetujuan",
    },
    arsipkan: {
      dari: ["laporan_disetujui"],
      ke: "arsip",
      label: "Laporan dikunci dan diarsipkan",
    },
  };
  const aturan = peta[aksi];
  const { data: keg } = await sb
    .from("activities")
    .select("status")
    .eq("id", activityId)
    .maybeSingle<{ status: string }>();
  if (!keg) return { galat: "Kegiatan tidak ditemukan." };
  if (!aturan.dari.includes(keg.status)) {
    return { galat: "Tahap kegiatan saat ini belum memungkinkan langkah tersebut." };
  }

  const { error } = await sb.from("activities").update({ status: aturan.ke }).eq("id", activityId);
  if (error) return { galat: error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi,
    keterangan: aturan.label,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  revalidatePath("/admin/kegiatan");
  return { ok: true };
}

/** Menyimpan isi laporan kegiatan. */
export async function simpanLaporan(
  activityId: string,
  isi: { ringkasan: string; hasil: string; kendala: string; rekomendasi: string; jumlahHadir: number },
) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };
  const sb = await klienServer();

  const { data: rab } = await sb
    .from("budget_items")
    .select("jumlah, harga_satuan")
    .eq("activity_id", activityId);
  const total = (rab ?? []).reduce(
    (j: number, b: { jumlah: number; harga_satuan: number }) => j + b.jumlah * b.harga_satuan,
    0,
  );

  const { error } = await sb.from("activity_reports").upsert(
    {
      activity_id: activityId,
      ringkasan: isi.ringkasan,
      hasil: isi.hasil,
      kendala: isi.kendala,
      rekomendasi: isi.rekomendasi,
      jumlah_hadir: isi.jumlahHadir,
      total_anggaran: total,
      disusun_oleh: pengguna.id,
    },
    { onConflict: "activity_id" },
  );
  if (error) return { galat: "Gagal menyimpan laporan: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "simpan_laporan",
    keterangan: "Isi laporan disimpan",
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}
