import Link from "next/link";
import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajibPeran } from "@/lib/sesi-server";
import { klienServer } from "@/lib/supabase-server";
import { Kosong } from "@/components/dasar";
import { DaftarBerita, type ItemBerita } from "./berita-baru";
import {
  AntreanBerita,
  PanelGaleri,
  type ItemAntrean,
  type KelompokGaleri,
  type ItemFotoGaleri,
} from "./antrean";

export const metadata = { title: "Konten" };

// Halaman panel: selalu dirender saat diminta (bergantung sesi pengguna).
export const instant = false;

const TAB_KONTEN = [
  { key: "berita", label: "Berita" },
  { key: "antrean", label: "Antrean Tinjauan" },
  { key: "galeri", label: "Galeri Publik" },
  { key: "halaman", label: "Halaman" },
] as const;

export default async function HalamanKonten({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; tambah?: string }>;
}) {
  const pengguna = await sesiWajibPeran([
    "super_admin",
    "editor",
    "ketua",
    "wakil_ketua",
    "sekretaris",
  ]);

  const { tab, tambah } = await searchParams;
  const tabAktif = TAB_KONTEN.find((t) => t.key === tab)?.key ?? "berita";

  const sb = await klienServer();

  // 1. Ambil data semua berita untuk tab Berita
  const { data: dataBerita } = await sb
    .from("posts")
    .select(
      "id, judul, slug, ringkasan, isi, sumber, gambar_path, status, terbit_pada, dibuat_pada, diperbarui_pada, activity_id",
    )
    .order("dibuat_pada", { ascending: false });

  const daftarBerita: ItemBerita[] = (dataBerita ?? []).map((b) => ({
    id: b.id,
    judul: b.judul,
    slug: b.slug,
    ringkasan: b.ringkasan,
    isi: b.isi,
    sumber: b.sumber as "manual" | "otomatis",
    gambar_path: b.gambar_path,
    status: b.status as "draf" | "antrean" | "terbit" | "arsip",
    terbit_pada: b.terbit_pada,
    dibuat_pada: b.dibuat_pada,
    diperbarui_pada: b.diperbarui_pada,
    activity_id: b.activity_id,
  }));

  // 2. Ambil data antrean tinjauan (berita otomatis yang perlu tinjauan)
  const { data: dataAntrean } = await sb
    .from("posts")
    .select(
      `
      id, judul, slug, ringkasan, isi, gambar_path, status, sumber, activity_id, dibuat_pada,
      activities:activity_id (judul, tanggal_mulai, tempat)
    `,
    )
    .eq("sumber", "otomatis")
    .or("status.eq.antrean,perlu_tinjauan.eq.true")
    .order("dibuat_pada", { ascending: false });

  type RawAntrean = {
    id: string;
    judul: string;
    slug: string;
    ringkasan: string | null;
    isi: string | null;
    gambar_path: string | null;
    status: string;
    sumber: string;
    activity_id: string | null;
    dibuat_pada: string;
    activities: { judul: string; tanggal_mulai: string | null; tempat: string | null } | null;
  };

  const daftarAntrean: ItemAntrean[] = ((dataAntrean ?? []) as unknown as RawAntrean[]).map(
    (a) => ({
      id: a.id,
      judul: a.judul,
      slug: a.slug,
      ringkasan: a.ringkasan,
      isi: a.isi,
      gambar_path: a.gambar_path,
      status: a.status,
      sumber: a.sumber,
      activity_id: a.activity_id,
      dibuat_pada: a.dibuat_pada,
      kegiatan: a.activities
        ? {
            judul: a.activities.judul,
            tanggal_mulai: a.activities.tanggal_mulai,
            tempat: a.activities.tempat,
          }
        : null,
    }),
  );

  const jumlahAntrean = daftarAntrean.length;

  // 3. Ambil data foto galeri publik
  const { data: dataFoto } = await sb
    .from("attachments")
    .select(
      `
      id, bucket, path, nama_asli, keterangan, diunggah_pada, entitas_id,
      activities:entitas_id (judul)
    `,
    )
    .eq("bucket", "publik")
    .eq("status", "resmi")
    .eq("visibilitas", "publik")
    .eq("kategori", "foto_kegiatan")
    .order("diunggah_pada", { ascending: false });

  type RawFoto = {
    id: string;
    bucket: string;
    path: string;
    nama_asli: string;
    keterangan: string | null;
    diunggah_pada: string;
    entitas_id: string | null;
    activities: { judul: string } | null;
  };

  // Kelompokkan foto per kegiatan
  const kelompokPeta = new Map<string, { judul: string; items: ItemFotoGaleri[] }>();

  ((dataFoto ?? []) as unknown as RawFoto[]).forEach((f) => {
    const actId = f.entitas_id || "umum";
    const judul = f.activities?.judul || (actId === "umum" ? "Foto Umum" : "Dokumentasi Kegiatan");

    if (!kelompokPeta.has(actId)) {
      kelompokPeta.set(actId, { judul, items: [] });
    }

    kelompokPeta.get(actId)!.items.push({
      id: f.id,
      bucket: f.bucket,
      path: f.path,
      nama_asli: f.nama_asli,
      keterangan: f.keterangan,
      diunggah_pada: f.diunggah_pada,
      activity_id: actId,
      activity_judul: judul,
    });
  });

  const kelompokGaleri: KelompokGaleri[] = Array.from(kelompokPeta.entries()).map(
    ([actId, val]) => ({
      activity_id: actId,
      activity_judul: val.judul,
      items: val.items,
    }),
  );

  return (
    <KerangkaAdmin pengguna={pengguna} judul="Konten">
      {/* Tab navigasi */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-3 px-3 sm:mx-0 sm:px-0">
        {TAB_KONTEN.map((t) => {
          const aktif = t.key === tabAktif;
          return (
            <Link
              key={t.key}
              href={`/admin/konten?tab=${t.key}`}
              className={`shrink-0 inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] transition-colors ${
                aktif
                  ? "border-brand-600 bg-brand-600 text-brand-contrast font-medium"
                  : "border-n-300 bg-n-0 text-n-600 hover:bg-n-50"
              }`}
            >
              <span>{t.label}</span>
              {t.key === "antrean" && jumlahAntrean > 0 && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${
                    aktif ? "bg-white/20 text-white" : "bg-warn-bg text-warn-fg border border-warn-line"
                  }`}
                >
                  {jumlahAntrean}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Konten sesuai tab aktif */}
      {tabAktif === "berita" && (
        <DaftarBerita semuaBerita={daftarBerita} bukaFormAwal={tambah === "1"} />
      )}

      {tabAktif === "antrean" && <AntreanBerita daftar={daftarAntrean} />}

      {tabAktif === "galeri" && <PanelGaleri kelompok={kelompokGaleri} />}

      {tabAktif === "halaman" && (
        <div className="flex flex-col gap-4">
          <Kosong
            pesan="Belum ada halaman tambahan."
            aksi={
              <p className="teks-3 text-n-500 max-w-md text-center">
                Halaman statis tambahan (seperti Tentang Kami, Kontak, atau Profil Organisasi)
                dapat dikonfigurasi di sini bila dibutuhkan nanti.
              </p>
            }
          />
        </div>
      )}
    </KerangkaAdmin>
  );
}
