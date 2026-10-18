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
  // ATURAN PEMILIK (lihat migrasi 0052):
  //   anggota biasa -> terkunci ke Ketua Bidang-nya
  //   ketua bidang  -> dirinya sendiri
  //   pengurus harian -> hanya sesama pengurus harian
  // Server menanyakan ALASAN penolakan, bukan sekadar boleh/tidak, supaya
  // pengguna membaca kalimat yang menjelaskan — bukan pesan teknis.
  if (masukan.penanggungJawab) {
    const { data: alasan } = await sb.rpc("alasan_penanggung_jawab", {
      orang: masukan.penanggungJawab,
    });
    if (typeof alasan === "string" && alasan.trim() !== "") {
      return { galat: alasan };
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

  // A. Kalau langsung diajukan (tidak disimpan sebagai draf), beritahu penyetuju
  //    yang gilirannya. Sebelumnya pemberitahuan hanya dipasang di fungsi
  //    "ajukan kegiatan", padahal form baru memakai fungsi INI — sehingga
  //    pengajuan lewat form baru tidak pernah mengirim pemberitahuan.
  if (masukan.ajukanSekarang) {
    await beritahuPenyetujuBerikut(data.id as string, "perencanaan");
  }

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

  // Saat kegiatan REVISI diajukan ulang, keputusan lama HARUS dibersihkan.
  // Tanpa ini, jenjang yang dulu sudah menyetujui dianggap masih sah padahal
  // datanya sudah berubah — persetujuan lama "menempel" pada data baru.
  // Pemilik memutuskan: wajib disetujui ulang oleh SELURUH jenjang dari awal.
  const diajukanUlang = keg.status === "revisi";
  if (diajukanUlang) {
    // Lewat fungsi berpemilik hak: tabel approvals TIDAK memberi izin DELETE,
    // sehingga penghapusan langsung dijawab sukses tanpa menghapus apa pun
    // (gagal senyap) — keputusan lama lalu menempel pada data yang sudah berubah.
    const { error: galatReset } = await sb.rpc("reset_persetujuan_kegiatan", {
      p_activity: activityId,
    });
    if (galatReset) return { galat: "Gagal mengosongkan persetujuan lama: " + galatReset.message };
  }

  const { error } = await sb
    .from("activities")
    .update({ status: "diajukan" })
    .eq("id", activityId);
  if (error) return { galat: "Gagal mengajukan: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "diajukan",
    keterangan: diajukanUlang
      ? "Perencanaan diajukan ULANG setelah revisi — persetujuan dimulai dari jenjang pertama"
      : "Perencanaan diajukan untuk persetujuan berjenjang",
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
/**
 * MENGUBAH kegiatan yang sudah ada (draf / revisi) — termasuk rincian anggaran.
 *
 * Dipakai form kegiatan yang sama dengan "kegiatan baru", supaya pengguna tidak
 * perlu mempelajari dua formulir berbeda dan RAB ikut bisa diperbaiki.
 *
 * Aturan (keputusan pemilik):
 *   - hanya pengusul atau super admin;
 *   - hanya saat draf atau revisi. Sesudah diajukan, perubahan WAJIB lewat
 *     revisi berjenjang dan disetujui ulang seluruh jenjang;
 *   - tanggal mulai & selesai wajib terisi, selesai tidak mendahului mulai;
 *   - judul & sasaran tidak boleh kosong.
 */
export async function ubahKegiatan(
  activityId: string,
  masukan: {
    judul: string;
    tujuan: string;
    sasaran: string;
    tanggalMulai: string;
    tanggalSelesai: string;
    tempat: string;
    ringkasan: string;
    anggaran?: { uraian: string; satuan: string; jumlah: number; hargaSatuan: number }[];
  },
) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };
  const sb = await klienServer();

  const { data: keg } = await sb
    .from("activities")
    .select("id, status, dibuat_oleh")
    .eq("id", activityId)
    .maybeSingle<{ id: string; status: string; dibuat_oleh: string }>();
  if (!keg) return { galat: "Kegiatan tidak ditemukan." };

  if (keg.dibuat_oleh !== pengguna.id && !pengguna.peran.includes("super_admin")) {
    return { galat: "Hanya pengusul kegiatan ini yang dapat mengubahnya." };
  }
  if (!["draf", "revisi"].includes(keg.status)) {
    return {
      galat:
        "Kegiatan ini sudah diajukan, jadi datanya tidak dapat diubah langsung. " +
        "Perubahan harus lewat revisi berjenjang: penyetuju memilih \"Minta Revisi\", " +
        "lalu kegiatan diajukan ulang dan disetujui ulang oleh seluruh jenjang.",
    };
  }

  const judul = masukan.judul.trim();
  const sasaran = masukan.sasaran.trim();
  const mulai = masukan.tanggalMulai.trim();
  const selesai = masukan.tanggalSelesai.trim();
  if (!judul) return { galat: "Nama kegiatan wajib diisi." };
  if (!sasaran) return { galat: "Sasaran peserta wajib diisi." };
  if (!mulai || !selesai) return { galat: "Tanggal mulai dan tanggal selesai wajib diisi." };
  if (selesai < mulai) {
    return { galat: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai." };
  }

  const { error } = await sb
    .from("activities")
    .update({
      judul,
      tujuan: masukan.tujuan.trim() || null,
      sasaran,
      tanggal_mulai: mulai,
      tanggal_selesai: selesai,
      tempat: masukan.tempat.trim() || null,
      ringkasan: masukan.ringkasan.trim() || null,
    })
    .eq("id", activityId);
  if (error) return { galat: "Gagal menyimpan: " + error.message };

  // RAB: ganti seluruh baris (paling sederhana & tidak menyisakan baris lama).
  if (masukan.anggaran) {
    await sb.from("budget_items").delete().eq("activity_id", activityId);
    const baris = masukan.anggaran
      .filter((b) => b.uraian.trim())
      .map((b) => ({
        activity_id: activityId,
        uraian: b.uraian.trim(),
        satuan: b.satuan.trim() || null,
        jumlah: Number(b.jumlah) || 0,
        harga_satuan: Number(b.hargaSatuan) || 0,
      }));
    if (baris.length > 0) {
      const { error: galatRab } = await sb.from("budget_items").insert(baris);
      if (galatRab) return { galat: "Gagal menyimpan anggaran: " + galatRab.message };
    }
  }

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "perbaikan_langsung",
    keterangan: "Pengusul mengubah data kegiatan dan rincian anggaran",
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath("/admin/kegiatan");
  revalidatePath(`/admin/kegiatan/${activityId}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function perbaikiKegiatan(
  activityId: string,
  perubahan: {
    judul?: string;
    tujuan?: string;
    sasaran?: string;
    tanggalMulai?: string;
    tanggalSelesai?: string;
    tempat?: string;
    ringkasan?: string;
  },
) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };

  const sb = await klienServer();
  const { data: keg } = await sb
    .from("activities")
    .select("id, judul, status, dibuat_oleh, tujuan, sasaran, tanggal_mulai, tanggal_selesai, tempat, ringkasan")
    .eq("id", activityId)
    .maybeSingle<{
      id: string; judul: string; status: string; dibuat_oleh: string;
      tujuan: string | null; sasaran: string | null;
      tanggal_mulai: string | null; tanggal_selesai: string | null;
      tempat: string | null; ringkasan: string | null;
    }>();
  if (!keg) return { galat: "Kegiatan tidak ditemukan." };

  const pengusul = keg.dibuat_oleh === pengguna.id;
  if (!pengusul && !pengguna.peran.includes("super_admin")) {
    return { galat: "Hanya pengusul kegiatan ini yang dapat memperbaikinya langsung." };
  }

  // Perbaikan langsung HANYA selama belum ada persetujuan yang berlaku.
  //
  // Sebelumnya pengusul bebas mengubah judul/tujuan/sasaran/tanggal/tempat
  // sepanjang status belum masuk tahap pelaporan — termasuk SETELAH jenjang
  // menyetujui. Akibatnya angka yang disetujui (mis. sasaran 30 orang) bisa
  // diubah diam-diam menjadi 20 tanpa sepengetahuan penyetuju, dan
  // persetujuannya menjadi tidak bermakna.
  //
  // Aturan sekarang: begitu kegiatan DIAJUKAN, satu-satunya jalan mengubah data
  // adalah lewat revisi berjenjang (penyetuju memilih "Minta Revisi"), lalu
  // diajukan ulang dan disetujui ulang oleh SELURUH jenjang dari awal.
  // "ditolak" SENGAJA tidak termasuk: penolakan berarti selesai. Kegiatan yang
  // ditolak tidak punya jalan diajukan kembali, jadi memperbaikinya sia-sia.
  // Bila ingin diperbaiki, penyetuju seharusnya memilih "Minta Revisi".
  const bolehDiubahLangsung = ["draf", "revisi"];
  if (!bolehDiubahLangsung.includes(keg.status)) {
    return {
      galat:
        keg.status === "ditolak"
          ? "Kegiatan ini sudah ditolak, jadi tidak dapat diperbaiki lagi. Bila ingin dijalankan, buat kegiatan baru dari awal."
          : "Kegiatan ini sudah diajukan, jadi datanya tidak dapat diubah langsung. " +
            "Perubahan harus lewat revisi berjenjang: penyetuju memilih \"Minta Revisi\", " +
            "lalu kegiatan diajukan ulang dan disetujui ulang oleh seluruh jenjang.",
    };
  }

  // Tanggal WAJIB terisi. Tanpa syarat ini, kiriman yang tanggalnya kosong
  // akan MENGOSONGKAN tanggal kegiatan yang sudah ada — kegiatan lalu hilang
  // dari Agenda publik dan laporannya menjadi tanpa tanggal pelaksanaan.
  const mulaiFinal = (perubahan.tanggalMulai ?? keg.tanggal_mulai ?? "").trim();
  const selesaiFinal = (perubahan.tanggalSelesai ?? keg.tanggal_selesai ?? "").trim();
  if (!mulaiFinal || !selesaiFinal) {
    return {
      galat: "Tanggal mulai dan tanggal selesai wajib diisi.",
    };
  }
  // Tanggal selesai tidak boleh lebih awal dari tanggal mulai — kalau tidak,
  // muncul data tidak logis seperti "selesai sebelum dimulai".
  if (selesaiFinal < mulaiFinal) {
    return {
      galat:
        "Tanggal selesai tidak boleh lebih awal dari tanggal mulai. Mohon diperiksa kembali.",
    };
  }
  // Sasaran adalah bahan keputusan penyetuju — jangan sampai bisa dikosongkan.
  if (perubahan.sasaran !== undefined && !perubahan.sasaran.trim()) {
    return { galat: "Sasaran peserta tidak boleh kosong." };
  }

  // Susun hanya kolom yang benar-benar berubah.
  const baru: Record<string, string | null> = {};
  const catatanPerubahan: string[] = [];

  if (perubahan.judul !== undefined && perubahan.judul.trim() !== keg.judul) {
    if (!perubahan.judul.trim()) return { galat: "Nama kegiatan tidak boleh kosong." };
    baru.judul = perubahan.judul.trim();
    catatanPerubahan.push(`nama: "${keg.judul}" → "${perubahan.judul.trim()}"`);
  }
  if (perubahan.tujuan !== undefined && perubahan.tujuan.trim() !== (keg.tujuan ?? "")) {
    baru.tujuan = perubahan.tujuan.trim() || null;
    catatanPerubahan.push("tujuan diperbarui");
  }
  if (perubahan.sasaran !== undefined && perubahan.sasaran.trim() !== (keg.sasaran ?? "")) {
    baru.sasaran = perubahan.sasaran.trim() || null;
    catatanPerubahan.push("sasaran peserta diperbarui");
  }
  if (perubahan.tanggalMulai !== undefined && perubahan.tanggalMulai !== (keg.tanggal_mulai ?? "")) {
    // Nilai kosong sudah ditolak di atas; simpan nilai bersih, bukan null.
    baru.tanggal_mulai = perubahan.tanggalMulai.trim();
    catatanPerubahan.push(`tanggal mulai: ${keg.tanggal_mulai ?? "—"} → ${perubahan.tanggalMulai.trim()}`);
  }
  if (perubahan.tanggalSelesai !== undefined && perubahan.tanggalSelesai !== (keg.tanggal_selesai ?? "")) {
    baru.tanggal_selesai = perubahan.tanggalSelesai.trim();
    catatanPerubahan.push(`tanggal selesai: ${keg.tanggal_selesai ?? "—"} → ${perubahan.tanggalSelesai.trim()}`);
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

  // Draf = belum pernah diajukan; Ditolak = sudah selesai dan tidak berguna lagi.
  // Keduanya boleh dihapus oleh pengusulnya. Kegiatan yang sedang berjalan atau
  // sudah disetujui tetap tersimpan sebagai catatan resmi organisasi.
  if (!["draf", "ditolak"].includes(keg.status)) {
    return {
      galat:
        "Hanya kegiatan berstatus draf atau ditolak yang dapat dihapus. Kegiatan yang sudah diajukan atau disetujui harus tetap tersimpan sebagai catatan resmi — pakai Sembunyikan dari publik bila tidak ingin ditampilkan.",
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
