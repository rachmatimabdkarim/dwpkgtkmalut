"use server";

import { revalidatePath } from "next/cache";
import { klienServer } from "@/lib/supabase-server";
import { penggunaSaatIni } from "@/lib/supabase-server";

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
  ringkasan: string;
  ajukanSekarang: boolean;
  anggaran?: { uraian: string; satuan: string; jumlah: number; hargaSatuan: number }[];
}) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir. Silakan masuk kembali." };

  if (!masukan.judul.trim()) return { galat: "Nama kegiatan wajib diisi." };

  const sb = await klienServer();

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

  const { error } = await sb
    .from("activities")
    .update({ status: "diajukan" })
    .eq("id", activityId);
  if (error) return { galat: "Gagal mengajukan: " + error.message };

  await sb.from("activity_logs").insert({
    activity_id: activityId,
    aksi: "diajukan",
    keterangan: "Perencanaan diajukan untuk persetujuan berjenjang",
    pelaku_id: pengguna.id,
    pelaku_nama: pengguna.nama,
  });

  revalidatePath("/admin/kegiatan");
  revalidatePath(`/admin/kegiatan/${activityId}`);
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
export async function simpanRab(activityId: string, baris: {
  id?: string; uraian: string; satuan: string; jumlah: number; hargaSatuan: number;
}) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };
  if (!baris.uraian.trim()) return { galat: "Uraian wajib diisi." };
  const sb = await klienServer();
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
  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}

export async function hapusRab(activityId: string, id: string) {
  const sb = await klienServer();
  const { error } = await sb.from("budget_items").delete().eq("id", id);
  if (error) return { galat: error.message };
  revalidatePath(`/admin/kegiatan/${activityId}`);
  return { ok: true };
}
