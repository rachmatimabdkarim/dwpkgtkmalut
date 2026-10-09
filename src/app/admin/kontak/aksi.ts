"use server";

/** Aksi halaman Kontak: mengirim pesan dari masyarakat. */

import { revalidatePath } from "next/cache";
import { klienServer, penggunaSaatIni } from "@/lib/supabase-server";

export type HasilKontak = { ok?: boolean; galat?: string };

function bersihkan(nilai: string | null | undefined, maks: number): string {
  return (nilai ?? "").replace(/\s+/g, " ").trim().slice(0, maks);
}

/** Mengirim pesan dari form kontak publik. */
export async function kirimPesanKontak(masukan: {
  nama: string;
  email: string;
  pesan: string;
}): Promise<HasilKontak> {
  try {
    const nama = bersihkan(masukan.nama, 120);
    const email = bersihkan(masukan.email, 160).toLowerCase();
    const pesan = (masukan.pesan ?? "").trim().slice(0, 4000);

    if (nama.length < 2) return { galat: "Nama wajib diisi." };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return { galat: "Alamat email tidak sah. Contoh: nama@contoh.com" };
    }
    if (pesan.length < 10) {
      return { galat: "Pesan terlalu pendek. Mohon ditulis minimal 10 huruf." };
    }

    const sb = await klienServer();
    const { error } = await sb.from("contact_messages").insert({ nama, email, pesan });
    if (error) {
      console.error("Gagal menyimpan pesan kontak:", error.message);
      return { galat: "Pesan gagal terkirim. Silakan coba lagi sebentar lagi." };
    }

    revalidatePath("/admin/kontak");
    return { ok: true };
  } catch (e) {
    console.error("Galat kirim pesan kontak:", e);
    return { galat: "Pesan gagal terkirim. Silakan coba lagi sebentar lagi." };
  }
}

/** Menandai pesan sudah dibaca / selesai, plus catatan pengurus. */
export async function ubahStatusPesan(
  id: string,
  status: "baru" | "dibaca" | "selesai",
  catatan?: string,
): Promise<HasilKontak> {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };
  const berhak = pengguna.peran.some((p) =>
    ["super_admin", "ketua", "wakil_ketua", "sekretaris"].includes(p),
  );
  if (!berhak) return { galat: "Anda tidak berwenang mengubah pesan." };

  const sb = await klienServer();
  const ubah: Record<string, unknown> = { status };
  if (catatan !== undefined) ubah.catatan = catatan.trim().slice(0, 1000) || null;
  if (status !== "baru") {
    ubah.dibaca_oleh = pengguna.id;
    ubah.dibaca_pada = new Date().toISOString();
  }

  const { error } = await sb.from("contact_messages").update(ubah).eq("id", id);
  if (error) return { galat: "Gagal menyimpan: " + error.message };

  revalidatePath("/admin/kontak");
  revalidatePath("/admin");
  return { ok: true };
}

/** Menghapus pesan (hanya Super Admin). */
export async function hapusPesan(id: string): Promise<HasilKontak> {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };
  if (!pengguna.peran.includes("super_admin")) {
    return { galat: "Hanya Super Admin yang dapat menghapus pesan." };
  }

  const sb = await klienServer();
  const { error } = await sb.from("contact_messages").delete().eq("id", id);
  if (error) return { galat: "Gagal menghapus: " + error.message };

  revalidatePath("/admin/kontak");
  return { ok: true };
}

/** Menyimpan daftar penerima email pesan masuk (pengiriman email menyusul). */
export async function simpanPenerima(
  daftar: { email: string; nama?: string; aktif?: boolean }[],
): Promise<HasilKontak> {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) return { galat: "Sesi Anda sudah berakhir." };
  if (!pengguna.peran.includes("super_admin")) {
    return { galat: "Hanya Super Admin yang dapat mengubah daftar penerima." };
  }

  const bersih = daftar
    .map((d) => ({
      email: (d.email ?? "").trim().toLowerCase(),
      nama: (d.nama ?? "").trim().slice(0, 120) || null,
      aktif: d.aktif !== false,
    }))
    .filter((d) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email));

  const sb = await klienServer();
  await sb.from("contact_recipients").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (bersih.length > 0) {
    const { error } = await sb.from("contact_recipients").insert(bersih);
    if (error) return { galat: "Gagal menyimpan daftar penerima: " + error.message };
  }

  revalidatePath("/admin/kontak");
  return { ok: true };
}
