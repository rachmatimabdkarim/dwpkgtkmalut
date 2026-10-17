import Link from "next/link";
import { notFound } from "next/navigation";
import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajib } from "@/lib/sesi-server";
import { klienServer } from "@/lib/supabase-server";
import { Kartu, JudulSeksi, Lencana, TombolHalus } from "@/components/dasar";
import { labelStatus, tahapSaatIni, formatTanggal, formatRupiah, type Peran } from "@/lib/kegiatan";
import { PanelTindakan, PanelLaporan, LinimasaRiwayat } from "./panel";
import { SembunyikanToggle } from "./sembunyikan";
import { PanelPerbaikan } from "./perbaikan";
import { PanelPanitia, type PanitiaItem, type PengurusOpsi } from "./panitia";
import { PanelPresensi, type PesertaItem } from "./presensi";
import { PanelDokumentasi, type FotoItem } from "./dokumentasi";
import { PanelPerubahan, type ItemPengajuan } from "./perubahan";

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

  const { data: rab } = await sb
    .from("budget_items")
    .select("id, uraian, satuan, jumlah, harga_satuan, realisasi")
    .eq("activity_id", id)
    .order("urutan");

  const { data: laporan } = await sb
    .from("activity_reports")
    .select("ringkasan, hasil, kendala, rekomendasi, jumlah_hadir, total_anggaran, total_realisasi")
    .eq("activity_id", id)
    .maybeSingle();

  const { data: riwayat } = await sb
    .from("activity_logs")
    .select("id, aksi, keterangan, pelaku_nama, waktu")
    .eq("activity_id", id)
    .order("waktu", { ascending: false })
    .limit(20);

  const { data: bagian } = keg.section_id
    ? await sb.from("sections").select("nama").eq("id", keg.section_id).maybeSingle()
    : { data: null };

  const { data: daftarPengurus } = await sb
    .from("profiles")
    .select("id, nama, jabatan")
    .eq("aktif", true)
    .order("nama");

  const { data: panitia } = await sb
    .from("committees")
    .select(`
      id, profile_id, nama_luar, peran, dibuat_pada,
      profiles(id, nama, jabatan),
      tasks(id, judul, selesai, batas, committee_id)
    `)
    .eq("activity_id", id)
    .order("dibuat_pada", { ascending: true });

  const { data: presensi } = await sb
    .from("attendances")
    .select("id, profile_id, nama, keterangan, dibuat_pada")
    .eq("activity_id", id)
    .order("dibuat_pada", { ascending: true });

  const { data: foto } = await sb
    .from("attachments")
    .select("id, bucket, path, nama_asli, visibilitas, status, keterangan, ukuran_byte")
    .eq("entitas_id", id)
    .eq("status", "resmi")
    .order("diunggah_pada", { ascending: true });

  // Perubahan hanya masuk akal SETELAH perencanaan disetujui. Kegiatan yang
  // sudah selesai laporan atau diarsipkan pun masih boleh diajukan perubahan
  // (mis. koreksi tanggal/tempat yang tercatat keliru), karena itu ikut dicakup.
  // C. "arsip" sengaja TIDAK dimasukkan — kegiatan yang sudah diarsipkan adalah
  // catatan final dan tidak boleh diubah lagi.
  const tampilkanPerubahan = [
    "disetujui",
    "berjalan",
    "selesai",
    "laporan_diajukan",
    "laporan_dalam_review",
    "laporan_disetujui",
  ].includes(keg.status);
  const { data: dataPerubahan } = tampilkanPerubahan
    ? await sb
        .from("change_requests")
        .select(
          "id, activity_id, jenis, usulan, alasan, status, diajukan_oleh, dibuat_pada, diputuskan_pada, profiles:diajukan_oleh(nama)",
        )
        .eq("activity_id", id)
        .order("dibuat_pada", { ascending: false })
    : { data: null };

  const daftarPengajuan: ItemPengajuan[] = ((dataPerubahan ?? []) as unknown as {
    id: string;
    activity_id: string;
    jenis: "tanggal" | "tempat" | "anggaran" | "lain";
    usulan: string;
    alasan: string | null;
    status: "diajukan" | "dalam_review" | "disetujui" | "ditolak";
    diajukan_oleh: string | null;
    dibuat_pada: string;
    diputuskan_pada: string | null;
    profiles?: { nama: string } | null;
  }[]).map((cr) => ({
    id: cr.id,
    activity_id: cr.activity_id,
    jenis: cr.jenis,
    usulan: cr.usulan,
    alasan: cr.alasan,
    status: cr.status,
    diajukan_oleh: cr.diajukan_oleh,
    nama_pengaju: cr.profiles?.nama,
    dibuat_pada: cr.dibuat_pada,
    diputuskan_pada: cr.diputuskan_pada,
  }));

  const apakahPengurusInti = pengguna.peran.some((p) =>
    ["super_admin", "ketua", "wakil_ketua", "sekretaris", "bendahara", "ketua_seksi"].includes(p),
  );


  const bolehUbahPublik =
    pengguna.id === keg.penanggung_jawab ||
    pengguna.peran.some((p) =>
      ["super_admin", "ketua", "wakil_ketua", "sekretaris"].includes(p),
    );

  // jenjang persetujuan untuk tahap yang sedang berjalan
  const namaAlur = tahap === "pelaporan" ? "pelaporan" : "perencanaan";
  const { data: alur } = await sb
    .from("approval_flows")
    .select("id, approval_steps(urutan, peran)")
    .eq("nama", namaAlur)
    .maybeSingle();

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
  const alasanDilewati: Record<number, string> = {};
  for (const l of langkah) {
    if (!urutanDilewati.has(l.urutan)) continue;
    const { data: alasan } = await sb.rpc("alasan_tahap_dilewati", {
      p_activity: id,
      p_peran: l.peran,
    });
    if (typeof alasan === "string" && alasan.length > 0) {
      alasanDilewati[l.urutan] = alasan;
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
  const bolehAjukanPerubahan =
    pengusulSendiri ||
    pengguna.peran.includes("sekretaris") ||
    pengguna.peran.includes("super_admin");

  // B. Perbaikan langsung oleh pengusul — HANYA selama belum ada persetujuan
  //    yang berlaku (draf / revisi / ditolak). Sesudah diajukan, perubahan data
  //    wajib lewat revisi berjenjang dan disetujui ulang oleh seluruh jenjang.
  //    Tanpa batas ini, angka yang sudah disetujui (mis. sasaran 30 orang)
  //    dapat diubah diam-diam menjadi 20 tanpa sepengetahuan penyetuju.
  const bolehPerbaikiLangsung =
    (pengusulSendiri || pengguna.peran.includes("super_admin")) &&
    ["draf", "revisi", "ditolak"].includes(keg.status);

  // C. Kegiatan yang sudah diarsipkan tidak dapat diubah lagi.
  const perubahanTertutup = keg.status === "arsip";

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
          boleh={pengguna.peran.some((p) =>
            ["super_admin", "ketua", "wakil_ketua", "sekretaris"].includes(p),
          )}
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

              {/* B. Pengusul memperbaiki langsung, tanpa alur pengajuan. */}
              {bolehPerbaikiLangsung && (
                <div className="mt-4">
                  <PanelPerbaikan
                    activityId={keg.id}
                    judul={keg.judul}
                    tujuan={keg.tujuan}
                    sasaran={keg.sasaran}
                    tanggalMulai={keg.tanggal_mulai}
                    tanggalSelesai={keg.tanggal_selesai}
                    tempat={keg.tempat}
                    ringkasan={keg.ringkasan}
                  />
                </div>
              )}

              {/* A & C. Pengajuan perubahan resmi — untuk hal yang harus
                  disetujui ulang, dan tertutup untuk kegiatan yang diarsipkan. */}
              {tampilkanPerubahan && !perubahanTertutup && (
                <PanelPerubahan
                  activityId={keg.id}
                  daftarPengajuan={daftarPengajuan}
                  bisaMengajukan={bolehAjukanPerubahan}
                  bisaMemutuskan={apakahPengurusInti}
                />
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
            />
          )}

          {tabAktif === "presensi" && (
            <PanelPresensi
              activityId={keg.id}
              daftarPeserta={(presensi ?? []) as PesertaItem[]}
              daftarPengurus={(daftarPengurus ?? []) as PengurusOpsi[]}
            />
          )}

          {tabAktif === "dokumentasi" && (
            <PanelDokumentasi
              activityId={keg.id}
              daftarFoto={(foto ?? []) as FotoItem[]}
              bolehUbahPublik={bolehUbahPublik}
            />
          )}

          {tabAktif === "laporan" && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3">
                <span className="teks-3 text-n-500">
                  Laporan pertanggungjawaban kegiatan resmi DWP.
                </span>
                <a
                  href={`/api/laporan/${keg.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-token border border-n-300 bg-n-0 px-3.5 text-[13px] font-medium text-n-700 hover:bg-n-50 transition-colors shadow-xs shrink-0"
                >
                  Unduh PDF
                </a>
              </div>
              <PanelLaporan
                activityId={keg.id}
                isi={{
                  ringkasan: laporan?.ringkasan ?? "",
                  hasil: laporan?.hasil ?? "",
                  kendala: laporan?.kendala ?? "",
                  rekomendasi: laporan?.rekomendasi ?? "",
                  jumlahHadir: laporan?.jumlah_hadir ?? 0,
                }}
                bisaUbah={
                  !["laporan_disetujui", "arsip"].includes(keg.status) &&
                  pengguna.peran.some((p) =>
                    ["super_admin", "ketua", "wakil_ketua", "sekretaris", "bendahara", "ketua_seksi"].includes(p),
                  )
                }
                bisaAjukan={
                  keg.status === "selesai" &&
                  pengguna.peran.some((p) =>
                    ["super_admin", "ketua", "wakil_ketua", "sekretaris", "bendahara", "ketua_seksi"].includes(p),
                  )
                }
                rab={(rab ?? []) as unknown as {
                  id: string; uraian: string; satuan: string | null; jumlah: number;
                  harga_satuan: number; realisasi: number | null;
                }[]}
              />

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
