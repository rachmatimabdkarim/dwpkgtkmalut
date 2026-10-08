"use server";

import { revalidatePath } from "next/cache";
import { klienServer, penggunaSaatIni } from "@/lib/supabase-server";
import { klienAdmin } from "@/lib/supabase-admin";
import type { Peran } from "@/lib/kegiatan";
import { racikBeritaOtomatis } from "@/lib/publikasi";

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

  if (statusBaru === "laporan_disetujui") {
    const hasil = await racikBeritaOtomatis(activityId);
    await sb.from("activity_logs").insert({
      activity_id: activityId,
      aksi: "racik_berita_otomatis",
      keterangan: `Berita kegiatan dirakit otomatis (status: ${hasil.status})`,
      pelaku_id: pengguna.id,
      pelaku_nama: pengguna.nama,
    });
  }

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

const PERAN_INTI: Peran[] = [
  "super_admin",
  "ketua",
  "wakil_ketua",
  "sekretaris",
  "bendahara",
  "ketua_seksi",
];

/** Mengajukan usulan perubahan (tanggal, tempat, anggaran, lain) setelah kegiatan disetujui. */
export async function ajukanPerubahan(
  activityId: string,
  jenis: "tanggal" | "tempat" | "anggaran" | "lain",
  usulan: string,
  alasan: string,
) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const bolehMengajukan = pengguna.peran.some((p) => PERAN_INTI.includes(p as Peran));
  if (!bolehMengajukan) {
    return { galat: "Hanya pengurus inti yang berwenang mengajukan perubahan kegiatan." };
  }

  if (!usulan.trim()) return { galat: "Usulan perubahan wajib diisi." };
  if (!alasan.trim()) return { galat: "Alasan perubahan wajib diisi." };

  const sb = await klienServer();
  const { data: keg } = await sb
    .from("activities")
    .select("id, judul, status")
    .eq("id", activityId)
    .maybeSingle<{ id: string; judul: string; status: string }>();

  if (!keg) return { galat: "Kegiatan tidak ditemukan." };
  // Perubahan boleh diajukan setelah perencanaan disetujui, termasuk ketika
  // kegiatan sudah selesai laporan atau diarsipkan (untuk koreksi data).
  // Daftar ini HARUS sama dengan yang dipakai halaman detail kegiatan.
  const statusBolehPerubahan = [
    "disetujui",
    "berjalan",
    "selesai",
    "laporan_diajukan",
    "laporan_dalam_review",
    "laporan_disetujui",
    "arsip",
  ];
  if (!statusBolehPerubahan.includes(keg.status)) {
    return {
      galat: "Pengajuan perubahan hanya dapat dilakukan setelah tahap perencanaan kegiatan disetujui.",
    };
  }

  // Masukkan pengajuan perubahan ke basis data
  const { error: gagalCr } = await sb.from("change_requests").insert({
    activity_id: activityId,
    jenis,
    usulan: usulan.trim(),
    alasan: alasan.trim(),
    status: "diajukan",
    diajukan_oleh: pengguna.id,
  });

  if (gagalCr) return { galat: "Gagal menyimpan pengajuan perubahan: " + gagalCr.message };

  // Catat ke log kegiatan
  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "ajukan_perubahan",
    keterangan: `Pengajuan perubahan ${jenis}: "${usulan.trim().slice(0, 100)}" (alasan: ${alasan.trim().slice(0, 100)})`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  // Kirim notifikasi ke seluruh pengurus inti yang aktif (kecuali pengaju)
  try {
    const sbAdmin = klienAdmin();
    const hariIni = new Date().toISOString().slice(0, 10);
    const { data: semuaPeran } = await sbAdmin
      .from("user_roles")
      .select("user_id, peran, mulai, selesai");

    const targetUserIds = new Set<string>();
    for (const r of semuaPeran ?? []) {
      if (
        PERAN_INTI.includes(r.peran as Peran) &&
        (!r.mulai || r.mulai <= hariIni) &&
        (!r.selesai || r.selesai >= hariIni) &&
        r.user_id !== pengguna.id
      ) {
        targetUserIds.add(r.user_id);
      }
    }

    for (const uid of targetUserIds) {
      await sbAdmin.from("notifications").insert({
        user_id: uid,
        jenis: "perubahan_kegiatan",
        judul: `Pengajuan Perubahan: ${keg.judul}`,
        pesan: `${pengguna.nama} mengajukan perubahan ${jenis} untuk kegiatan "${keg.judul}".`,
        tautan: `/admin/kegiatan/${activityId}?tab=ringkasan`,
        activity_id: activityId,
        dibaca: false,
      });
    }
  } catch {
    // Abaikan galat notifikasi agar tidak menggagalkan pengajuan
  }

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

/** Memutuskan (menyetujui / menolak) usulan perubahan kegiatan. */
export async function putuskanPerubahan(
  activityId: string,
  changeRequestId: string,
  keputusan: "disetujui" | "ditolak",
  catatan?: string,
) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const bolehMemutuskan = pengguna.peran.some((p) => PERAN_INTI.includes(p as Peran));
  if (!bolehMemutuskan) {
    return { galat: "Hanya pengurus inti yang berwenang memutuskan perubahan kegiatan." };
  }

  if (keputusan === "ditolak" && !catatan?.trim()) {
    return { galat: "Catatan wajib diisi bila menolak usulan perubahan." };
  }

  const sb = await klienServer();
  const { data: cr } = await sb
    .from("change_requests")
    .select("id, activity_id, jenis, usulan, alasan, status, diajukan_oleh")
    .eq("id", changeRequestId)
    .eq("activity_id", activityId)
    .maybeSingle<{
      id: string;
      activity_id: string;
      jenis: "tanggal" | "tempat" | "anggaran" | "lain";
      usulan: string;
      alasan: string;
      status: string;
      diajukan_oleh: string | null;
    }>();

  if (!cr) return { galat: "Data pengajuan perubahan tidak ditemukan." };
  if (cr.status !== "diajukan" && cr.status !== "dalam_review") {
    return { galat: `Pengajuan ini sudah pernah diputuskan sebelumnya (${cr.status}).` };
  }

  const { data: keg } = await sb
    .from("activities")
    .select("id, judul")
    .eq("id", activityId)
    .maybeSingle<{ id: string; judul: string }>();

  // Perbarui status pengajuan perubahan
  const { error: gagalPutus } = await sb
    .from("change_requests")
    .update({
      status: keputusan,
      diputuskan_pada: new Date().toISOString(),
    })
    .eq("id", changeRequestId);

  if (gagalPutus) return { galat: "Gagal memperbarui status pengajuan: " + gagalPutus.message };

  // Bila disetujui, terapkan perubahan pada tabel target
  if (keputusan === "disetujui") {
    if (cr.jenis === "tanggal") {
      const bagian = cr.usulan.split(";").map((s) => s.trim());
      const mulai = bagian[0];
      const selesai = bagian[1] || mulai;
      if (mulai) {
        const { error: gagalTanggal } = await sb.rpc("terapkan_perubahan_kegiatan", {
          p_activity_id: activityId,
          p_jenis: "tanggal",
          p_usulan: `${mulai};${selesai}`,
        });
        if (gagalTanggal) {
          return { galat: "Gagal menerapkan perubahan tanggal: " + gagalTanggal.message };
        }
      }
    } else if (cr.jenis === "tempat") {
      // Lewat fungsi khusus agar tetap berlaku walau kegiatan sudah diarsipkan
      // (aturan pengaman biasa menolak pembaruan pada kegiatan yang terkunci).
      const { error: gagalTempat } = await sb.rpc("terapkan_perubahan_kegiatan", {
        p_activity_id: activityId,
        p_jenis: "tempat",
        p_usulan: cr.usulan,
      });
      if (gagalTempat) {
        return { galat: "Gagal menerapkan perubahan tempat: " + gagalTempat.message };
      }
    } else if (cr.jenis === "anggaran") {
      // Usulan anggaran: format uraian|jumlah|harga per baris
      const baris = cr.usulan.split("\n").map((b) => b.trim()).filter(Boolean);
      const { data: rabAda } = await sb
        .from("budget_items")
        .select("id, uraian, urutan")
        .eq("activity_id", activityId);

      let urutanMax = (rabAda ?? []).reduce((max, item) => Math.max(max, item.urutan || 0), 0);

      for (const line of baris) {
        const parts = line.split("|").map((p) => p.trim());
        if (parts.length >= 3) {
          const uraian = parts[0];
          const jumlah = parseFloat(parts[1]) || 1;
          const hargaSatuan = parseFloat(parts[2]) || 0;
          const satuan = parts[3] || null;

          const cocok = (rabAda ?? []).find(
            (r) => r.uraian.trim().toLowerCase() === uraian.toLowerCase(),
          );
          if (cocok) {
            await sb
              .from("budget_items")
              .update({
                jumlah,
                harga_satuan: hargaSatuan,
                ...(satuan ? { satuan } : {}),
              })
              .eq("id", cocok.id);
          } else {
            urutanMax += 1;
            await sb.from("budget_items").insert({
              activity_id: activityId,
              uraian,
              jumlah,
              harga_satuan: hargaSatuan,
              satuan,
              urutan: urutanMax,
            });
          }
        }
      }
    }
    // jenis='lain': dicatat tanpa mengubah data otomatis
  }

  // Catat ke riwayat kegiatan
  const teksCatatan = catatan?.trim() ? ` — catatan: ${catatan.trim()}` : "";
  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: `putusan_perubahan_${keputusan}`,
    keterangan: `${pengguna.nama} ${
      keputusan === "disetujui" ? "menyetujui" : "menolak"
    } pengajuan perubahan ${cr.jenis}${teksCatatan}`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  // Beritahu pemohon bila ada
  if (cr.diajukan_oleh) {
    try {
      const sbAdmin = klienAdmin();
      await sbAdmin.from("notifications").insert({
        user_id: cr.diajukan_oleh,
        jenis: "perubahan_kegiatan",
        judul: `Perubahan ${cr.jenis} ${keputusan === "disetujui" ? "Disetujui" : "Ditolak"}`,
        pesan: `Pengajuan perubahan ${cr.jenis} untuk kegiatan "${keg?.judul ?? ""}" telah ${
          keputusan === "disetujui" ? "disetujui" : "ditolak"
        }${teksCatatan}.`,
        tautan: `/admin/kegiatan/${activityId}?tab=ringkasan`,
        activity_id: activityId,
        dibaca: false,
      });
    } catch {
      // Abaikan
    }
  }

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

