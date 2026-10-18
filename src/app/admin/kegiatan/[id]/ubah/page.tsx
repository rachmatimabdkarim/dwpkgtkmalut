import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajibPeran } from "@/lib/sesi-server";
import { PERAN_PENGAJU } from "@/lib/peran";
import { klienServer } from "@/lib/supabase-server";
import { FormKegiatanBaru } from "../../baru/form-kegiatan";
import { tidakBoleh } from "./penjaga";

export const metadata = { title: "Ubah Data Kegiatan · SI-ANGGUN" };
export const instant = false;

/**
 * Halaman UBAH DATA KEGIATAN.
 *
 * Memakai FORM YANG SAMA dengan "Kegiatan Baru" — termasuk tab Anggaran (RAB).
 * Pemilik meminta satu formulir saja agar tidak simpel ganda: sebelumnya
 * "Perbaiki Data Kegiatan" punya form terpisah yang TIDAK memuat RAB, sehingga
 * rincian anggaran tidak bisa diperbaiki sama sekali.
 */
export default async function HalamanUbahKegiatan({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pengguna = await sesiWajibPeran(PERAN_PENGAJU);
  const sb = await klienServer();

  const { data: keg } = await sb
    .from("activities")
    .select(
      "id, judul, tujuan, sasaran, tanggal_mulai, tanggal_selesai, tempat, ringkasan, status, dibuat_oleh",
    )
    .eq("id", id)
    .maybeSingle<{
      id: string; judul: string; tujuan: string | null; sasaran: string | null;
      tanggal_mulai: string | null; tanggal_selesai: string | null;
      tempat: string | null; ringkasan: string | null;
      status: string; dibuat_oleh: string;
    }>();

  // Pengaman: hanya pengusul (atau super admin) dan hanya saat draf/revisi.
  const penjaga = tidakBoleh(keg, pengguna);
  if (penjaga) {
    return (
      <KerangkaAdmin pengguna={pengguna} judul="Ubah Data Kegiatan">
        <div className="max-w-[620px] rounded-token border border-warn-line bg-warn-bg p-4">
          <p className="text-[15px] text-warn-fg font-medium">{penjaga.judul}</p>
          <p className="teks-3 text-n-700 mt-1">{penjaga.pesan}</p>
          <a
            href={keg ? `/admin/kegiatan/${id}` : "/admin/kegiatan"}
            className="inline-flex h-11 items-center mt-3 rounded-token bg-brand-600 px-4 text-[14px] font-medium text-brand-contrast"
          >
            Kembali ke kegiatan
          </a>
        </div>
      </KerangkaAdmin>
    );
  }

  const { data: bidang } = await sb.from("sections").select("id, nama").order("urutan");
  const { data: pengurus } = await sb.from("profiles").select("id, nama, jabatan").order("nama");
  const { data: petugas } = await sb.from("officers").select("profile_id, bidang");
  const { data: anggaran } = await sb
    .from("budget_items")
    .select("uraian, satuan, jumlah, harga_satuan")
    .eq("activity_id", id)
    .order("dibuat_pada");

  const bidangPerOrang = new Map<string, string>(
    ((petugas ?? []) as { profile_id: string | null; bidang: string }[])
      .filter((o) => o.profile_id)
      .map((o) => [o.profile_id as string, o.bidang]),
  );
  const pengurusDenganBidang = ((pengurus ?? []) as { id: string; nama: string; jabatan: string }[]).map(
    (p2) => ({ ...p2, bidang: bidangPerOrang.get(p2.id) ?? null }),
  );

  const bidangSaya = pengguna.bidang ?? null;
  const pengurusHarian = bidangSaya === "Pengurus Harian" || bidangSaya === null;

  return (
    <KerangkaAdmin pengguna={pengguna} judul="Ubah Data Kegiatan">
      <div className="mb-4 rounded-token border border-n-200 bg-n-50 p-3">
        <p className="teks-3 text-n-600">
          Anda mengubah data kegiatan <strong className="text-n-800">{keg!.judul}</strong> — termasuk
          rincian anggaran. Setiap perubahan tercatat di riwayat kegiatan.
        </p>
      </div>
      <FormKegiatanBaru
        bidang={(bidang ?? []) as { id: string; nama: string }[]}
        pengurus={pengurusDenganBidang}
        jabatanSaya={pengguna.jabatan}
        bidangSaya={bidangSaya}
        pengurusHarian={pengurusHarian}
        sayaSendiri={{ id: pengguna.id, nama: pengguna.nama }}
        kegiatan={{
          id: keg!.id,
          judul: keg!.judul,
          tujuan: keg!.tujuan,
          sasaran: keg!.sasaran,
          tanggalMulai: keg!.tanggal_mulai,
          tanggalSelesai: keg!.tanggal_selesai,
          tempat: keg!.tempat,
          ringkasan: keg!.ringkasan,
          anggaran: ((anggaran ?? []) as {
            uraian: string; satuan: string | null; jumlah: number; harga_satuan: number;
          }[]).map((b) => ({
            uraian: b.uraian,
            satuan: b.satuan,
            jumlah: b.jumlah,
            hargaSatuan: b.harga_satuan,
          })),
        }}
      />
    </KerangkaAdmin>
  );
}
