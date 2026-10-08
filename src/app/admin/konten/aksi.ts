"use server";

import { revalidatePath } from "next/cache";
import { klienServer, penggunaSaatIni } from "@/lib/supabase-server";
import { terbitkanBerita, buatSlugUnik } from "@/lib/publikasi";
import type { Peran } from "@/lib/kegiatan";

const PERAN_KONTEN: Peran[] = [
  "super_admin",
  "editor",
  "ketua",
  "wakil_ketua",
  "sekretaris",
];

async function pastikanEditor() {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) {
    throw new Error("Sesi Anda sudah berakhir.");
  }
  const boleh = pengguna.peran.some((p) => PERAN_KONTEN.includes(p as Peran));
  if (!boleh) {
    throw new Error("Anda tidak memiliki hak akses untuk mengelola konten.");
  }
  return pengguna;
}

/** Menyimpan atau memperbarui berita manual */
export async function simpanBerita(data: {
  id?: string;
  judul: string;
  ringkasan?: string;
  isi: string;
  gambar_path?: string | null;
  status?: "draf" | "terbit" | "antrean" | "arsip";
  terbitkan?: boolean;
}) {
  try {
    const pengguna = await pastikanEditor();
    const judul = data.judul.trim();
    if (!judul) return { galat: "Judul berita wajib diisi." };

    const isi = data.isi.trim();
    if (!isi) return { galat: "Isi berita wajib diisi." };

    const ringkasan = (data.ringkasan ?? "").trim() || null;
    const sb = await klienServer();
    const sekarang = new Date().toISOString();

    let targetStatus = data.status ?? "draf";
    let terbitPada: string | null = null;
    let perluTinjauan = false;

    if (data.terbitkan) {
      targetStatus = "terbit";
      terbitPada = sekarang;
      perluTinjauan = false;
    } else if (targetStatus === "terbit") {
      terbitPada = sekarang;
    }

    if (data.id) {
      // Perbarui berita yang sudah ada
      const { data: postAda } = await sb
        .from("posts")
        .select("id, slug, activity_id, sumber")
        .eq("id", data.id)
        .maybeSingle();

      if (!postAda) return { galat: "Berita tidak ditemukan." };

      const slug = await buatSlugUnik(sb, judul, data.id);

      const pembaruan: Record<string, unknown> = {
        judul,
        slug,
        ringkasan,
        isi,
        status: targetStatus,
        perlu_tinjauan: perluTinjauan,
        diperbarui_pada: sekarang,
      };

      if (data.gambar_path !== undefined) {
        pembaruan.gambar_path = data.gambar_path;
      }
      if (terbitPada) {
        pembaruan.terbit_pada = terbitPada;
      }

      const { error } = await sb.from("posts").update(pembaruan).eq("id", data.id);
      if (error) return { galat: "Gagal menyimpan perubahan: " + error.message };

      if (postAda.activity_id) {
        await sb.from("activity_logs").insert({
          activity_id: postAda.activity_id,
          aksi: "ubah_berita",
          keterangan: `Berita diperbarui oleh ${pengguna.nama}`,
          pelaku_id: pengguna.id,
          pelaku_nama: pengguna.nama,
        });
      }

      revalidatePath("/admin/konten");
      revalidatePath("/berita");
      revalidatePath("/");
      return { ok: true, id: data.id };
    } else {
      // Buat berita baru manual
      const slug = await buatSlugUnik(sb, judul);

      const { data: postBaru, error } = await sb
        .from("posts")
        .insert({
          judul,
          slug,
          ringkasan,
          isi,
          sumber: "manual",
          gambar_path: data.gambar_path || null,
          status: targetStatus,
          perlu_tinjauan: false,
          terbit_pada: terbitPada,
          dibuat_oleh: pengguna.id,
        })
        .select("id")
        .single();

      if (error) return { galat: "Gagal membuat berita baru: " + error.message };

      revalidatePath("/admin/konten");
      revalidatePath("/berita");
      revalidatePath("/");
      return { ok: true, id: postBaru.id };
    }
  } catch (err: unknown) {
    return { galat: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Menerbitkan berita */
export async function aksiTerbitkanBerita(postId: string) {
  try {
    await pastikanEditor();
    return await terbitkanBerita(postId);
  } catch (err: unknown) {
    return { galat: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Menarik berita yang terbit kembali ke status draf */
export async function aksiTarikBerita(postId: string) {
  try {
    const pengguna = await pastikanEditor();
    const sb = await klienServer();

    const { data: pos } = await sb
      .from("posts")
      .select("id, judul, activity_id")
      .eq("id", postId)
      .maybeSingle();

    if (!pos) return { galat: "Berita tidak ditemukan." };

    const { error } = await sb
      .from("posts")
      .update({
        status: "draf",
        perlu_tinjauan: false,
        diperbarui_pada: new Date().toISOString(),
      })
      .eq("id", postId);

    if (error) return { galat: "Gagal menarik berita: " + error.message };

    if (pos.activity_id) {
      await sb.from("activity_logs").insert({
        activity_id: pos.activity_id,
        aksi: "tarik_berita",
        keterangan: `Berita "${pos.judul}" ditarik dari web publik ke status draf`,
        pelaku_id: pengguna.id,
        pelaku_nama: pengguna.nama,
      });
    }

    revalidatePath("/admin/konten");
    revalidatePath("/berita");
    revalidatePath("/");
    return { ok: true };
  } catch (err: unknown) {
    return { galat: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Menghapus berita secara permanen */
export async function aksiHapusBerita(postId: string) {
  try {
    const pengguna = await pastikanEditor();
    const sb = await klienServer();

    const { data: pos } = await sb
      .from("posts")
      .select("id, judul, activity_id")
      .eq("id", postId)
      .maybeSingle();

    if (!pos) return { galat: "Berita tidak ditemukan." };

    const { error } = await sb.from("posts").delete().eq("id", postId);
    if (error) return { galat: "Gagal menghapus berita: " + error.message };

    if (pos.activity_id) {
      await sb.from("activity_logs").insert({
        activity_id: pos.activity_id,
        aksi: "hapus_berita",
        keterangan: `Berita "${pos.judul}" dihapus oleh ${pengguna.nama}`,
        pelaku_id: pengguna.id,
        pelaku_nama: pengguna.nama,
      });
    }

    revalidatePath("/admin/konten");
    revalidatePath("/berita");
    revalidatePath("/");
    return { ok: true };
  } catch (err: unknown) {
    return { galat: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Menolak berita otomatis di antrean (status diubah jadi draf) */
export async function aksiTolakAntrean(postId: string, alasan?: string) {
  try {
    const pengguna = await pastikanEditor();
    const sb = await klienServer();

    const { data: pos } = await sb
      .from("posts")
      .select("id, judul, activity_id")
      .eq("id", postId)
      .maybeSingle();

    if (!pos) return { galat: "Berita tidak ditemukan." };

    const { error } = await sb
      .from("posts")
      .update({
        status: "draf",
        perlu_tinjauan: false,
        diperbarui_pada: new Date().toISOString(),
      })
      .eq("id", postId);

    if (error) return { galat: "Gagal menolak berita: " + error.message };

    if (pos.activity_id) {
      const ket = `Berita otomatis ditolak oleh Editor (dijadikan draf)` + (alasan?.trim() ? `: ${alasan.trim()}` : "");
      await sb.from("activity_logs").insert({
        activity_id: pos.activity_id,
        aksi: "tolak_berita",
        keterangan: ket,
        pelaku_id: pengguna.id,
        pelaku_nama: pengguna.nama,
      });
    }

    revalidatePath("/admin/konten");
    revalidatePath("/berita");
    revalidatePath("/");
    return { ok: true };
  } catch (err: unknown) {
    return { galat: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Menyunting berita otomatis dari antrean sebelum diterbitkan */
export async function aksiSuntingAntrean(
  postId: string,
  data: {
    judul: string;
    ringkasan: string;
    isi: string;
    terbitkan?: boolean;
  },
) {
  try {
    const pengguna = await pastikanEditor();
    const sb = await klienServer();
    const sekarang = new Date().toISOString();

    const { data: pos } = await sb
      .from("posts")
      .select("id, activity_id")
      .eq("id", postId)
      .maybeSingle();

    if (!pos) return { galat: "Berita tidak ditemukan." };

    const judul = data.judul.trim();
    if (!judul) return { galat: "Judul wajib diisi." };

    const isi = data.isi.trim();
    if (!isi) return { galat: "Isi wajib diisi." };

    const slug = await buatSlugUnik(sb, judul, postId);

    const targetStatus = data.terbitkan ? "terbit" : "antrean";
    const targetPerluTinjauan = !data.terbitkan;
    const targetTerbitPada = data.terbitkan ? sekarang : null;

    const { error } = await sb
      .from("posts")
      .update({
        judul,
        slug,
        ringkasan: data.ringkasan.trim() || null,
        isi,
        status: targetStatus,
        perlu_tinjauan: targetPerluTinjauan,
        terbit_pada: targetTerbitPada,
        diperbarui_pada: sekarang,
      })
      .eq("id", postId);

    if (error) return { galat: "Gagal menyimpan perubahan: " + error.message };

    if (pos.activity_id) {
      await sb.from("activity_logs").insert({
        activity_id: pos.activity_id,
        aksi: data.terbitkan ? "terbitkan_berita" : "sunting_berita",
        keterangan: data.terbitkan
          ? `Berita disunting dan diterbitkan oleh ${pengguna.nama}`
          : `Berita di antrean disunting oleh ${pengguna.nama}`,
        pelaku_id: pengguna.id,
        pelaku_nama: pengguna.nama,
      });
    }

    revalidatePath("/admin/konten");
    revalidatePath("/berita");
    revalidatePath("/");
    return { ok: true };
  } catch (err: unknown) {
    return { galat: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Menyimpan keterangan foto galeri */
export async function aksiSimpanKeteranganGaleri(attachmentId: string, keterangan: string) {
  try {
    const pengguna = await pastikanEditor();
    const sb = await klienServer();

    const { data: berkas } = await sb
      .from("attachments")
      .select("id, entitas, entitas_id, nama_asli")
      .eq("id", attachmentId)
      .maybeSingle();

    if (!berkas) return { galat: "Foto tidak ditemukan." };

    const { error } = await sb
      .from("attachments")
      .update({ keterangan: keterangan.trim() || null })
      .eq("id", attachmentId);

    if (error) return { galat: "Gagal menyimpan keterangan foto: " + error.message };

    if (berkas.entitas === "activities" && berkas.entitas_id) {
      await sb.from("activity_logs").insert({
        activity_id: berkas.entitas_id,
        aksi: "ubah_keterangan_foto",
        keterangan: `Keterangan foto "${berkas.nama_asli}" diperbarui di galeri`,
        pelaku_id: pengguna.id,
        pelaku_nama: pengguna.nama,
      });
    }

    revalidatePath("/admin/konten");
    revalidatePath("/galeri");
    revalidatePath("/");
    return { ok: true };
  } catch (err: unknown) {
    return { galat: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Mencabut tanda publik dari foto (visibilitas jadi privat) */
export async function aksiCabutPublikGaleri(attachmentId: string) {
  try {
    const pengguna = await pastikanEditor();
    const sb = await klienServer();

    const { data: berkas } = await sb
      .from("attachments")
      .select("id, entitas, entitas_id, nama_asli")
      .eq("id", attachmentId)
      .maybeSingle();

    if (!berkas) return { galat: "Foto tidak ditemukan." };

    const { error } = await sb
      .from("attachments")
      .update({ visibilitas: "privat" })
      .eq("id", attachmentId);

    if (error) return { galat: "Gagal mencabut tanda publik: " + error.message };

    if (berkas.entitas === "activities" && berkas.entitas_id) {
      await sb.from("activity_logs").insert({
        activity_id: berkas.entitas_id,
        aksi: "cabut_publik_foto",
        keterangan: `Foto "${berkas.nama_asli}" dicabut dari tampilan web publik oleh ${pengguna.nama}`,
        pelaku_id: pengguna.id,
        pelaku_nama: pengguna.nama,
      });
    }

    revalidatePath("/admin/konten");
    revalidatePath("/galeri");
    revalidatePath("/");
    return { ok: true };
  } catch (err: unknown) {
    return { galat: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Menyimpan dokumen baru yang siap diunduh publik */
export async function aksiSimpanDokumen(data: {
  judul: string;
  keterangan?: string;
  path: string;
  ukuranByte?: number;
  jenis?: "pdf" | "gambar" | "lain";
}) {
  try {
    const pengguna = await pastikanEditor();
    const judul = data.judul.trim();
    if (!judul) return { galat: "Judul dokumen wajib diisi." };
    if (!data.path.trim()) return { galat: "Berkas dokumen belum diunggah." };

    const sb = await klienServer();
    const { data: baris, error } = await sb
      .from("documents")
      .insert({
        judul,
        keterangan: data.keterangan?.trim() || null,
        path: data.path.trim(),
        ukuran_byte: data.ukuranByte || 0,
        jenis: data.jenis || "pdf",
        published: true,
        diunggah_oleh: pengguna.id,
      })
      .select("id")
      .single();

    if (error) return { galat: "Gagal menyimpan dokumen: " + error.message };

    revalidatePath("/admin/konten");
    revalidatePath("/unduhan");
    return { ok: true, id: baris.id };
  } catch (err: unknown) {
    return { galat: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Memperbarui keterangan dokumen */
export async function aksiUbahKeteranganDokumen(id: string, keterangan: string) {
  try {
    await pastikanEditor();
    const sb = await klienServer();

    const { error } = await sb
      .from("documents")
      .update({ keterangan: keterangan.trim() || null })
      .eq("id", id);

    if (error) return { galat: "Gagal memperbarui keterangan: " + error.message };

    revalidatePath("/admin/konten");
    revalidatePath("/unduhan");
    return { ok: true };
  } catch (err: unknown) {
    return { galat: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Mengubah visibilitas dokumen (sembunyikan / tampilkan di publik) */
export async function aksiUbahStatusDokumen(id: string, published: boolean) {
  try {
    await pastikanEditor();
    const sb = await klienServer();

    const { error } = await sb
      .from("documents")
      .update({ published })
      .eq("id", id);

    if (error) return { galat: "Gagal mengubah status: " + error.message };

    revalidatePath("/admin/konten");
    revalidatePath("/unduhan");
    return { ok: true };
  } catch (err: unknown) {
    return { galat: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

/** Menghapus dokumen publik beserta berkas fisiknya di storage */
export async function aksiHapusDokumen(id: string) {
  try {
    await pastikanEditor();
    const sb = await klienServer();

    const { data: doc } = await sb
      .from("documents")
      .select("id, path")
      .eq("id", id)
      .maybeSingle();

    if (!doc) return { galat: "Dokumen tidak ditemukan." };

    // Hapus baris dari tabel documents
    const { error: gagalHapusDb } = await sb.from("documents").delete().eq("id", id);
    if (gagalHapusDb) return { galat: "Gagal menghapus data dokumen: " + gagalHapusDb.message };

    // Hapus berkas dari storage publik jika ada
    if (doc.path) {
      await sb.storage.from("publik").remove([doc.path]);
    }

    revalidatePath("/admin/konten");
    revalidatePath("/unduhan");
    return { ok: true };
  } catch (err: unknown) {
    return { galat: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

