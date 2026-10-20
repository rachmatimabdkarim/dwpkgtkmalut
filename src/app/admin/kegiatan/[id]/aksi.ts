"use server";

import { revalidatePath } from "next/cache";
import { klienServer, penggunaSaatIni } from "@/lib/supabase-server";
import type { Peran } from "@/lib/kegiatan";
import { racikBeritaOtomatis } from "@/lib/publikasi";
import { beritahuSetelahKeputusan, beritahuPenyetujuBerikut } from "@/lib/notifikasi";

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

  // Tahap yang otomatis dilewati (mis. Ketua Bidang saat pengusulnya sendiri
  // Ketua Bidang bidang itu) tidak boleh dianggap sebagai giliran yang menunggu
  // — kalau dianggap menunggu, kegiatan menggantung dan tidak ada yang bisa
  // menyetujui.
  const { data: dilewatiData } = await sb.rpc("tahap_dilewati_daftar", {
    p_activity: activityId,
    p_alur: tahap,
  });
  const urutanDilewati = new Set<number>(
    Array.isArray(dilewatiData) ? (dilewatiData as number[]) : [],
  );

  const berikut = langkah.find(
    (l) => !sudahSetuju.has(l.urutan) && !urutanDilewati.has(l.urutan),
  );
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
  if (error) {
    // Pengaman basis data: satu jenjang tidak boleh diputuskan dua kali.
    // Bisa terjadi bila dua orang menekan bersamaan — beri pesan yang jelas,
    // bukan pesan teknis tentang indeks unik.
    if (error.message.includes("idx_approvals_satu_per_jenjang") || error.code === "23505") {
      return { galat: "Jenjang ini sudah diputuskan orang lain tepat sebelum Anda. Muat ulang halaman untuk melihat hasilnya." };
    }
    return { galat: "Gagal menyimpan keputusan: " + error.message };
  }

  // tentukan status kegiatan berikutnya
  let statusBaru = keg.status;
  if (keputusan === "revisi") statusBaru = tahap === "perencanaan" ? "revisi" : "selesai";
  else if (keputusan === "tolak") statusBaru = "ditolak";
  else {
    // CACAT YANG DIPERBAIKI:
    // `sudahSetuju` hanya memuat keputusan yang tersimpan SEBELUM klik ini.
    // Keputusan yang baru saja diberikan belum ikut dihitung, sehingga jenjang
    // TERAKHIR (Ketua) tidak pernah membuat status menjadi "disetujui" —
    // kegiatan tertahan di "diajukan" walau semua jenjang sudah setuju, dan
    // tombol persetujuan tidak muncul lagi untuk siapa pun.
    //
    // Sekarang jenjang yang baru diputuskan ikut dihitung, dan tahap yang
    // dilewati otomatis tidak dianggap penghalang.
    const sudahSetujuTermasukIni = new Set(sudahSetuju);
    sudahSetujuTermasukIni.add(berikut.urutan);

    const semuaSetuju = langkah.every(
      (l) =>
        sudahSetujuTermasukIni.has(l.urutan) || urutanDilewati.has(l.urutan),
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

  // B & C. Setelah keputusan diberikan:
  //  - kalau masih ada tahap berikutnya -> beritahu penyetuju berikutnya
  //  - kalau sudah final -> beritahu pengusul (disetujui / revisi / ditolak)
  await beritahuSetelahKeputusan(
    activityId,
    keputusan as "setuju" | "revisi" | "tolak",
    tahap as "perencanaan" | "pelaporan",
  );

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
  isiLaporan?: { ringkasan: string; hasil: string; kendala: string; rekomendasi: string; jumlahHadir: number },
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
    .select("status, penanggung_jawab, tanggal_selesai")
    .eq("id", activityId)
    .maybeSingle<{
      status: string;
      penanggung_jawab: string | null;
      tanggal_selesai: string | null;
    }>();
  if (!keg) return { galat: "Kegiatan tidak ditemukan." };
  if (!aturan.dari.includes(keg.status)) {
    return { galat: "Tahap kegiatan saat ini belum memungkinkan langkah tersebut." };
  }

  // ATURAN PEMILIK: langkah pelaksanaan (mulai, selesai, ajukan laporan,
  // arsipkan) HANYA boleh dilakukan PENANGGUNG JAWAB kegiatan.
  // Sebelumnya tidak ada pemeriksaan sama sekali di sini — siapa pun yang
  // mengirim permintaan bisa mengubah tahap. Menyembunyikan tombol saja tidak
  // cukup. Super Admin tetap boleh sebagai cadangan bila penanggung jawab
  // berhalangan (sakit, mutasi, cuti).
  // ATURAN PEMILIK: KETUA PANITIA juga boleh menjalankan tahap pelaksanaan
  // (dia yang memimpin di lapangan). Penanggung jawab & Super Admin tetap.
  const { data: panitiaSaya } = await sb
    .from("committees")
    .select("peran")
    .eq("activity_id", activityId)
    .eq("profile_id", pengguna.id)
    .maybeSingle<{ peran: string }>();
  const ketuaPanitia = panitiaSaya?.peran === "ketua_panitia";

  const bolehLangkah =
    pengguna.id === keg.penanggung_jawab ||
    pengguna.peran.includes("super_admin") ||
    ketuaPanitia;
  if (!bolehLangkah) {
    return {
      galat:
        "Hanya penanggung jawab kegiatan yang dapat menjalankan langkah ini. " +
        "Bila penanggung jawab berhalangan, mintakan bantuan Super Admin.",
    };
  }

  // ATURAN PEMILIK: kegiatan tidak boleh ditandai selesai sebelum ada bukti
  // pelaksanaan — panitia, daftar hadir peserta, dan foto dokumentasi.
  // Tanpa pemeriksaan ini, kegiatan bisa "selesai" lalu dilaporkan tanpa data
  // apa pun, dan laporan pertanggungjawabannya menjadi kosong.
  // Diperiksa di server, bukan hanya dengan mematikan tombol.
  if (aksi === "selesai") {
    // ATURAN PEMILIK: tidak boleh ditandai selesai sebelum tanggal pelaksanaan
    // berakhir. Tanpa ini, kegiatan bisa "selesai" padahal jadwalnya belum usai
    // dan seluruh isinya langsung terkunci.
    if (keg.tanggal_selesai) {
      const hariIni = new Date();
      hariIni.setHours(0, 0, 0, 0);
      const batas = new Date(`${keg.tanggal_selesai}T00:00:00`);
      if (batas.getTime() > hariIni.getTime()) {
        const tgl = batas.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        return {
          galat:
            `Kegiatan belum dapat ditandai selesai karena tanggal pelaksanaannya ` +
            `berakhir pada ${tgl}. Tunggu sampai tanggal itu terlewati.`,
        };
      }
    }

    const [{ count: jumlahKetuaPanitia }, { count: jumlahHadir }, { count: jumlahFoto }, { data: daftarTugas }] =
      await Promise.all([
        sb
          .from("committees")
          .select("id", { count: "exact", head: true })
          .eq("activity_id", activityId)
          .eq("peran", "ketua_panitia"),
        // HANYA kehadiran yang sudah SAH. Peserta yang masih "Menunggu"
        // konfirmasi petugas belum dianggap hadir (aturan presensi QR).
        sb
          .from("attendances")
          .select("id", { count: "exact", head: true })
          .eq("activity_id", activityId)
          .neq("keterangan", "Menunggu"),
        sb.from("attachments")
          .select("id", { count: "exact", head: true })
          .eq("entitas_id", activityId)
          .eq("kategori", "foto_kegiatan"),
        // ATURAN PEMILIK: semua tugas panitia harus sudah dicentang selesai.
        sb.from("tasks").select("id, selesai").eq("activity_id", activityId),
      ]);

    const tugas = (daftarTugas ?? []) as { id: string; selesai: boolean }[];
    const tugasBelum = tugas.filter((t) => !t.selesai).length;

    const kurang: string[] = [];
    if (!jumlahKetuaPanitia) kurang.push("Ketua Panitia");
    if (!jumlahHadir) kurang.push("daftar hadir peserta yang sudah dikonfirmasi");
    if (!jumlahFoto) kurang.push("foto dokumentasi");
    if (tugasBelum > 0) kurang.push(`${tugasBelum} tugas panitia yang belum dicentang`);

    if (kurang.length > 0) {
      return {
        galat:
          "Kegiatan belum dapat ditandai selesai. Lengkapi dulu: " +
          kurang.join(", ") +
          ". Data ini diperlukan sebagai bukti pelaksanaan pada laporan.",
      };
    }
  }

  // Kunci & arsip lewat fungsi database berpemilik hak: kebijakan UPDATE tabel
  // activities tidak mengenali pengusul, sehingga pembaruan langsung tidak
  // mengenai baris mana pun dan layar tidak menampilkan sebabnya. Fungsi ini
  // memeriksa sendiri pemilik catatan dan status laporannya.
  if (aksi === "arsipkan") {
    const { error: galatArsip } = await sb.rpc("arsipkan_kegiatan", { p_activity: activityId });
    if (galatArsip) return { galat: galatArsip.message };
  } else {
    // PENGAMAN: permintaan ubah status WAJIB dibarengi pemeriksaan hasil.
    // Tanpa ".select()", Supabase TIDAK mengembalikan galat ketika kebijakan
    // keamanan menolak perubahan — baris tidak tersentuh, galat kosong, dan
    // aplikasi menganggap berhasil. Itu sebabnya "Tandai Selesai" tidak bereaksi
    // meski riwayatnya tercatat.
    const { data: terubah, error } = await sb
      .from("activities")
      .update({ status: aturan.ke })
      .eq("id", activityId)
      .select("id");
    if (error) return { galat: error.message };
    if (!terubah || terubah.length === 0) {
      return {
        galat:
          "Status kegiatan tidak berubah. Anda tidak memiliki hak untuk mengubah kegiatan ini, atau statusnya sudah berbeda.",
      };
    }
  }

  // WAJIB: simpan isian laporan LEBIH DULU, baru ubah status. Tanpa ini,
  // laporan yang diajukan tidak berisi apa pun (tabel activity_reports kosong)
  // meski status dan riwayatnya terlihat benar.
  if (aksi === "ajukan_laporan" && isiLaporan) {
    const { data: rab } = await sb
      .from("budget_items")
      .select("jumlah, harga_satuan")
      .eq("activity_id", activityId);
    const total = (rab ?? []).reduce(
      (j: number, b: { jumlah: number; harga_satuan: number }) => j + b.jumlah * b.harga_satuan,
      0,
    );
    const { error: galatLaporan } = await sb.from("activity_reports").upsert(
      {
        activity_id: activityId,
        ringkasan: isiLaporan.ringkasan,
        hasil: isiLaporan.hasil,
        kendala: isiLaporan.kendala,
        rekomendasi: isiLaporan.rekomendasi,
        jumlah_hadir: isiLaporan.jumlahHadir,
        total_anggaran: total,
        disusun_oleh: pengguna.id,
      },
      { onConflict: "activity_id" },
    );
    if (galatLaporan) return { galat: "Gagal menyimpan isian laporan: " + galatLaporan.message };
  }

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi,
    keterangan: aturan.label,
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  // Saat laporan diajukan, beritahu penyetuju pertama untuk LAPORAN — yaitu
  // Bendahara (urutan laporan berbeda dari urutan kegiatan).
  if (aksi === "ajukan_laporan") {
    await beritahuPenyetujuBerikut(activityId, "pelaporan");
  }

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

  // Isi laporan hanya boleh diubah SEBELUM diajukan. Sesudah diajukan, penyetuju
  // sedang menilai — kalau isinya bisa berubah di tengah penilaian, keputusan
  // penyetuju menjadi tidak sah. Menyembunyikan tombol saja tidak cukup.
  const { data: kegStatus } = await sb
    .from("activities")
    .select("status")
    .eq("id", activityId)
    .maybeSingle<{ status: string }>();
  if (!kegStatus) return { galat: "Kegiatan tidak ditemukan." };
  if (kegStatus.status !== "selesai") {
    return {
      galat:
        "Laporan sudah diajukan, jadi isinya tidak dapat diubah lagi. " +
        "Bila perlu diperbaiki, minta penyetuju mengembalikan laporan.",
    };
  }

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




