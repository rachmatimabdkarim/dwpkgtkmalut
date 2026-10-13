import { APP_NAME } from "./peran";

/** Data pengguna yang sedang masuk (diambil dari database). */
export type SesiPengguna = {
  id: string;
  nama: string;
  email: string;
  /**
   * Bidang pengguna (mis. "Bidang Pendidikan").
   * Kosong bila ia Pengurus Harian atau tidak terdaftar di susunan pengurus —
   * dalam hal ini ia bebas memilih bidang saat mengajukan kegiatan.
   */
  bidang?: string | null;
  peran: (
    | "super_admin"
    | "ketua"
    | "wakil_ketua"
    | "sekretaris"
    | "bendahara"
    | "ketua_seksi"
    | "pengurus"
    | "editor"
  )[];
  jabatan: string;
};

export const JUDUL_APLIKASI = APP_NAME;
