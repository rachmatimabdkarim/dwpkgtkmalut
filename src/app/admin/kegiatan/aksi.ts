"use server";

import { revalidatePath } from "next/cache";
import { klienServer } from "@/lib/supabase-server";
import { penggunaSaatIni } from "@/lib/supabase-server";
import { beritahuPenyetujuBerikut } from "@/lib/notifikasi";

/** Membuat kegiatan baru beserta rincian perencanaannya. */
export async function buatKegiatan(masukan: {
  judul: string;
  tujuan: string;
  sasaran: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  tempat: string;
  penanggungJawab: string;
  sectionId: string;
  /** Nama bidang yang dipilih/dikunci — dipakai memeriksa hak pengguna. */
  namaBidang?: string;
  ringkasan: string;
  ajukanSekarang: boolean;
  anggaran?: { uraian: string; satuan: string; jumlah: number; hargaSatuan: number }[];
}) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir. Silakan masuk kembali." };

  if (!masukan.judul.trim()) return { galat: "Nama kegiatan wajib diisi." };

  const sb = await klienServer();

  // ---- Pengaman bidang pelaksana ----
  // Pengguna yang terikat satu bidang (Ketua Bidang / anggota) hanya boleh
  // mengajukan untuk bidangnya sendiri. Pengurus Harian dan Super Admin bebas.
  const { data: bolehBidang } = await sb.rpc("boleh_bidang", {
    nama_bidang: masukan.namaBidang ?? "",
  });
  if (bolehBidang === false) {
    return {
      galat: "Bidang pelaksana harus sesuai bidang Anda. Bidang tidak dapat dipilih bebas.",
    };
  }

  // ---- Pengaman penanggung jawab ----
  // Hanya diri sendiri atau anggota bidang yang sama.
  if (masukan.penanggungJawab) {
    const { data: bolehPj } = await sb.rpc("boleh_penanggung_jawab", {
      orang: masukan.penanggungJawab,
    });
    if (bolehPj === false) {
      return {
        galat: "Penanggung jawab harus diri sendiri atau anggota bidang Anda.",
      };
    }
  }

  // nomor kegiatan
  const { data: nomor } = await sb.rpc("nomor_kegiatan");
  const { data: periode } = await sb
    .from("periods")
    .select("id")
    .eq("aktif", true)
    .maybeSingle<{ id: string }>();

  const status = masukan.ajukanSekarang ? "diajukan" : "draf";

  const { data, error } = await sb
    .from("activities")
    .insert({
      kode: nomor as string,
      judul: masukan.judul.trim(),
      ringkasan: masukan.ringkasan.trim() || masukan.tujuan.trim().slice(0, 200),
      tujuan: masukan.tujuan.trim(),
      sasaran: masukan.sasaran.trim(),
      tanggal_mulai: masukan.tanggalMulai || null,
      tanggal_selesai: masukan.tanggalSelesai || masukan.tanggalMulai || null,
      tempat: masukan.tempat.trim(),
      section_id: masukan.sectionId || null,
      penanggung_jawab: masukan.penanggungJawab || pengguna.id,
      status,
      periode_id: periode?.id ?? null,
      dibuat_oleh: pengguna.id,
    })
    .select("id, kode")
    .single();

  if (error) return { galat: "Gagal menyimpan: " + error.message };

  // simpan rincian anggaran (RAB) bila ada
  if (masukan.anggaran && masukan.anggaran.length > 0) {
    const baris = masukan.anggaran
      .filter((b) => b.uraian.trim())
      .map((b, i) => ({
        activity_id: data.id,
        uraian: b.uraian.trim(),
        satuan: b.satuan.trim(),
        jumlah: b.jumlah,
        harga_satuan: b.hargaSatuan,
        urutan: i + 1,
      }));
    if (baris.length > 0) await sb.from("budget_items").insert(baris);
  }

  await sb.from("activity_logs").insert({
    activity_id: data.id,
    aksi: masukan.ajukanSekarang ? "diajukan" : "dibuat",
    keterangan: masukan.ajukanSekarang ? "Perencanaan diajukan untuk persetujuan" : "Draf dibuat",
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath("/admin/kegiatan");
  revalidatePath("/admin");
  return { ok: true, id: data.id as string, kode: data.kode as string };
}

/** Mengajukan draft yang sudah ada untuk mulai direview. */
export async function ajukanKegiatan(activityId: string) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };
  const sb = await klienServer();

  const { data: keg } = await sb
    .from("activities")
    .select("id, status, dibuat_oleh, judul")
    .eq("id", activityId)
    .maybeSingle<{ id: string; status: string; dibuat_oleh: string; judul: string }>();
  if (!keg) return { galat: "Kegiatan tidak ditemukan." };
  if (!["draf", "revisi"].includes(keg.status)) {
    return { galat: "Kegiatan ini sudah diajukan atau sedang diproses." };
  }

  const { error } = await sb
    .from("activities")
    .update({ status: "diajukan" })
    .eq("id", activityId);
  if (error) return { galat: "Gagal mengajukan: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "diajukan",
    keterangan: "Perencanaan diajukan untuk persetujuan berjenjang",
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  // A. Beritahu penyetuju yang gilirannya, supaya mereka langsung tahu tanpa
  //    perlu membuka beranda panel lebih dulu.
  await beritahuPenyetujuBerikut(activityId, "perencanaan");

  revalidatePath("/admin/kegiatan");
  revalidatePath(`/admin/kegiatan/${activityId}`);
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Pengusul memperbaiki data kegiatan secara langsung.
 *
 * Aturan: hanya PENGUSUL (atau Super Admin), hanya selama kegiatan belum
 * diarsipkan dan laporannya belum diajukan. Sesudah itu perbaikan harus lewat
 * "Ajukan Perubahan" supaya keputusan penyetuju tidak dilangkahi.
 *
 * Setiap perbaikan dicatat di riwayat, supaya jejaknya tetap jelas.
 */
export async function perbaikiKegiatan(
  activityId: string,
  perubahan: { tanggalMulai?: string; tanggalSelesai?: string; tempat?: string; ringkasan?: string },
) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const sb = await klienServer();
  const { data: keg } = await sb
    .from("activities")
    .select("id, judul, status, dibuat_oleh, tanggal_mulai, tempat, ringkasan")
    .eq("id", activityId)
    .maybeSingle<{
      id: string; judul: string; status: string; dibuat_oleh: string;
      tanggal_mulai: string | null; tempat: string | null; ringkasan: string | null;
    }>();
  if (!keg) return { galat: "Kegiatan tidak ditemukan." };

  const pengusul = keg.dibuat_oleh === pengguna.id;
  if (!pengusul && !pengguna.peran.includes("super_admin")) {
    return { galat: "Hanya pengusul kegiatan ini yang dapat memperbaikinya langsung." };
  }

  // Sesudah laporan diajukan atau kegiatan diarsipkan, perbaikan harus lewat
  // pengajuan perubahan resmi.
  const statusTerkunci = [
    "laporan_diajukan",
    "laporan_dalam_review",
    "laporan_disetujui",
    "arsip",
  ];
  if (statusTerkunci.includes(keg.status)) {
    return {
      galat:
        "Laporannya sudah diajukan, jadi data kegiatan tidak dapat diubah langsung. Silakan ajukan perubahan resmi.",
    };
  }

  // Susun hanya kolom yang benar-benar berubah.
  const baru: Record<string, string | null> = {};
  const catatanPerubahan: string[] = [];
  if (perubahan.tanggalMulai && perubahan.tanggalMulai !== keg.tanggal_mulai) {
    baru.tanggal_mulai = perubahan.tanggalMulai;
    catatanPerubahan.push(`tanggal: ${keg.tanggal_mulai ?? "—"} → ${perubahan.tanggalMulai}`);
  }
  if (perubahan.tempat !== undefined && perubahan.tempat.trim() !== (keg.tempat ?? "")) {
    baru.tempat = perubahan.tempat.trim() || null;
    catatanPerubahan.push(`tempat: ${keg.tempat ?? "—"} → ${perubahan.tempat.trim() || "—"}`);
  }
  if (perubahan.ringkasan !== undefined && perubahan.ringkasan.trim() !== (keg.ringkasan ?? "")) {
    baru.ringkasan = perubahan.ringkasan.trim() || null;
    catatanPerubahan.push("ringkasan untuk publik diperbarui");
  }

  if (catatanPerubahan.length === 0) {
    return { galat: "Tidak ada yang berubah, jadi tidak ada yang disimpan." };
  }

  const { error } = await sb.from("activities").update(baru).eq("id", activityId);
  if (error) return { galat: "Gagal menyimpan perbaikan: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "perbaikan_langsung",
    keterangan: `Pengusul memperbaiki data kegiatan — ${catatanPerubahan.join("; ")}`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath("/admin/kegiatan");
  revalidatePath(`/admin/kegiatan/${activityId}`);
  revalidatePath("/agenda");
  return { ok: true };
}

/**
 * Menarik kembali ajuan kegiatan supaya bisa diperbaiki pengusul.
 * Hanya boleh oleh pengusul sendiri (atau Super Admin), dan hanya selama
 * belum ada satu pun persetujuan — kalau sudah ada yang menyetujui, kegiatannya
 * harus direvisi lewat mekanisme persetujuan, bukan ditarik diam-diam.
 */
export async function batalkanAjuan(activityId: string, alasan: string) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  if (!alasan.trim()) {
    return { galat: "Alasan wajib diisi supaya jejaknya jelas." };
  }

  const sb = await klienServer();
  const { data: keg } = await sb
    .from("activities")
    .select("id, status, dibuat_oleh, judul")
    .eq("id", activityId)
    .maybeSingle<{ id: string; status: string; dibuat_oleh: string; judul: string }>();
  if (!keg) return { galat: "Kegiatan tidak ditemukan." };

  if (keg.status !== "diajukan") {
    return {
      galat:
        "Hanya kegiatan yang sedang diajukan dapat ditarik kembali. Kegiatan ini berstatus lain.",
    };
  }

  const superAdmin = pengguna.peran.includes("super_admin");
  if (keg.dibuat_oleh !== pengguna.id && !superAdmin) {
    return { galat: "Hanya pengusul kegiatan ini yang dapat menarik ajuannya." };
  }

  // Jangan tarik kalau sudah ada persetujuan — supaya tidak menghapus keputusan
  // orang lain secara diam-diam.
  const { data: sudah } = await sb
    .from("approvals")
    .select("id")
    .eq("activity_id", activityId)
    .limit(1);
  if ((sudah ?? []).length > 0) {
    return {
      galat:
        "Kegiatan ini sudah ada yang menyetujui, jadi tidak dapat ditarik kembali. Ajukan permintaan revisi kepada penyetuju berikutnya.",
    };
  }

  const { error } = await sb.from("activities").update({ status: "draf" }).eq("id", activityId);
  if (error) return { galat: "Gagal menarik ajuan: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "ajuan_dibatalkan",
    keterangan: `Ajuan ditarik kembali oleh pengusul. Alasan: ${alasan.trim()}`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath("/admin/kegiatan");
  revalidatePath(`/admin/kegiatan/${activityId}`);
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Menghapus kegiatan.
 *
 * Aturan ketat (pilihan pemilik proyek): HANYA kegiatan berstatus draf yang
 * dapat dihapus, dan hanya oleh pengusulnya sendiri atau Super Admin.
 * Kegiatan yang sudah diajukan/disetujui tidak dapat dihapus — bukti
 * pertanggungjawaban organisasi harus tetap utuh. Untuk kegiatan yang sudah
 * berjalan, gunakan "Sembunyikan dari publik".
 *
 * Nama kegiatan wajib diketik ulang sebagai pengaman salah hapus.
 */
export async function hapusKegiatan(activityId: string, namaKonfirmasi: string) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const sb = await klienServer();
  const { data: keg } = await sb
    .from("activities")
    .select("id, status, dibuat_oleh, judul")
    .eq("id", activityId)
    .maybeSingle<{ id: string; status: string; dibuat_oleh: string; judul: string }>();
  if (!keg) return { galat: "Kegiatan tidak ditemukan." };

  if (keg.status !== "draf") {
    return {
      galat:
        "Hanya kegiatan berstatus draf yang dapat dihapus. Kegiatan yang sudah diajukan atau disetujui harus tetap tersimpan sebagai catatan resmi — pakai Sembunyikan dari publik bila tidak ingin ditampilkan.",
    };
  }

  const superAdmin = pengguna.peran.includes("super_admin");
  if (keg.dibuat_oleh !== pengguna.id && !superAdmin) {
    return { galat: "Hanya pengusul kegiatan ini yang dapat menghapusnya." };
  }

  // Pengaman salah hapus: nama kegiatan harus diketik sama persis.
  if (namaKonfirmasi.trim() !== keg.judul.trim()) {
    return { galat: "Nama kegiatan yang diketik belum sama persis. Penghapusan dibatalkan." };
  }

  // Catat lebih dahulu, supaya jejak penghapusan tetap ada walau kegiatannya hilang.
  await sb.from("audit_logs").insert({
    jenis: "kegiatan",
    aksi: "hapus_kegiatan",
    keterangan: `Menghapus kegiatan draf "${keg.judul}"`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  // Bersihkan data turutannya lebih dulu (kalau tidak, penghapusan ditolak
  // karena masih ada rujukan).
  await sb.from("budget_items").delete().eq("activity_id", activityId);
  await sb.from("attachments").delete().eq("entitas_id", activityId);
  await sb.from("approvals").delete().eq("activity_id", activityId);
  await sb.from("notifications").delete().eq("activity_id", activityId);

  // Riwayat kegiatan bersifat tambah-saja, jadi kegiatannya saja yang dihapus.
  const { error } = await sb.from("activities").delete().eq("id", activityId);
  if (error) return { galat: "Gagal menghapus kegiatan: " + error.message };

  revalidatePath("/admin/kegiatan");
  revalidatePath("/admin");
  return { ok: true };
}

/** Menyembunyikan/menampilkan kegiatan di web publik. */
export async function aturSembunyi(activityId: string, sembunyi: boolean) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };
  const sb = await klienServer();
  const { error } = await sb.from("activities").update({ is_hidden: sembunyi }).eq("id", activityId);
  if (error) return { galat: error.message };
  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: sembunyi ? "disembunyikan" : "ditampilkan",
    keterangan: sembunyi ? "Disembunyikan dari publik" : "Ditampilkan kembali ke publik",
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });
  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

/** Menyimpan satu baris RAB. */
/** Status saat RAB masih bebas diubah — yaitu selama perencanaan belum disetujui. */
const STATUS_RAB_TERBUKA = ["draf", "revisi"];

/**
 * Memastikan RAB masih boleh diubah.
 *
 * Sesudah kegiatan disetujui, angka anggaran sudah menjadi bagian dari
 * persetujuan berjenjang. Kalau bisa diubah diam-diam, keputusan Bendahara dan
 * penyetuju lain jadi tidak bermakna. Karena itu RAB dikunci dan perubahannya
 * harus lewat "Ajukan Perubahan".
 */
async function periksaRabTerbuka(
  sb: Awaited<ReturnType<typeof klienServer>>,
  activityId: string,
) {
  const { data: keg } = await sb
    .from("activities")
    .select("status, judul")
    .eq("id", activityId)
    .maybeSingle<{ status: string; judul: string }>();
  if (!keg) return { galat: "Kegiatan tidak ditemukan." };
  if (!STATUS_RAB_TERBUKA.includes(keg.status)) {
    return {
      galat:
        "Anggaran kegiatan ini sudah dikunci karena kegiatannya sudah disetujui. Untuk mengubahnya, gunakan Ajukan Perubahan supaya disetujui ulang.",
    };
  }
  return { ok: true as const };
}

export async function simpanRab(activityId: string, baris: {
  id?: string; uraian: string; satuan: string; jumlah: number; hargaSatuan: number;
}) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };
  if (!baris.uraian.trim()) return { galat: "Uraian wajib diisi." };

  const sb = await klienServer();

  // RAB hanya boleh diubah selama perencanaan belum disetujui.
  const izin = await periksaRabTerbuka(sb, activityId);
  if ("galat" in izin) return { galat: izin.galat };

  const isi = {
    activity_id: activityId,
    uraian: baris.uraian.trim(),
    satuan: baris.satuan.trim(),
    jumlah: baris.jumlah,
    harga_satuan: baris.hargaSatuan,
  };
  const hasil = baris.id
    ? await sb.from("budget_items").update(isi).eq("id", baris.id)
    : await sb.from("budget_items").insert(isi);
  if (hasil.error) return { galat: hasil.error.message };

  // Catat jejaknya: siapa mengubah apa, dan berapa nilainya.
  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: baris.id ? "ubah_anggaran" : "tambah_anggaran",
    keterangan: `${baris.id ? "Mengubah" : "Menambah"} rincian anggaran "${baris.uraian.trim()}" — ${baris.jumlah} × Rp${baris.hargaSatuan.toLocaleString("id-ID")}`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

export async function hapusRab(activityId: string, id: string) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const sb = await klienServer();

  // Sebelumnya fungsi ini TIDAK memeriksa apa pun — siapa saja yang sudah masuk
  // dapat menghapus baris anggaran kegiatan apa pun. Sekarang diperketat.
  const izin = await periksaRabTerbuka(sb, activityId);
  if ("galat" in izin) return { galat: izin.galat };

  // Ambil dulu keterangannya untuk jejak, sebelum barisnya hilang.
  const { data: baris } = await sb
    .from("budget_items")
    .select("uraian, jumlah, harga_satuan")
    .eq("id", id)
    .maybeSingle<{ uraian: string; jumlah: number; harga_satuan: number }>();

  const { error } = await sb.from("budget_items").delete().eq("id", id);
  if (error) return { galat: error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "hapus_anggaran",
    keterangan: `Menghapus rincian anggaran "${baris?.uraian ?? id}"`,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}
