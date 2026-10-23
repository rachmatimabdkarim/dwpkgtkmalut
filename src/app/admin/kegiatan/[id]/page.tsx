import Link from "next/link";
import { notFound } from "next/navigation";
import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajib } from "@/lib/sesi-server";
import { klienServer } from "@/lib/supabase-server";
import { Kartu, JudulSeksi, Lencana, TombolHalus } from "@/components/dasar";
import { labelStatus, tahapSaatIni, formatTanggal, formatRupiah, type Peran } from "@/lib/kegiatan";
import { PanelTindakan, LinimasaRiwayat } from "./panel";
import { FormLaporan } from "./form-laporan";
import { PanelValidasi } from "./panel-validasi";
import { LembarLaporan } from "@/components/lembar-laporan";
import { tarikDataLaporan } from "@/lib/laporan-data";
import { SembunyikanToggle } from "./sembunyikan";
import { PanelPanitia, type PanitiaItem, type PengurusOpsi } from "./panitia";
import { PanelPresensi, type PesertaItem } from "./presensi";
import { PanelQrPresensi } from "./panel-qr-presensi";
import { PanelDokumentasi, type FotoItem } from "./dokumentasi";

export const instant = false;

type Kegiatan = {
  id: string;
  kode: string | null;
  judul: string;
  tujuan: string | null;
  sasaran: string | null;
  ringkasan: string | null;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  tempat: string | null;
  status: string;
  is_hidden: boolean;
  dibuat_oleh: string | null;
  penanggung_jawab: string | null;
  section_id: string | null;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await klienServer();
  const { data } = await sb.from("activities").select("judul").eq("id", id).maybeSingle();
  return { title: data?.judul ?? "Kegiatan" };
}

export default async function DetailKegiatan({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  // Membuka rincian kegiatan boleh siapa saja yang sudah masuk
  // (anggota perlu melihat), tetapi MENGAJUKAN hanya pengurus inti.
  const pengguna = await sesiWajib();
  const { id } = await params;
  const { tab } = await searchParams;
  const sb = await klienServer();

  const { data: keg } = await sb
    .from("activities")
    .select(
      "id, kode, judul, tujuan, sasaran, ringkasan, tanggal_mulai, tanggal_selesai, tempat, status, is_hidden, dibuat_oleh, penanggung_jawab, section_id",
    )
    .eq("id", id)
    .maybeSingle<Kegiatan>();
  if (!keg) notFound();

  const tahap = tahapSaatIni(keg.status);
  const st = labelStatus(keg.status);

  // KECEPATAN: query yang tidak saling bergantung dijalankan BERSAMAAN.
  // Sebelumnya semuanya berurutan (21 query), sehingga tiap pindah tab menunggu
  // puluhan kali perjalanan ke basis data — itulah sebab delay 2–4 detik.
  const [
    { data: rab },
    { data: laporan },
    { data: riwayat },
    { data: daftarPengurus },
    { data: panitia },
    { data: presensi },
  ] = await Promise.all([
    sb
      .from("budget_items")
      .select("id, uraian, satuan, jumlah, harga_satuan, realisasi")
      .eq("activity_id", id)
      .order("urutan"),
    sb
      .from("activity_reports")
      .select("ringkasan, hasil, kendala, rekomendasi, jumlah_hadir, total_anggaran, total_realisasi")
      .eq("activity_id", id)
      .maybeSingle(),
    sb
      .from("activity_logs")
      .select("id, aksi, keterangan, pelaku_nama, waktu")
      .eq("activity_id", id)
      .order("waktu", { ascending: false })
      .limit(20),
    sb.from("profiles").select("id, nama, jabatan").eq("aktif", true).order("nama"),
    sb
      .from("committees")
      .select(`
      id, profile_id, nama_luar, peran, dibuat_pada,
      profiles(id, nama, jabatan),
      tasks(id, judul, selesai, batas, committee_id)
    `)
      .eq("activity_id", id)
      .order("dibuat_pada", { ascending: true }),
    sb
      .from("attendances")
      .select("id, profile_id, nama, instansi, keterangan, dibuat_pada")
      .eq("activity_id", id)
      .order("dibuat_pada", { ascending: true }),
  ]);

  const { data: bagian } = keg.section_id
    ? await sb.from("sections").select("nama").eq("id", keg.section_id).maybeSingle()
    : { data: null };

  // Jendela presensi (QR): jam buka/tutup diatur petugas, tanggalnya mengikuti
  // tanggal kegiatan. Status terbuka/tertutup dihitung server agar tampilan
  // tidak berbeda dengan kenyataan.
  const [{ data: jendelaPresensi }, { data: statusPresensi }] = await Promise.all([
    sb
      .from("presensi_jendela")
      .select("kode_qr, jam_mulai, jam_selesai, dibuka_paksa, alasan_buka_paksa")
      .eq("activity_id", id)
      .maybeSingle<{
        kode_qr: string | null;
        jam_mulai: string;
        jam_selesai: string;
        dibuka_paksa: boolean;
        alasan_buka_paksa: string | null;
      }>(),
    sb.rpc("status_presensi", { p_activity: id }),
  ]);
  const presensiStatus = statusPresensi as { terbuka?: boolean; sebab?: string } | null;

  // KECEPATAN: data laporan (7 query) HANYA ditarik bila tab Laporan dibuka.
  // Sebelumnya selalu ditarik, sehingga setiap pindah tab ikut menanggungnya —
  // itulah sebab tab Laporan paling lambat dan tab lain ikut berat.
  const tabDiminta = tab ?? "ringkasan";
  const dataLaporan =
    tabDiminta === "laporan" ? await tarikDataLaporan(sb, id) : null;

  // SYARAT UNDUH PDF (aturan pemilik): laporan sudah disetujui penuh DAN sudah
  // ditandatangani/divalidasi Ketua DWP. Dihitung di server agar tidak bisa
  // diakali dari peramban.
  const laporanSah =
    keg.status === "laporan_disetujui" && !!dataLaporan?.validasi;

  const { data: foto } = await sb
    .from("attachments")
    .select("id, bucket, path, nama_asli, visibilitas, status, keterangan, ukuran_byte")
    .eq("entitas_id", id)
    .eq("status", "resmi")
    .order("diunggah_pada", { ascending: true });




  // jenjang persetujuan untuk tahap yang sedang berjalan
  const namaAlur = tahap === "pelaporan" ? "pelaporan" : "perencanaan";
  // KECEPATAN: dikelompokkan lagi — alur persetujuan, keputusan, penugasan,
  // dan status presensi tidak saling bergantung, jadi dijalankan bersamaan.
  const [
    { data: alur },
    { data: dataPenugasan2 },
    { data: panitiaSaya },
  ] = await Promise.all([
    sb
      .from("approval_flows")
      .select("id, approval_steps(urutan, peran)")
      .eq("nama", namaAlur)
      .maybeSingle(),
    sb.from("penugasan_pengelola").select("bagian, committee_id").eq("activity_id", id),
    sb.from("committees").select("id, profile_id").eq("activity_id", id),
  ]);

  // `catatan` WAJIB ikut diambil: di sinilah penyetuju menuliskan ALASAN revisi
  // atau penolakan. Tanpa kolom ini, pengusul hanya melihat lencana "Perlu revisi"
  // tanpa tahu apa yang harus diperbaiki.
  const { data: approvals } = await sb
    .from("approvals")
    .select("step_urutan, peran, keputusan, catatan, oleh, dibuat_pada")
    .eq("activity_id", id)
    .eq("tahap", namaAlur)
    .order("dibuat_pada", { ascending: true });

  const langkah = ((alur?.approval_steps ?? []) as { urutan: number; peran: string }[])
    .slice()
    .sort((a, b) => a.urutan - b.urutan)
    .map((l) => {
      // Keputusan TERBARU untuk jenjang ini yang dipakai, bukan yang pertama.
      // Kegiatan yang pernah direvisi lalu diajukan ulang meninggalkan keputusan
      // lama di riwayat; memakai yang pertama membuat linimasa menampilkan
      // catatan revisi lama padahal keputusan terakhirnya sudah berbeda.
      const milik = (approvals ?? []).filter(
        (a: { step_urutan: number; peran: string }) =>
          a.step_urutan === l.urutan && a.peran === l.peran,
      ) as { keputusan: string; catatan: string | null; dibuat_pada: string }[];
      const terakhir = milik.length > 0 ? milik[milik.length - 1] : undefined;
      return {
        urutan: l.urutan,
        peran: l.peran,
        sudah: (terakhir?.keputusan as "setuju" | "revisi" | "tolak" | undefined) ?? null,
        catatan: terakhir?.catatan ?? null,
      };
    });

  // siapa yang sedang ditunggu, dan apakah pengguna ini berhak menilai
  const sudahSetuju = new Set(
    langkah.filter((l) => l.sudah === "setuju").map((l) => l.urutan),
  );

  // Sebagian tahap otomatis DILEWATI, jadi jangan dianggap menunggu:
  //  - tahap Ketua Bidang pada kegiatan tanpa bidang (mis. Pengurus Harian)
  //  - tahap Ketua Bidang bila pengusulnya sendiri Ketua Bidang bidang itu
  //    (tidak boleh menyetujui usulannya sendiri)
  // Tanpa ini, kegiatan tersebut menggantung tanpa ada yang bisa menyetujui.
  const { data: dilewatiData } = await sb.rpc("tahap_dilewati_daftar", {
    p_activity: id,
    p_alur: namaAlur,
  });
  const urutanDilewati = new Set<number>(
    Array.isArray(dilewatiData) ? (dilewatiData as number[]) : [],
  );

  // Alasan tiap tahap yang dilewati, supaya linimasa dapat menjelaskan
  // SEBABNYA — bukan sekadar menulis "dilewati" tanpa keterangan.
  // KECEPATAN: dijalankan BERSAMAAN. Sebelumnya satu perjalanan per tahap
  // secara berurutan, sehingga halaman menunggu berkali-kali.
  const alasanDilewati: Record<number, string> = {};
  const langkahDilewati = langkah.filter((l) => urutanDilewati.has(l.urutan));
  if (langkahDilewati.length > 0) {
    const hasilAlasan = await Promise.all(
      langkahDilewati.map((l) =>
        sb
          .rpc("alasan_tahap_dilewati", { p_activity: id, p_peran: l.peran })
          .then((r) => ({ urutan: l.urutan, alasan: r.data })),
      ),
    );
    for (const h of hasilAlasan) {
      if (typeof h.alasan === "string" && h.alasan.length > 0) {
        alasanDilewati[h.urutan] = h.alasan;
      }
    }
  }

  const berikut = langkah.find(
    (l) => !sudahSetuju.has(l.urutan) && !urutanDilewati.has(l.urutan),
  );
  const peranSaya = pengguna.peran as Peran[];

  const hariIni = new Date().toISOString().slice(0, 10);
  const { data: delegasi } = berikut
    ? await sb
        .from("delegations")
        .select("ke_peran")
        .eq("dari_peran", berikut.peran)
        .lte("mulai", hariIni)
        .gte("selesai", hariIni)
    : { data: null };
  const lewatDelegasi =
    (delegasi ?? []).some((d: { ke_peran: string }) => peranSaya.includes(d.ke_peran as Peran)) ?? false;

  const pengusulSendiri = keg.dibuat_oleh === pengguna.id;

  // A. Mengajukan perubahan hanya untuk PENGUSUL kegiatan dan Sekretaris
  //    (plus Super Admin). Sebelumnya semua pengurus inti — termasuk Ketua
  //    Bidang bidang lain yang tidak ada kaitannya dengan kegiatan ini.


  // B. Perbaikan langsung oleh pengusul — HANYA selama belum ada persetujuan
  //    yang berlaku (draf / revisi / ditolak). Sesudah diajukan, perubahan data
  //    wajib lewat revisi berjenjang dan disetujui ulang oleh seluruh jenjang.
  //    Tanpa batas ini, angka yang sudah disetujui (mis. sasaran 30 orang)
  //    dapat diubah diam-diam menjadi 20 tanpa sepengetahuan penyetuju.
  // "ditolak" sengaja TIDAK termasuk — penolakan berarti selesai dan tidak ada
  // jalan mengajukan kembali, sehingga perbaikan data tidak ada gunanya.
  // ATURAN PEMILIK: tidak ada lagi formulir "Ajukan Perubahan" tersendiri.
  // Perubahan — termasuk anggaran — memakai FORM KEGIATAN yang sama.
  //
  //   * draf / revisi          -> perubahan langsung, tanpa persetujuan ulang
  //   * disetujui / berjalan / selesai / laporan_* -> masuk ANTREAN PERSETUJUAN
  //     BERJENJANG (Bendahara bila ada RAB -> Wakil Ketua -> Ketua)
  //
  // Hanya PENGUSUL kegiatan (atau Super Admin) yang boleh mengusulkan.
  const bolehUbahKegiatan =
    (pengusulSendiri || pengguna.peran.includes("super_admin")) &&
    ["draf", "revisi", "disetujui", "berjalan", "selesai", "laporan_diajukan",
     "laporan_dalam_review", "laporan_disetujui"].includes(keg.status);

  const ubahPerluPersetujuan =
    !["draf", "revisi"].includes(keg.status) && keg.status !== "arsip";

  // D. Modul pelaksanaan (panitia, presensi, dokumentasi) terkunci begitu
  //    laporan DIAJUKAN. Isinya sedang dinilai penyetuju — kalau bisa diubah di
  //    tengah penilaian, penyetuju menilai data yang sudah berbeda.
  const pelaksanaanTerkunci = [
    "laporan_diajukan",
    "laporan_dalam_review",
    "laporan_disetujui",
    "arsip",
  ].includes(keg.status);

  // C. Kegiatan yang sudah diarsipkan tidak dapat diubah lagi.

  // Peran cocok dengan tahap yang sedang menunggu...
  const peranCocok = !!berikut && (peranSaya.includes(berikut.peran as Peran) || lewatDelegasi);

  // ...DAN bidangnya juga cocok. Ketua Bidang hanya boleh menilai kegiatan
  // bidangnya sendiri; Ketua Bidang ekonomi tidak menilai usulan bidang
  // pendidikan. Pemeriksaannya dilakukan di pusat data supaya tidak bisa
  // diakali dari tampilan.
  let bidangCocok = true;
  if (peranCocok && berikut) {
    const { data: boleh } = await sb.rpc("boleh_menilai_tahap", {
      p_activity: keg.id,
      p_peran: berikut.peran,
    });
    bidangCocok = boleh !== false;
  }

  const bolehMenilai =
    keg.status === "diajukan" ||
    keg.status === "dalam_review" ||
    keg.status === "laporan_diajukan" ||
    keg.status === "laporan_dalam_review" ||
    (keg.status === "disetujui" && false)
      ? peranCocok && bidangCocok && !pengusulSendiri
      : false;


  const pesanTunggu = berikut
    ? `Menunggu keputusan ${berikut.peran.replace(/_/g, " ")}.`
    : "Tidak ada yang menunggu tindakan saat ini.";

  // Jejak terakhir siapa yang mengubah anggaran kegiatan ini.
  const { data: jejakAnggaran } = await sb
    .from("activity_logs")
    .select("keterangan, pelaku_nama, waktu")
    .eq("activity_id", id)
    .in("aksi", ["ubah_anggaran", "tambah_anggaran", "hapus_anggaran"])
    .order("waktu", { ascending: false })
    .limit(1);

  const ubahAnggaranTerakhir = (jejakAnggaran ?? [])[0] as
    | { keterangan: string; pelaku_nama: string | null; waktu: string }
    | undefined;

  const total = (rab ?? []).reduce(
    (j: number, b: { jumlah: number; harga_satuan: number }) => j + b.jumlah * b.harga_satuan,
    0,
  );

  // tab yang relevan pada tahap ini
  const semuaTab = [
    { key: "ringkasan", label: "Ringkasan", tahap: ["perencanaan", "pelaksanaan", "pelaporan"] },
    { key: "anggaran", label: "Anggaran", tahap: ["perencanaan", "pelaksanaan", "pelaporan"] },
    { key: "panitia", label: "Panitia", tahap: ["pelaksanaan", "pelaporan"] },
    { key: "presensi", label: "Presensi", tahap: ["pelaksanaan", "pelaporan"] },
    { key: "dokumentasi", label: "Dokumentasi", tahap: ["pelaksanaan", "pelaporan"] },
    { key: "laporan", label: "Laporan", tahap: ["pelaporan"] },
    { key: "riwayat", label: "Riwayat", tahap: ["perencanaan", "pelaksanaan", "pelaporan"] },
  ];
  // ATURAN PEMILIK: tab Presensi dan Dokumentasi hanya terbuka bagi panitia
  // yang DITUGASKAN oleh penanggung jawab. Penanggung jawab dan Super Admin
  // tetap bisa sebagai cadangan bila pengelola berhalangan.
  const penugasan = (dataPenugasan2 ?? []) as { bagian: string; committee_id: string }[];

  // Daftar panitia (sudah diambil bersamaan di atas) untuk mencocokkan penugasan.
  const committeeSaya = new Set(
    ((panitiaSaya ?? []) as { id: string; profile_id: string | null }[])
      .filter((c) => c.profile_id === pengguna.id)
      .map((c) => c.id),
  );

  const bolehKelola = (bagian: "presensi" | "dokumentasi") => {
    if (pengguna.id === keg.penanggung_jawab) return true;
    if (pengguna.peran.includes("super_admin")) return true;
    const p = penugasan.find((x) => x.bagian === bagian);
    return !!p && committeeSaya.has(p.committee_id);
  };

  // Tab Presensi & Dokumentasi TETAP DITAMPILKAN untuk semua orang (aturan
  // pemilik). Yang dibatasi adalah ISI-nya: hanya pengelola yang ditugaskan,
  // penanggung jawab, dan Super Admin yang dapat mengisi atau mengubah.
  const tabTampil = semuaTab.filter((t) => t.tahap.includes(tahap));
  const tabAktif = tabTampil.find((t) => t.key === tab)?.key ?? tabTampil[0].key;

  return (
    <KerangkaAdmin
      pengguna={pengguna}
      judul={keg.judul}
      aksi={
        <SembunyikanToggle
          activityId={keg.id}
          tersembunyi={keg.is_hidden}
          boleh={
            // Hanya untuk kegiatan yang MEMANG bisa tampil di publik. Draf,
            // revisi, dan ditolak tidak pernah tampil di Agenda/Galeri, jadi
            // tombol sembunyikan di situ tidak ada gunanya dan menyesatkan.
            !["draf", "revisi", "ditolak"].includes(keg.status) &&
            pengguna.peran.some((p) =>
              ["super_admin", "ketua", "wakil_ketua", "sekretaris"].includes(p),
            )
          }
        />
      }
    >
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Lencana nada={st.nada}>{st.label}</Lencana>
        <span className="teks-3 text-n-500">{keg.kode ?? "—"}</span>
        {bagian?.nama && <span className="teks-3 text-n-500">· {bagian.nama}</span>}
        {keg.is_hidden && <Lencana nada="netral">Tersembunyi dari publik</Lencana>}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* Kolom kiri: isi kegiatan */}
        <div>
          {/* tab */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-3 px-3 lg:mx-0 lg:px-0">
            {tabTampil.map((t) => (
              <Link
                key={t.key}
                href={`/admin/kegiatan/${keg.id}?tab=${t.key}`}
                className={`shrink-0 inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] ${
                  t.key === tabAktif
                    ? "border-brand-600 bg-brand-600 text-brand-contrast font-medium"
                    : "border-n-300 bg-n-0 text-n-600"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>

          {tabAktif === "ringkasan" && (
            <div className="space-y-6">
              <Kartu className="p-4 sm:p-5">
                <JudulSeksi>Ringkasan</JudulSeksi>
                <dl className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="teks-3 text-n-500">Tujuan</dt>
                    <dd className="text-n-800 text-[14px]">{keg.tujuan || "—"}</dd>
                  </div>
                  <div>
                    <dt className="teks-3 text-n-500">Sasaran</dt>
                    <dd className="text-n-800 text-[14px]">{keg.sasaran || "—"}</dd>
                  </div>
                  <div>
                    <dt className="teks-3 text-n-500">Tanggal pelaksanaan</dt>
                    <dd className="text-n-800 text-[14px]">
                      {formatTanggal(keg.tanggal_mulai)}
                      {keg.tanggal_selesai && keg.tanggal_selesai !== keg.tanggal_mulai
                        ? ` s.d. ${formatTanggal(keg.tanggal_selesai)}`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="teks-3 text-n-500">Tempat</dt>
                    <dd className="text-n-800 text-[14px]">{keg.tempat || "—"}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="teks-3 text-n-500">Ringkasan untuk publik</dt>
                    <dd className="text-n-800 text-[14px]">{keg.ringkasan || "—"}</dd>
                  </div>
                </dl>
              </Kartu>

              {/* B. TOMBOL TUNGGAL untuk mengubah data kegiatan.
                  Memakai FORM KEGIATAN yang sama dengan kegiatan baru, lengkap
                  dengan tab Anggaran (RAB). Tidak ada lagi formulir terpisah.

                  Bila kegiatan sudah disetujui/berjalan, tombol ini berarti
                  MENGAJUKAN PERUBAHAN: setelah disimpan, kegiatan kembali ke
                  antrean persetujuan berjenjang. Keterangannya berubah supaya
                  pengguna tahu apa yang akan terjadi. */}
              {bolehUbahKegiatan && (
                <div className="mt-4 rounded-token border border-n-200 bg-n-50 p-4">
                  <p className="text-[14px] text-n-800 font-medium">
                    {ubahPerluPersetujuan ? "Usulkan perubahan kegiatan" : "Perbaiki data kegiatan"}
                  </p>
                  <p className="teks-3 text-n-600 mt-1">
                    {ubahPerluPersetujuan
                      ? "Mengubah nama, tujuan, sasaran, tanggal, tempat, ringkasan publik, dan rincian anggaran (RAB). Karena kegiatan ini sudah disetujui, perubahannya akan DIAJUKAN ULANG dan harus disetujui berjenjang sebelum berlaku."
                      : "Mengubah nama, tujuan, sasaran, tanggal, tempat, ringkasan publik, dan rincian anggaran (RAB). Perubahan langsung tersimpan dan tercatat di riwayat."}
                  </p>
                  <Link
                    href={`/admin/kegiatan/${keg.id}/ubah`}
                    className="inline-flex h-11 items-center mt-3 rounded-token bg-brand-600 px-4 text-[14px] font-medium text-brand-contrast hover:bg-brand-700"
                  >
                    {ubahPerluPersetujuan ? "Usulkan Perubahan Kegiatan" : "Perbaiki Data Kegiatan"}
                  </Link>
                </div>
              )}

            </div>
          )}

          {tabAktif === "anggaran" && (
            <Kartu className="p-4 sm:p-5">
              <JudulSeksi>Rincian anggaran (RAB)</JudulSeksi>
              {(rab ?? []).length === 0 ? (
                <p className="text-n-500">Belum ada rincian anggaran.</p>
              ) : (
                <>
                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <table className="w-full text-[14px] min-w-[520px]">
                      <thead>
                        <tr className="text-n-500 teks-3 text-left">
                          <th className="pb-2 font-medium">Uraian</th>
                          <th className="pb-2 font-medium">Satuan</th>
                          <th className="pb-2 font-medium text-right">Jumlah</th>
                          <th className="pb-2 font-medium text-right">Harga</th>
                          <th className="pb-2 font-medium text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(rab ?? []).map(
                          (b: { id: string; uraian: string; satuan: string | null; jumlah: number; harga_satuan: number }) => (
                            <tr key={b.id} className="border-t border-n-100">
                              <td className="py-2 text-n-800">{b.uraian}</td>
                              <td className="py-2 text-n-600">{b.satuan || "—"}</td>
                              <td className="py-2 text-n-600 text-right">{b.jumlah}</td>
                              <td className="py-2 text-n-600 text-right">
                                {formatRupiah(b.harga_satuan)}
                              </td>
                              <td className="py-2 text-n-800 text-right">
                                {formatRupiah(b.jumlah * b.harga_satuan)}
                              </td>
                            </tr>
                          ),
                        )}
                        <tr className="border-t border-n-200">
                          <td colSpan={4} className="py-2 text-n-700 font-medium text-right">
                            Total
                          </td>
                          <td className="py-2 text-n-800 font-semibold text-right">
                            {formatRupiah(total)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="teks-3 text-n-500 mt-3">
                    RAB tidak pernah ditampilkan di web publik.
                  </p>

                </>
              )}

              {/* Keterangan kunci anggaran + jejak perubahan terakhir.
                  Diletakkan di LUAR cabang "ada RAB" supaya tetap tampil walau
                  rinciannya masih kosong — sebelumnya kegiatan tanpa RAB tidak
                  mendapat keterangan apa pun. */}
              <div
                className="mt-4 rounded-token px-3.5 py-3"
                style={{
                  backgroundColor: "var(--halaman)",
                  border: "1px solid var(--n-200)",
                }}
              >
                {keg.status === "draf" || keg.status === "revisi" ? (
                  <p className="text-[13px] text-n-700">
                    Anggaran masih dapat diubah karena perencanaannya belum
                    disetujui.
                  </p>
                ) : (
                  <p className="text-[13px] text-n-700">
                    <strong>Anggaran terkunci.</strong> Kegiatan ini sudah
                    disetujui, jadi angkanya tidak dapat diubah langsung —
                    gunakan <strong>Ajukan Perubahan</strong> agar disetujui
                    ulang.
                  </p>
                )}
                {ubahAnggaranTerakhir && (
                  <p className="text-[12.5px] text-n-500 mt-2">
                    Terakhir diubah: {ubahAnggaranTerakhir.keterangan} — oleh{" "}
                    {ubahAnggaranTerakhir.pelaku_nama ?? "tidak diketahui"} pada{" "}
                    {new Date(ubahAnggaranTerakhir.waktu).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </Kartu>
          )}

          {tabAktif === "panitia" && (
            <PanelPanitia
              activityId={keg.id}
              daftarPanitia={(panitia ?? []) as unknown as PanitiaItem[]}
              daftarPengurus={(daftarPengurus ?? []) as PengurusOpsi[]}
              daftarPenugasan={
                penugasan as unknown as {
                  bagian: "presensi" | "dokumentasi";
                  committee_id: string;
                }[]
              }
              // ATURAN PEMILIK: hanya PENANGGUNG JAWAB (atau Super Admin) yang
              // boleh menyusun panitia dan menugaskan pekerjaan. Anggota lain
              // tidak boleh melihat tombolnya sama sekali — walau tab Panitia
              // tetap boleh dibaca.
              bolehUbahPanitia={
                pengguna.id === keg.penanggung_jawab ||
                pengguna.peran.includes("super_admin")
              }
              konteks={{
                id: pengguna.id,
                superAdmin: pengguna.peran.includes("super_admin"),
                penanggungJawabId: keg.penanggung_jawab,
                peranPanitia:
                  ((panitia ?? []) as { profile_id: string | null; peran: string }[])
                    .filter((c) => c.profile_id === pengguna.id)
                    .map((c) => c.peran as
                      | "ketua_panitia"
                      | "sekretaris_panitia"
                      | "bendahara_panitia"
                      | "anggota_panitia")[0] ?? null,
              }}
              terkunci={pelaksanaanTerkunci}
            />
          )}

          {tabAktif === "presensi" && (
            <PanelPresensi
              activityId={keg.id}
              daftarPeserta={(presensi ?? []) as PesertaItem[]}
              daftarPengurus={(daftarPengurus ?? []) as PengurusOpsi[]}
              bolehKelola={bolehKelola("presensi")}
              terkunci={pelaksanaanTerkunci}
              panelQr={
                <PanelQrPresensi
                  activityId={keg.id}
                  kode={jendelaPresensi?.kode_qr ?? null}
                  jamMulai={jendelaPresensi?.jam_mulai ?? "08:00"}
                  jamSelesai={jendelaPresensi?.jam_selesai ?? "16:00"}
                  dibukaPaksa={jendelaPresensi?.dibuka_paksa ?? false}
                  alasanPaksa={jendelaPresensi?.alasan_buka_paksa ?? null}
                  tanggalMulai={keg.tanggal_mulai ?? null}
                  tanggalSelesai={keg.tanggal_selesai ?? null}
                  judulKegiatan={keg.judul}
                  tempat={keg.tempat ?? null}
                  rentangTanggal={
                    keg.tanggal_mulai
                      ? keg.tanggal_selesai && keg.tanggal_selesai !== keg.tanggal_mulai
                        ? `${formatTanggal(keg.tanggal_mulai)} – ${formatTanggal(keg.tanggal_selesai)}`
                        : formatTanggal(keg.tanggal_mulai)
                      : "Tanggal belum diatur"
                  }
                  statusTerbuka={presensiStatus?.terbuka === true}
                  sebab={presensiStatus?.sebab ?? "Presensi mengikuti jadwal kegiatan."}
                  bolehKelola={bolehKelola("presensi")}
                  terkunci={pelaksanaanTerkunci}
                />
              }
            />
          )}

          {tabAktif === "dokumentasi" && (
            <PanelDokumentasi
              activityId={keg.id}
              daftarFoto={(foto ?? []) as FotoItem[]}
              bolehKelola={bolehKelola("dokumentasi")}
              terkunci={pelaksanaanTerkunci}
            />
          )}

          {tabAktif === "laporan" && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="teks-3 text-n-500">
                  {laporanSah
                    ? "Laporan pertanggungjawaban kegiatan resmi DWP."
                    : "Unduhan PDF tersedia setelah laporan disetujui dan divalidasi Ketua DWP."}
                </span>
                {/* ATURAN PEMILIK: PDF baru boleh diunduh setelah laporan
                    DISETUJUI penuh dan DITANDATANGANI (divalidasi) Ketua DWP.
                    Sebelum itu tombol tidak ditampilkan sama sekali. */}
                {laporanSah && (
                  <a
                    href={`/admin/kegiatan/${keg.id}/cetak`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-token border border-n-300 bg-n-0 px-3.5 text-[13px] font-medium text-n-700 hover:bg-n-50 transition-colors shadow-xs shrink-0"
                  >
                    Cetak / Simpan PDF
                  </a>
                )}
              </div>
              {/* FORM ISIAN + PRATINJAU LAPORAN
                  Bagian yang bisa ditarik otomatis (kepanitiaan, presensi, RAB,
                  dokumentasi) TIDAK diisi manual — langsung tampil di pratinjau.
                  Yang diisi hanya realisasi anggaran, biaya lain, dan uraian. */}
              <FormLaporan
                activityId={keg.id}
                data={dataLaporan!}
                bisaAjukan={
                  // Bisa diisi bila laporan belum diajukan, ATAU perlu diperbaiki
                  // setelah dikembalikan / ditolak penyetuju.
                  ["selesai", "revisi", "laporan_ditolak"].includes(keg.status) &&
                  pengguna.peran.some((p) =>
                    ["super_admin", "ketua", "wakil_ketua", "sekretaris", "bendahara", "ketua_seksi"].includes(p),
                  )
                }
                bisaUbah={
                  // HANYA saat kegiatan berstatus `selesai` — yaitu sebelum laporan
                  // diajukan. Sesudah diajukan, isi laporan terkunci supaya yang
                  // dinilai penyetuju sama dengan yang dilihat pengusul.
                  // Bisa diisi bila laporan belum diajukan, ATAU perlu diperbaiki
                  // setelah dikembalikan / ditolak penyetuju.
                  ["selesai", "revisi", "laporan_ditolak"].includes(keg.status) &&
                  pengguna.peran.some((p) =>
                    ["super_admin", "ketua", "wakil_ketua", "sekretaris", "bendahara", "ketua_seksi"].includes(p),
                  )
                }
              />

              <div className="mt-4">
                {dataLaporan && <LembarLaporan data={dataLaporan} />}
              </div>

              <div className="mt-4">
                <PanelValidasi
                  activityId={keg.id}
                  kode={dataLaporan?.validasi?.kode ?? null}
                  divalidasiPada={dataLaporan?.validasi?.divalidasiPada ?? null}
                  bolehValidasi={
                    pengguna.peran.includes("ketua") || pengguna.peran.includes("super_admin")
                  }
                  statusLaporan={keg.status}
                />
              </div>


            </div>
          )}

          {tabAktif === "riwayat" && (
            <Kartu className="p-4 sm:p-5">
              <JudulSeksi>Riwayat</JudulSeksi>
              <LinimasaRiwayat
                riwayat={(riwayat ?? []) as {
                  id: number; aksi: string; keterangan: string | null;
                  pelaku_nama: string | null; waktu: string;
                }[]}
              />
            </Kartu>
          )}
        </div>

        {/* Kolom kanan: tindakan & persetujuan */}
        <PanelTindakan
          activityId={keg.id}
          status={keg.status}
          tahap={tahap === "pelaksanaan" ? "perencanaan" : tahap}
          jenjang={langkah}
          bolehMenilai={bolehMenilai}
          pesanTunggu={pesanTunggu}
          peranSaya={peranSaya}
          urutanDilewati={[...urutanDilewati]}
          alasanDilewati={alasanDilewati}
          judul={keg.judul}
          pengusulSendiri={pengusulSendiri}
          bolehBukaArsip={
            // Hanya pengusul kegiatan atau Super Admin yang boleh membuka arsip.
            pengguna.peran.includes("super_admin") || keg.dibuat_oleh === pengguna.id
          }
          bolehJalankanTahap={
            // ATURAN PEMILIK: tombol pelaksanaan (Mulai Kegiatan, Tandai Selesai,
            // Kunci & Arsipkan) untuk PENANGGUNG JAWAB kegiatan, KETUA PANITIA
            // (yang memimpin pelaksanaan di lapangan), dan Super Admin sebagai
            // cadangan bila keduanya berhalangan.
            pengguna.id === keg.penanggung_jawab ||
            pengguna.peran.includes("super_admin") ||
            ((panitia ?? []) as { profile_id: string | null; peran: string }[]).some(
              (c) => c.profile_id === pengguna.id && c.peran === "ketua_panitia",
            )
          }
          tanggalSelesai={keg.tanggal_selesai}
          kelengkapan={{
            // Wajib ada KETUA PANITIA, bukan sekadar panitia.
            panitia: ((panitia ?? []) as { peran: string }[]).filter(
              (c) => c.peran === "ketua_panitia",
            ).length,
            // Hanya kehadiran SAH yang dihitung. Peserta yang masih "Menunggu"
            // konfirmasi petugas belum dianggap memenuhi kelengkapan.
            presensi: ((presensi ?? []) as { keterangan: string | null }[]).filter(
              (p) => p.keterangan !== "Menunggu",
            ).length,
            dokumentasi: (foto ?? []).length,
            // Tugas panitia yang belum dicentang — syarat "Tandai Selesai".
            // Tugas menempel pada panitia, jadi dihitung dari daftar panitia.
            tugasBelum: ((panitia ?? []) as { tasks?: { selesai: boolean }[] }[]).reduce(
              (n, p) => n + (p.tasks ?? []).filter((t) => !t.selesai).length,
              0,
            ),
          }}
          judulKegiatan={keg.judul}
        />
      </div>

      <div className="mt-6">
        <TombolHalus>
          <Link href="/admin/kegiatan">← Kembali ke daftar kegiatan</Link>
        </TombolHalus>
      </div>
    </KerangkaAdmin>
  );
}
