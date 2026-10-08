import { APP_NAME } from "./peran";

/** Data pengguna yang sedang masuk (diambil dari database). */
export type SesiPengguna = {
  id: string;
  nama: string;
  email: string;
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
