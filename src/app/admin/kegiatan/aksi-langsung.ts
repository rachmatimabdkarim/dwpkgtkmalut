"use server";

/**
 * AKSI: LAPORAN KEGIATAN LANGSUNG
 *
 * Jalur pintas untuk kegiatan yang TIDAK perlu direncanakan lebih dulu:
 *   • kegiatan pusat / undangan yang diikuti Ketua atau anggota
 *   • kegiatan lama sebelum sistem ini ada
 *
 * Aturan pemilik:
 *   1. Yang boleh mencatat: SEKRETARIS dan KETUA BIDANG.
 *   2. Ketua memvalidasi sebelum tayang di web publik.
 *   3. Berita yang terbit tertanggal sesuai TANGGAL KEGIATAN — bukan tanggal
 *      entri. Karena itu `posts.terbit_pada` diisi tanggal kegiatan, sedangkan
 *      `posts.dicatat_pada` diisi waktu sebenarnya (dipakai penanda "baru dicatat").
 */

import { revalidatePath } from "next/cache";
import { klienServer, penggunaSaatIni } from "@/lib/supabase-server";
import { klienAdmin } from "@/lib/supabase-admin";
import { nomorKegiatanLangsung } from "@/lib/nomor-langsung";
import { PERAN_PENCATAT_LANGSUNG } from "@/lib/peran";
import { bersihkanCacheTema } from "@/lib/pengaturan";

export type HasilCatat = { sukses: boolean; pesan: string; kegiatanId?: string };

function izinMencatat(peran: string[]): boolean {
  return peran.some((p) => (PERAN_PENCATAT_LANGSUNG as readonly string[]).includes(p));
}

function teks(v: FormDataEntryValue | null, wajib = false): string {
  const s = String(v ?? "").trim();
  if (wajib && !s) throw new Error("Kolom wajib belum diisi.");
  return s;
}

function slugDari(judul: string): string {
  const dasar = judul
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return `${dasar || "kegiatan"}-${Date.now().toString(36).slice(-4)}`;
}

export async function catatKegiatanLangsung(form: FormData): Promise<HasilCatat> {
  try {
    const pengguna = await penggunaSaatIni();
    if (!pengguna) return { sukses: false, pesan: "Sesi Anda sudah berakhir. Silakan masuk kembali." };
    if (!izinMencatat(pengguna.peran)) {
      return {
        sukses: false,
        pesan: "Hanya Sekretaris dan Ketua Bidang yang dapat mencatat laporan kegiatan langsung.",
      };
    }

    const sb = await klienServer();

    const judul = teks(form.get("judul"), true);
    const asal = teks(form.get("asal")) || "dwp";
    const tanggalMulai = teks(form.get("tanggalMulai"), true);
    const tanggalSelesai = teks(form.get("tanggalSelesai")) || tanggalMulai;
    const tempat = teks(form.get("tempat"));
    const tujuan = teks(form.get("uraian"));
    const hasil = teks(form.get("hasil"));
    const peserta = teks(form.get("peserta"));
    const bidangId = teks(form.get("bidang"));
    const realisasi = Number(teks(form.get("realisasi")).replace(/[^0-9]/g, "") || "0");

    // Tanggal kegiatan tidak boleh di masa depan: ini laporan kegiatan yang
    // SUDAH terlaksana.
    const hariIni = new Date().toISOString().slice(0, 10);
    if (tanggalMulai > hariIni) {
      return { sukses: false, pesan: "Tanggal kegiatan tidak boleh melewati hari ini — ini laporan kegiatan yang sudah terlaksana." };
    }

    const periode = await sb
      .from("periods")
      .select("id")
      .eq("aktif", true)
      .maybeSingle<{ id: string }>();

    const kode = await nomorKegiatanLangsung(sb, tanggalMulai);

    const { data: dibuat, error } = await sb
      .from("activities")
      .insert({
        kode,
        judul,
        tujuan,
        sasaran: peserta,
        ringkasan: hasil || tujuan,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        tempat: tempat || null,
        section_id: bidangId || null,
        penanggung_jawab: pengguna.id,
        dibuat_oleh: pengguna.id,
        periode_id: periode.data?.id ?? null,
        // Status 'laporan_disetujui' = isi laporan sudah siap; tetapi TAYANG
        // menunggu validasi Ketua (dijaga oleh view publik).
        status: "laporan_disetujui",
        publish_mode: "manual",
        jenis_catatan: "langsung",
        asal_kegiatan: asal,
        peserta_luar: peserta || null,
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !dibuat) {
      return { sukses: false, pesan: "Gagal menyimpan: " + (error?.message ?? "tidak ada jawaban") };
    }

    // Anggaran (opsional): satu baris realisasi sederhana.
    if (realisasi > 0) {
      await sb.from("budget_items").insert({
        activity_id: dibuat.id,
        uraian: "Realisasi biaya kegiatan",
        jumlah: 1,
        satuan: "paket",
        harga_satuan: realisasi,
        realisasi: realisasi,
      });
    }

    await sb.from("activity_logs").insert({
      activity_id: dibuat.id,
      aksi: "catat_kegiatan_langsung",
      keterangan: `Mencatat laporan kegiatan langsung (${asal === "pusat" ? "kegiatan pusat/undangan" : "kegiatan DWP"}) tertanggal ${tanggalMulai}. Menunggu validasi Ketua.`,
      pelaku_id: pengguna.id,
      pelaku_nama: pengguna.nama,
    });

    // ---- Publikasi berita (draft, menunggu validasi Ketua) ----
    const mauTerbit = String(form.get("terbitkan") ?? "ya") === "ya";
    if (mauTerbit) {
      const admin = klienAdmin();
      const { error: gErr } = await admin.from("posts").insert({
        judul,
        slug: slugDari(judul),
        ringkasan: hasil || tujuan || judul,
        isi: [tujuan, hasil].filter(Boolean).join("\n\n"),
        sumber: "otomatis",
        activity_id: dibuat.id,
        status: "draf", // terbit setelah validasi Ketua
        terbit_pada: new Date(`${tanggalMulai}T00:00:00Z`).toISOString(),
        dicatat_pada: new Date().toISOString(),
        dibuat_oleh: pengguna.id,
      });
      if (gErr) {
        return {
          sukses: false,
          pesan: "Kegiatan tersimpan, tetapi berita gagal disiapkan: " + gErr.message,
          kegiatanId: dibuat.id,
        };
      }
    }

    revalidatePath("/admin/kegiatan");
    revalidatePath("/admin/berita");
    bersihkanCacheTema();

    return {
      sukses: true,
      pesan: mauTerbit
        ? "Laporan tersimpan. Berita sudah disiapkan dan akan tayang setelah Ketua memvalidasi."
        : "Laporan tersimpan. Berita tidak diterbitkan (hanya tersimpan sebagai catatan).",
      kegiatanId: dibuat.id,
    };
  } catch (e) {
    return { sukses: false, pesan: e instanceof Error ? e.message : "Terjadi kesalahan." };
  }
}

/**
 * Validasi oleh Ketua: laporan langsung boleh tayang, dan beritanya diterbitkan.
 * Tanggal terbit TETAP tanggal kegiatan (tidak diubah di sini).
 */
export async function validasiKegiatanLangsung(activityId: string): Promise<HasilCatat> {
  try {
    const pengguna = await penggunaSaatIni();
    if (!pengguna) return { sukses: false, pesan: "Sesi Anda sudah berakhir." };
    if (!pengguna.peran.includes("ketua") && !pengguna.peran.includes("super_admin")) {
      return { sukses: false, pesan: "Hanya Ketua yang dapat memvalidasi laporan kegiatan." };
    }

    const sb = await klienServer();
    const { error } = await sb.rpc("validasi_kegiatan_langsung", { p_activity: activityId });
    if (error) return { sukses: false, pesan: "Gagal memvalidasi: " + error.message };

    // Terbitkan berita yang terkait (tetap tertanggal tanggal kegiatan).
    const admin = klienAdmin();
    await admin
      .from("posts")
      .update({ status: "terbit" })
      .eq("activity_id", activityId)
      .eq("status", "draf");

    revalidatePath("/admin/kegiatan");
    revalidatePath("/admin/berita");
    revalidatePath("/", "layout");
    bersihkanCacheTema();

    return { sukses: true, pesan: "Laporan divalidasi. Kegiatan dan beritanya sudah tayang di web publik." };
  } catch (e) {
    return { sukses: false, pesan: e instanceof Error ? e.message : "Terjadi kesalahan." };
  }
}
