import Link from "next/link";
import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajib } from "@/lib/sesi-server";
import { klienServer } from "@/lib/supabase-server";
import { Kartu, Kosong, Lencana, type NadaStatus } from "@/components/dasar";
import { labelPeran } from "@/lib/peran";
import { labelStatus, formatTanggal } from "@/lib/kegiatan";
import { perluTindakanUntuk } from "@/lib/notifikasi";

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
  // 1. KEGIATAN & BERITA YANG MENUNGGU TINDAKAN PENGGUNA
  // ============================================================
  const daftarTindakan = await perluTindakanUntuk(pengguna.id);
  perluTindakan.push(...daftarTindakan);

  // ============================================================
  // 2. NOTIFIKASI BELUM DIBACA DARI TABEL NOTIFICATIONS
  //    (selain kegiatan yang sudah menunggu keputusan di atas)
  // ============================================================
  const { data: notifBelumDibaca } = await sb
    .from("notifications")
    .select("id, jenis, judul, pesan, tautan, activity_id, dibuat_pada")
    .eq("user_id", pengguna.id)
    .eq("dibaca", false)
    .order("dibuat_pada", { ascending: false })
    .limit(5);

  for (const n of notifBelumDibaca ?? []) {
    // Jangan tampilkan ganda jika kegiatan sudah ada di daftar tindakan di atas
    if (n.activity_id && perluTindakan.some((t) => t.id === `keg-${n.activity_id}`)) {
      continue;
    }

    perluTindakan.push({
      id: `notif-${n.id}`,
      judul: n.judul,
      tahap: n.jenis === "penyapu_dijeda" ? "Sistem" : "Pemberitahuan",
      keterangan: n.pesan ?? "Pemberitahuan baru belum dibaca",
      statusLencana: "Baru",
      nada: n.jenis === "penyapu_dijeda" ? "bad" : "brand",
      aksi: "Buka",
      tautan: n.tautan || "/admin",
    });
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
