import Link from "next/link";
import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajib } from "@/lib/sesi-server";
import { klienServer } from "@/lib/supabase-server";
import { Kartu, Kosong, Lencana, type NadaStatus } from "@/components/dasar";
import { labelPeran } from "@/lib/peran";
import { labelStatus, formatTanggal, type Peran } from "@/lib/kegiatan";

export const metadata = { title: "Beranda" };

// Halaman panel: selalu dirender saat diminta (bergantung sesi pengguna).
export const instant = false;

type PerluTindakanItem = {
  id: string;
  judul: string;
  tahap: string;
  keterangan: string;
  statusLencana: string;
  nada: NadaStatus;
  aksi: string;
  tautan: string;
};

export default async function BerandaAdmin() {
  const pengguna = await sesiWajib();
  const sb = await klienServer();
  const hariIni = new Date().toISOString().slice(0, 10);

  const perluTindakan: PerluTindakanItem[] = [];

  // ============================================================
  // 1. KEGIATAN YANG MENUNGGU KEPUTUSAN PENGGUNA SAAT INI
  // ============================================================
  const { data: kegMenunggu } = await sb
    .from("activities")
    .select("id, judul, status, dibuat_oleh")
    .in("status", ["diajukan", "dalam_review", "laporan_diajukan", "laporan_dalam_review"]);

  if (kegMenunggu && kegMenunggu.length > 0) {
    // Ambil semua alur persetujuan
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
    const peranSaya = pengguna.peran as Peran[];

    for (const keg of kegMenunggu) {
      // Pengusul TIDAK boleh menyetujui usulannya sendiri
      if (keg.dibuat_oleh === pengguna.id) continue;

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
        perluTindakan.push({
          id: `keg-${keg.id}`,
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

  // ============================================================
  // 2. BERITA DI ANTREAN (BILA PENGGUNA BERPERAN EDITOR / SUPER ADMIN)
  // ============================================================
  const apakahEditor = pengguna.peran.some((p) => ["editor", "super_admin"].includes(p));
  if (apakahEditor) {
    const { data: posAntrean } = await sb
      .from("posts")
      .select("id, judul, status")
      .eq("sumber", "otomatis")
      .or("status.eq.antrean,perlu_tinjauan.eq.true")
      .order("dibuat_pada", { ascending: false })
      .limit(5);

    for (const pos of posAntrean ?? []) {
      perluTindakan.push({
        id: `pos-${pos.id}`,
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

  // ============================================================
  // 3. KEGIATAN MENDATANG (DATA ASLI DARI DATABASE)
  // ============================================================
  const { data: mendatangData } = await sb
    .from("activities")
    .select("id, judul, tanggal_mulai, tempat, status")
    .gte("tanggal_mulai", hariIni)
    .not("status", "in", '("draf","ditolak","arsip")')
    .order("tanggal_mulai", { ascending: true })
    .limit(3);

  let mendatang = mendatangData ?? [];
  if (mendatang.length === 0) {
    const { data: fallbackData } = await sb
      .from("activities")
      .select("id, judul, tanggal_mulai, tempat, status")
      .not("status", "in", '("draf","ditolak","arsip")')
      .order("tanggal_mulai", { ascending: false, nullsFirst: false })
      .limit(3);
    mendatang = fallbackData ?? [];
  }

  return (
    <KerangkaAdmin
      pengguna={pengguna}
      judul={`Selamat datang, ${pengguna.nama.split(" ")[0]}`}
    >
      <p className="text-n-500 -mt-1 mb-5">
        Peran Anda: <span className="text-n-700 font-medium">{labelPeran(pengguna.peran)}</span>
      </p>

      {/* Blok 1: Perlu tindakan saya */}
      <section className="mb-7">
        <h2 className="judul-2 text-n-800 mb-3">Perlu tindakan saya</h2>
        {perluTindakan.length === 0 ? (
          <Kosong
            pesan="Belum ada yang menunggu tindakan Anda."
            aksi={
              <Link
                href="/admin/kegiatan"
                className="inline-flex h-11 items-center rounded-token bg-brand-600 px-4 font-medium text-brand-contrast hover:bg-brand-700"
              >
                Lihat semua kegiatan
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {perluTindakan.map((t) => (
              <Kartu key={t.id} className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-n-800 truncate">{t.judul}</p>
                  <p className="teks-3 text-n-500 mt-0.5">
                    {t.tahap} · {t.keterangan}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Lencana nada={t.nada}>{t.statusLencana}</Lencana>
                  <Link
                    href={t.tautan}
                    className="inline-flex h-9 items-center rounded-token bg-brand-600 px-3 text-[13px] font-medium text-brand-contrast hover:bg-brand-700"
                  >
                    {t.aksi}
                  </Link>
                </div>
              </Kartu>
            ))}
          </div>
        )}
      </section>

      {/* Blok 2: Kegiatan mendatang */}
      <section>
        <h2 className="judul-2 text-n-800 mb-3">Kegiatan mendatang</h2>
        {mendatang.length === 0 ? (
          <Kosong pesan="Belum ada jadwal kegiatan mendatang." />
        ) : (
          <div className="flex flex-col gap-2">
            {mendatang.map((k) => {
              const st = labelStatus(k.status);
              return (
                <Kartu key={k.id} className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-n-800 truncate">{k.judul}</p>
                    <p className="teks-3 text-n-500 mt-0.5">
                      {formatTanggal(k.tanggal_mulai)} · {k.tempat || "Tempat belum ditentukan"}
                    </p>
                  </div>
                  <Lencana nada={st.nada}>{st.label}</Lencana>
                </Kartu>
              );
            })}
          </div>
        )}
      </section>
    </KerangkaAdmin>
  );
}
