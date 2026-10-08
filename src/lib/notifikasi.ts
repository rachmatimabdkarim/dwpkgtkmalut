import { klienAdmin } from "@/lib/supabase-admin";
import type { Peran } from "@/lib/kegiatan";

export type TindakanItem = {
  id: string;
  judul: string;
  tahap: string;
  keterangan: string;
  statusLencana: string;
  nada: "warn" | "brand" | "ok" | "netral" | "bad";
  aksi: string;
  tautan: string;
  activityId?: string;
  postId?: string;
};

/**
 * Mengembalikan daftar kegiatan atau berita yang menunggu keputusan pengguna tersebut
 * (peran pada jenjang berikutnya, atau lewat pelimpahan wewenang/delegasi yang masih berlaku).
 * Sesuai aturan: pengusul TIDAK boleh menyetujui usulannya sendiri.
 */
export async function perluTindakanUntuk(userId: string): Promise<TindakanItem[]> {
  const sb = klienAdmin();
  const hariIni = new Date().toISOString().slice(0, 10);
  const hasil: TindakanItem[] = [];

  // 1. Ambil peran aktif pengguna
  const { data: peranBaris } = await sb
    .from("user_roles")
    .select("peran, mulai, selesai")
    .eq("user_id", userId);

  const peranSaya = (peranBaris ?? [])
    .filter((p) => (!p.mulai || p.mulai <= hariIni) && (!p.selesai || p.selesai >= hariIni))
    .map((p) => p.peran as Peran);

  // 2. Ambil kegiatan yang sedang dalam proses persetujuan
  const { data: kegMenunggu } = await sb
    .from("activities")
    .select("id, judul, status, dibuat_oleh")
    .in("status", ["diajukan", "dalam_review", "laporan_diajukan", "laporan_dalam_review"]);

  if (kegMenunggu && kegMenunggu.length > 0) {
    const { data: flows } = await sb
      .from("approval_flows")
      .select("id, nama, approval_steps(urutan, peran)");

    const kegIds = kegMenunggu.map((k) => k.id);
    const { data: approvalsData } = await sb
      .from("approvals")
      .select("activity_id, tahap, step_urutan, peran, keputusan")
      .in("activity_id", kegIds);

    const { data: delegationsData } = await sb
      .from("delegations")
      .select("dari_peran, ke_peran")
      .lte("mulai", hariIni)
      .gte("selesai", hariIni);

    const delegations = delegationsData ?? [];

    for (const keg of kegMenunggu) {
      // Pengusul TIDAK boleh menyetujui usulannya sendiri
      if (keg.dibuat_oleh === userId) continue;

      const namaTahap = ["diajukan", "dalam_review"].includes(keg.status)
        ? "perencanaan"
        : "pelaporan";

      const flow = (flows ?? []).find((f: { nama: string }) => f.nama === namaTahap);
      if (!flow) continue;

      const steps = ((flow.approval_steps ?? []) as { urutan: number; peran: string }[])
        .slice()
        .sort((a, b) => a.urutan - b.urutan);

      const approvedSteps = new Set(
        (approvalsData ?? [])
          .filter(
            (a: { activity_id: string; tahap: string; keputusan: string }) =>
              a.activity_id === keg.id && a.tahap === namaTahap && a.keputusan === "setuju",
          )
          .map((a: { step_urutan: number }) => a.step_urutan),
      );

      const berikut = steps.find((s) => !approvedSteps.has(s.urutan));
      if (!berikut) continue;

      const bolehDelegasi = delegations.some(
        (d: { dari_peran: string; ke_peran: string }) =>
          d.dari_peran === berikut.peran && peranSaya.includes(d.ke_peran as Peran),
      );

      const bolehMenilai =
        peranSaya.includes("super_admin") ||
        peranSaya.includes(berikut.peran as Peran) ||
        bolehDelegasi;

      if (bolehMenilai) {
        hasil.push({
          id: `keg-${keg.id}`,
          activityId: keg.id,
          judul: keg.judul,
          tahap: namaTahap === "perencanaan" ? "Perencanaan" : "Pelaporan",
          keterangan: `Menunggu persetujuan Anda (${berikut.peran.replace(/_/g, " ")})`,
          statusLencana: "Menunggu",
          nada: "warn",
          aksi: "Tinjau",
          tautan: `/admin/kegiatan/${keg.id}`,
        });
      }
    }
  }

  // 3. Berita di antrean (bila pengguna berperan editor atau super_admin)
  const apakahEditor = peranSaya.some((p) => ["editor", "super_admin"].includes(p));
  if (apakahEditor) {
    const { data: posAntrean } = await sb
      .from("posts")
      .select("id, judul, status")
      .eq("sumber", "otomatis")
      .or("status.eq.antrean,perlu_tinjauan.eq.true")
      .order("dibuat_pada", { ascending: false })
      .limit(5);

    for (const pos of posAntrean ?? []) {
      hasil.push({
        id: `pos-${pos.id}`,
        postId: pos.id,
        judul: pos.judul,
        tahap: "Konten",
        keterangan: "Menunggu tinjauan Editor sebelum terbit",
        statusLencana: "Antrean",
        nada: "brand",
        aksi: "Tinjau",
        tautan: "/admin/konten?tab=antrean",
      });
    }
  }

  return hasil;
}

/**
 * Menghitung umur penantian kegiatan dalam hari sejak diajukan (perencanaan)
 * atau sejak laporan diajukan (pelaporan).
 */
export async function hariMenunggu(activityId: string): Promise<number> {
  const sb = klienAdmin();
  const { data: keg } = await sb
    .from("activities")
    .select("id, status, dibuat_pada, diperbarui_pada")
    .eq("id", activityId)
    .maybeSingle<{
      id: string;
      status: string;
      dibuat_pada: string;
      diperbarui_pada: string;
    }>();

  if (!keg) return 0;

  const apakahPelaporan = ["laporan_diajukan", "laporan_dalam_review"].includes(keg.status);
  const aksiTarget = apakahPelaporan ? ["ajukan_laporan"] : ["diajukan", "ajukan"];

  const { data: logs } = await sb
    .from("activity_logs")
    .select("waktu")
    .eq("activity_id", activityId)
    .in("aksi", aksiTarget)
    .order("waktu", { ascending: false })
    .limit(1);

  const waktuAwalStr = logs?.[0]?.waktu ?? (apakahPelaporan ? keg.diperbarui_pada : keg.dibuat_pada);
  if (!waktuAwalStr) return 0;

  const waktuAwal = new Date(waktuAwalStr).getTime();
  const selisihMs = Date.now() - waktuAwal;
  const selisihHari = Math.floor(selisihMs / (1000 * 60 * 60 * 24));
  return Math.max(0, selisihHari);
}

/**
 * Memeriksa seluruh kegiatan yang menunggu persetujuan/laporan.
 * Bila umur penantian melebihi batas_hari_review, buat notifikasi untuk orang yang berhak.
 * Tidak membuat notifikasi ganda: diperiksa apakah sudah ada notifikasi sejenis
 * untuk activity_id dan user_id yang sama dalam 1 hari terakhir.
 */
export async function periksaDanBuatNotifikasi(): Promise<{
  dibuat: number;
  totalDiperiksa: number;
}> {
  const sb = klienAdmin();
  const hariIni = new Date().toISOString().slice(0, 10);
  const satuHariLalu = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // 1. Ambil batas hari review dari app_settings
  const { data: settingRow } = await sb
    .from("app_settings")
    .select("nilai")
    .eq("kunci", "batas_hari_review")
    .maybeSingle();

  const batas = (settingRow?.nilai as { persetujuan?: number; laporan?: number }) ?? {
    persetujuan: 3,
    laporan: 7,
  };
  const batasPersetujuan = Number(batas.persetujuan ?? 3);
  const batasLaporan = Number(batas.laporan ?? 7);

  // 2. Ambil kegiatan yang menunggu persetujuan
  const { data: kegMenunggu } = await sb
    .from("activities")
    .select("id, judul, status, dibuat_oleh")
    .in("status", ["diajukan", "dalam_review", "laporan_diajukan", "laporan_dalam_review"]);

  if (!kegMenunggu || kegMenunggu.length === 0) {
    return { dibuat: 0, totalDiperiksa: 0 };
  }

  // 3. Ambil data alur, keputusan yang sudah ada, delegasi aktif, dan peran pengguna
  const { data: flows } = await sb
    .from("approval_flows")
    .select("id, nama, approval_steps(urutan, peran)");

  const kegIds = kegMenunggu.map((k) => k.id);
  const { data: approvalsData } = await sb
    .from("approvals")
    .select("activity_id, tahap, step_urutan, peran, keputusan")
    .in("activity_id", kegIds);

  const { data: delegationsData } = await sb
    .from("delegations")
    .select("dari_peran, ke_peran")
    .lte("mulai", hariIni)
    .gte("selesai", hariIni);

  const { data: allUserRoles } = await sb
    .from("user_roles")
    .select("user_id, peran, mulai, selesai");

  const activeUserRoles = (allUserRoles ?? []).filter(
    (r) => (!r.mulai || r.mulai <= hariIni) && (!r.selesai || r.selesai >= hariIni),
  );

  let jumlahDibuat = 0;

  for (const keg of kegMenunggu) {
    const umur = await hariMenunggu(keg.id);
    const namaTahap = ["diajukan", "dalam_review"].includes(keg.status)
      ? "perencanaan"
      : "pelaporan";
    const ambang = namaTahap === "perencanaan" ? batasPersetujuan : batasLaporan;

    if (umur < ambang) continue;

    const flow = (flows ?? []).find((f: { nama: string }) => f.nama === namaTahap);
    if (!flow) continue;

    const steps = ((flow.approval_steps ?? []) as { urutan: number; peran: string }[])
      .slice()
      .sort((a, b) => a.urutan - b.urutan);

    const approvedSteps = new Set(
      (approvalsData ?? [])
        .filter(
          (a: { activity_id: string; tahap: string; keputusan: string }) =>
            a.activity_id === keg.id && a.tahap === namaTahap && a.keputusan === "setuju",
        )
        .map((a: { step_urutan: number }) => a.step_urutan),
    );

    const berikut = steps.find((s) => !approvedSteps.has(s.urutan));
    if (!berikut) continue;

    const peranDibutuhkan = berikut.peran;
    const peranLayak = new Set<string>([peranDibutuhkan, "super_admin"]);

    for (const d of delegationsData ?? []) {
      if (d.dari_peran === peranDibutuhkan) {
        peranLayak.add(d.ke_peran);
      }
    }

    const targetUserIds = new Set<string>();
    for (const ur of activeUserRoles) {
      if (peranLayak.has(ur.peran)) {
        // Pengusul TIDAK boleh diberi notifikasi approval untuk kegiatannya sendiri
        if (ur.user_id !== keg.dibuat_oleh) {
          targetUserIds.add(ur.user_id);
        }
      }
    }

    for (const targetUserId of targetUserIds) {
      // Cek apakah sudah ada notifikasi serupa dalam 1 hari terakhir
      const { data: adaNotif } = await sb
        .from("notifications")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("jenis", "review_menunggu")
        .eq("activity_id", keg.id)
        .gte("dibuat_pada", satuHariLalu)
        .limit(1);

      if (adaNotif && adaNotif.length > 0) continue;

      const tahapLabel = namaTahap === "perencanaan" ? "perencanaan" : "pelaporan";
      const { error: insertError } = await sb.from("notifications").insert({
        user_id: targetUserId,
        jenis: "review_menunggu",
        judul: `Pengingat Review: ${keg.judul}`,
        pesan: `Persetujuan tahap ${tahapLabel} menunggu tindakan Anda sudah ${umur} hari (batas ${ambang} hari).`,
        tautan: `/admin/kegiatan/${keg.id}`,
        activity_id: keg.id,
        dibaca: false,
      });

      if (!insertError) {
        jumlahDibuat++;
      }
    }
  }

  return { dibuat: jumlahDibuat, totalDiperiksa: kegMenunggu.length };
}

/**
 * Dipakai bila penyapu berkas otomatis dijeda karena melampaui batas pengaman.
 * Mengirim notifikasi ke semua pengguna berstatus Super Admin.
 */
export async function kirimNotifikasiPenyapu(pesanRingkasan?: string): Promise<number> {
  const sb = klienAdmin();
  const hariIni = new Date().toISOString().slice(0, 10);
  const satuHariLalu = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: superAdmins } = await sb
    .from("user_roles")
    .select("user_id, mulai, selesai")
    .eq("peran", "super_admin");

  const adminIds = new Set<string>();
  for (const sa of superAdmins ?? []) {
    if ((!sa.mulai || sa.mulai <= hariIni) && (!sa.selesai || sa.selesai >= hariIni)) {
      adminIds.add(sa.user_id);
    }
  }

  let jumlahDibuat = 0;

  for (const userId of adminIds) {
    const { data: adaNotif } = await sb
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("jenis", "penyapu_dijeda")
      .gte("dibuat_pada", satuHariLalu)
      .limit(1);

    if (adaNotif && adaNotif.length > 0) continue;

    const { error } = await sb.from("notifications").insert({
      user_id: userId,
      jenis: "penyapu_dijeda",
      judul: "Penyapu Berkas Dijeda",
      pesan: pesanRingkasan || "Penyapu berkas otomatis dijeda karena melampaui batas pengaman.",
      tautan: "/admin/pengaturan/penyimpanan",
      dibaca: false,
    });

    if (!error) {
      jumlahDibuat++;
    }
  }

  return jumlahDibuat;
}
