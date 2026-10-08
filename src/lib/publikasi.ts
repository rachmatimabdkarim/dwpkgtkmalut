import { revalidatePath } from "next/cache";
import { klienServer, penggunaSaatIni } from "@/lib/supabase-server";

export type HasilRacik = {
  ok: boolean;
  status: "terbit" | "antrean" | "dilewati" | "galat";
  postId?: string;
  alasan?: string;
  galat?: string;
};

/** Mengubah judul menjadi slug huruf kecil tanpa tanda baca */
export function bersihkanSlug(teks: string): string {
  const hasil = teks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return hasil || "berita";
}

/** Menghasilkan slug unik di tabel posts */
export async function buatSlugUnik(
  sb: Awaited<ReturnType<typeof klienServer>>,
  judul: string,
  abaikanPostId?: string,
): Promise<string> {
  const dasar = bersihkanSlug(judul);
  let kandidat = dasar;
  let counter = 1;

  while (true) {
    let kueri = sb.from("posts").select("id").eq("slug", kandidat);
    if (abaikanPostId) {
      kueri = kueri.neq("id", abaikanPostId);
    }
    const { data } = await kueri.maybeSingle();
    if (!data) return kandidat;
    counter++;
    kandidat = `${dasar}-${counter}`;
  }
}

/** Mengambil 1–2 kalimat pertama dari teks */
export function ambilSatuDuaKalimat(teks: string | null | undefined): string {
  if (!teks) return "";
  const dibersihkan = teks.trim();
  const cocok = dibersihkan.match(/[^.!?]+[.!?]+(\s|$)/g);
  if (cocok && cocok.length > 0) {
    return cocok.slice(0, 2).join("").trim();
  }
  if (dibersihkan.length > 250) {
    return dibersihkan.slice(0, 250).trim() + "…";
  }
  return dibersihkan;
}

/** Menghilangkan tanda bahaya HTML (<, >, &) */
export function amankanHtml(teks: string): string {
  return teks
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Mesin Publikasi Otomatis:
 * Meracik draf berita atau langsung menerbitkan kegiatan setelah laporan disetujui.
 */
export async function racikBeritaOtomatis(activityId: string): Promise<HasilRacik> {
  const sb = await klienServer();

  // 1. Ambil kegiatan
  const { data: keg, error: errKeg } = await sb
    .from("activities")
    .select("id, judul, ringkasan, publish_mode, is_hidden, dibuat_oleh")
    .eq("id", activityId)
    .maybeSingle();

  if (errKeg || !keg) {
    return { ok: false, status: "galat", galat: "Kegiatan tidak ditemukan." };
  }

  // Kegiatan dengan is_hidden = true -> JANGAN buat berita
  if (keg.is_hidden) {
    return {
      ok: true,
      status: "dilewati",
      alasan: "Kegiatan ditandai tersembunyi dari publik.",
    };
  }

  // publish_mode = manual -> tidak membuat apa pun
  if (keg.publish_mode === "manual") {
    return {
      ok: true,
      status: "dilewati",
      alasan: "Mode publikasi disetel manual.",
    };
  }

  // 2. Ambil laporan kegiatan
  const { data: laporan } = await sb
    .from("activity_reports")
    .select("ringkasan, hasil, kendala, rekomendasi")
    .eq("activity_id", activityId)
    .maybeSingle();

  // 3. Ambil foto publik pertama kegiatan
  const { data: fotoPublik } = await sb
    .from("attachments")
    .select("path")
    .eq("bucket", "publik")
    .eq("status", "resmi")
    .eq("visibilitas", "publik")
    .eq("entitas_id", activityId)
    .order("diunggah_pada", { ascending: true })
    .limit(1);

  const gambarPath = fotoPublik && fotoPublik.length > 0 ? fotoPublik[0].path : null;

  // 4. Rakit konten berita
  const judul = keg.judul;
  const ringkasanLaporan = laporan?.ringkasan ?? keg.ringkasan ?? "";
  const ringkasan = ambilSatuDuaKalimat(ringkasanLaporan) || judul;

  const paragraf: string[] = [];
  if (laporan?.ringkasan?.trim()) paragraf.push(amankanHtml(laporan.ringkasan.trim()));
  if (laporan?.hasil?.trim()) paragraf.push(amankanHtml(laporan.hasil.trim()));
  if (laporan?.rekomendasi?.trim()) paragraf.push(amankanHtml(laporan.rekomendasi.trim()));

  const isi = paragraf.length > 0 ? paragraf.join("\n\n") : amankanHtml(ringkasan);

  // 5. Tentukan status
  const targetStatus = keg.publish_mode === "otomatis_penuh" ? "terbit" : "antrean";
  const targetPerluTinjauan = targetStatus === "antrean";
  const targetTerbitPada = targetStatus === "terbit" ? new Date().toISOString() : null;

  // 6. Cek apakah sudah ada berita untuk kegiatan ini
  const { data: postAda } = await sb
    .from("posts")
    .select("id, status, sumber, slug")
    .eq("activity_id", activityId)
    .maybeSingle();

  if (postAda) {
    // Jangan timpa berita yang sudah diubah Editor (manual atau sudah terbit)
    if (postAda.sumber === "manual" || postAda.status === "terbit") {
      return {
        ok: true,
        status: "dilewati",
        postId: postAda.id,
        alasan: "Berita sudah ada atau telah disunting/diterbitkan oleh Editor.",
      };
    }

    // Perbarui berita yang ada di antrean
    const { error: errUpdate } = await sb
      .from("posts")
      .update({
        judul,
        ringkasan,
        isi,
        gambar_path: gambarPath,
        status: targetStatus,
        perlu_tinjauan: targetPerluTinjauan,
        terbit_pada: targetTerbitPada,
        diperbarui_pada: new Date().toISOString(),
      })
      .eq("id", postAda.id);

    if (errUpdate) {
      return { ok: false, status: "galat", galat: errUpdate.message };
    }

    revalidatePath("/admin/konten");
    revalidatePath("/berita");
    revalidatePath("/");
    return { ok: true, status: targetStatus, postId: postAda.id };
  }

  // 7. Buat berita baru
  const slug = await buatSlugUnik(sb, judul);
  const { data: postBaru, error: errInsert } = await sb
    .from("posts")
    .insert({
      judul,
      slug,
      ringkasan,
      isi,
      sumber: "otomatis",
      activity_id: activityId,
      gambar_path: gambarPath,
      status: targetStatus,
      perlu_tinjauan: targetPerluTinjauan,
      terbit_pada: targetTerbitPada,
      dibuat_oleh: keg.dibuat_oleh ?? null,
    })
    .select("id")
    .single();

  if (errInsert) {
    return { ok: false, status: "galat", galat: errInsert.message };
  }

  revalidatePath("/admin/konten");
  revalidatePath("/berita");
  revalidatePath("/");
  return { ok: true, status: targetStatus, postId: postBaru?.id };
}

/** Menerbitkan berita ke web publik */
export async function terbitkanBerita(postId: string) {
  const sb = await klienServer();
  const sekarang = new Date().toISOString();

  const { data: pos } = await sb
    .from("posts")
    .select("id, judul, activity_id")
    .eq("id", postId)
    .maybeSingle();

  if (!pos) return { galat: "Berita tidak ditemukan." };

  const { error } = await sb
    .from("posts")
    .update({
      status: "terbit",
      perlu_tinjauan: false,
      terbit_pada: sekarang,
      diperbarui_pada: sekarang,
    })
    .eq("id", postId);

  if (error) return { galat: "Gagal menerbitkan berita: " + error.message };

  if (pos.activity_id) {
    const pengguna = await penggunaSaatIni();
    await sb.from("activity_logs").insert({
      activity_id: pos.activity_id,
      aksi: "terbitkan_berita",
      keterangan: `Berita "${pos.judul}" diterbitkan ke web publik`,
      pelaku_id: pengguna?.id ?? null,
      pelaku_nama: pengguna?.nama ?? "Editor",
    });
  }

  revalidatePath("/admin/konten");
  revalidatePath("/berita");
  revalidatePath("/");
  return { ok: true };
}

/** Mengembalikan status berita ke antrean tinjauan */
export async function kembalikanKeAntrean(postId: string) {
  const sb = await klienServer();
  const sekarang = new Date().toISOString();

  const { data: pos } = await sb
    .from("posts")
    .select("id, judul, activity_id")
    .eq("id", postId)
    .maybeSingle();

  if (!pos) return { galat: "Berita tidak ditemukan." };

  const { error } = await sb
    .from("posts")
    .update({
      status: "antrean",
      perlu_tinjauan: true,
      diperbarui_pada: sekarang,
    })
    .eq("id", postId);

  if (error) return { galat: "Gagal mengembalikan berita ke antrean: " + error.message };

  if (pos.activity_id) {
    const pengguna = await penggunaSaatIni();
    await sb.from("activity_logs").insert({
      activity_id: pos.activity_id,
      aksi: "kembalikan_ke_antrean",
      keterangan: `Berita "${pos.judul}" dikembalikan ke antrean tinjauan`,
      pelaku_id: pengguna?.id ?? null,
      pelaku_nama: pengguna?.nama ?? "Editor",
    });
  }

  revalidatePath("/admin/konten");
  revalidatePath("/berita");
  revalidatePath("/");
  return { ok: true };
}
