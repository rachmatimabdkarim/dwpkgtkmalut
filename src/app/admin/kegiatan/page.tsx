import Link from "next/link";
import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajib } from "@/lib/sesi-server";
import { klienServer } from "@/lib/supabase-server";
import { Lencana, Kartu, Kosong } from "@/components/dasar";
import { labelStatus, formatTanggal } from "@/lib/kegiatan";
import type { Peran } from "@/lib/kegiatan";

export const metadata = { title: "Kegiatan" };

// Halaman panel: selalu dirender saat diminta (bergantung sesi pengguna).
export const instant = false;

type Baris = {
  id: string;
  kode: string | null;
  judul: string;
  tanggal_mulai: string | null;
  tempat: string | null;
  status: string;
  is_hidden: boolean;
};

const TAHAP: { label: string; cocok: string[] }[] = [
  { label: "Semua", cocok: [] },
  {
    label: "Perencanaan",
    cocok: ["draf", "diajukan", "dalam_review", "revisi", "ditolak", "disetujui"],
  },
  { label: "Pelaksanaan", cocok: ["berjalan", "selesai"] },
  {
    label: "Pelaporan",
    cocok: ["laporan_diajukan", "laporan_dalam_review", "laporan_disetujui", "arsip"],
  },
];

const BOLEH_BUAT: Peran[] = [
  "super_admin",
  "ketua",
  "wakil_ketua",
  "sekretaris",
  "bendahara",
  "ketua_seksi",
];

export default async function HalamanKegiatan({
  searchParams,
}: {
  searchParams: Promise<{ tahap?: string }>;
}) {
  const pengguna = await sesiWajib();
  const { tahap } = await searchParams;
  const aktif =
    TAHAP.find((t) => t.label.toLowerCase() === (tahap ?? "").toLowerCase()) ?? TAHAP[0];

  const sb = await klienServer();
  let kueri = sb
    .from("activities")
    .select("id, kode, judul, tanggal_mulai, tempat, status, is_hidden")
    .order("tanggal_mulai", { ascending: false, nullsFirst: false });
  if (aktif.cocok.length > 0) kueri = kueri.in("status", aktif.cocok);
  const { data } = await kueri;
  const daftar: Baris[] = data ?? [];

  const bolehBuat = pengguna.peran.some((p) => BOLEH_BUAT.includes(p));

  return (
    <KerangkaAdmin
      pengguna={pengguna}
      judul="Kegiatan"
      aksi={
        <div className="flex items-center gap-2">
          <Link
            href="/admin/kalender"
            className="inline-flex h-11 items-center rounded-token border border-n-300 bg-n-0 px-3.5 text-[14px] font-medium text-n-700 hover:bg-n-50 transition-colors"
          >
            Kalender
          </Link>
          {bolehBuat ? (
            <Link
              href="/admin/kegiatan/baru"
              className="inline-flex h-11 items-center rounded-token bg-brand-600 px-4 text-[15px] font-medium text-brand-contrast hover:bg-brand-700"
            >
              + Kegiatan Baru
            </Link>
          ) : null}
        </div>
      }
    >
      {/* Filter tahap */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-3 px-3 sm:mx-0 sm:px-0">
        {TAHAP.map((t) => (
          <Link
            key={t.label}
            href={
              t.label === "Semua"
                ? "/admin/kegiatan"
                : `/admin/kegiatan?tahap=${t.label.toLowerCase()}`
            }
            className={`shrink-0 inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] ${
              t.label === aktif.label
                ? "border-brand-600 bg-brand-600 text-brand-contrast font-medium"
                : "border-n-300 bg-n-0 text-n-600"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {daftar.length === 0 ? (
        <Kosong
          pesan="Belum ada kegiatan pada tahap ini."
          aksi={
            bolehBuat ? (
              <Link
                href="/admin/kegiatan/baru"
                className="inline-flex h-11 items-center rounded-token bg-brand-600 px-4 font-medium text-brand-contrast hover:bg-brand-700"
              >
                + Kegiatan Baru
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop: baris */}
          <div className="hidden sm:block">
            <Kartu>
              <div className="grid grid-cols-[1fr_170px_150px_80px] gap-3 px-4 h-11 items-center border-b border-n-200 teks-3 font-medium text-n-500">
                <span>Nama kegiatan</span>
                <span>Tanggal</span>
                <span>Status</span>
                <span className="text-right">Aksi</span>
              </div>
              {daftar.map((k) => {
                const st = labelStatus(k.status);
                return (
                  <div
                    key={k.id}
                    className="grid grid-cols-[1fr_170px_150px_80px] gap-3 px-4 py-3 items-center border-b border-n-100 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-n-800 truncate">{k.judul}</p>
                      <p className="teks-3 text-n-500 truncate">
                        {k.kode ?? "—"} · {k.tempat ?? "tempat belum diisi"}
                      </p>
                    </div>
                    <span className="text-[14px] text-n-600">{formatTanggal(k.tanggal_mulai)}</span>
                    <span>
                      <Lencana nada={st.nada}>{st.label}</Lencana>
                    </span>
                    <span className="text-right">
                      <Link
                        href={`/admin/kegiatan/${k.id}`}
                        className="text-[14px] text-brand-700 underline underline-offset-2"
                      >
                        Buka
                      </Link>
                    </span>
                  </div>
                );
              })}
            </Kartu>
          </div>

          {/* HP: kartu */}
          <div className="sm:hidden flex flex-col gap-2">
            {daftar.map((k) => {
              const st = labelStatus(k.status);
              return (
                <Link key={k.id} href={`/admin/kegiatan/${k.id}`} className="block">
                  <Kartu className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-n-800">{k.judul}</p>
                        <p className="teks-3 text-n-500 mt-0.5">
                          {formatTanggal(k.tanggal_mulai)} · {k.tempat ?? "—"}
                        </p>
                      </div>
                      <Lencana nada={st.nada}>{st.label}</Lencana>
                    </div>
                  </Kartu>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </KerangkaAdmin>
  );
}
