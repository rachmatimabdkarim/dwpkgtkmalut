export const APP_NAME = "Sistem Informasi DWP";
export const APP_SUB = "Kantor GTK Malut";
export const ORG_NAME = "Dharma Wanita Persatuan Kantor GTK Provinsi Maluku Utara";

export type RoleKey =
  | "super_admin"
  | "ketua"
  | "wakil_ketua"
  | "sekretaris"
  | "bendahara"
  | "ketua_seksi"
  | "pengurus"
  | "editor";

export const ROLES: Record<RoleKey, { label: string; urutan: number }> = {
  super_admin: { label: "Super Admin", urutan: 0 },
  ketua: { label: "Ketua", urutan: 1 },
  wakil_ketua: { label: "Wakil Ketua", urutan: 2 },
  sekretaris: { label: "Sekretaris", urutan: 3 },
  bendahara: { label: "Bendahara", urutan: 4 },
  ketua_seksi: { label: "Ketua Seksi/Bidang", urutan: 5 },
  pengurus: { label: "Pengurus/Anggota", urutan: 6 },
  editor: { label: "Editor Konten", urutan: 7 },
};

export type MenuKey = "beranda" | "kegiatan" | "konten" | "pengurus" | "pengaturan" | "profil";

export type MenuItem = {
  key: MenuKey;
  label: string;
  href: string;
  ikon:
    | "beranda"
    | "kegiatan"
    | "konten"
    | "pengurus"
    | "pengaturan"
    | "profil";
  peran: RoleKey[] | "semua";
};

/** Sidebar panel admin — maksimal 6 menu, hanya yang relevan per peran. */
export const MENU_ADMIN: MenuItem[] = [
  { key: "beranda", label: "Beranda", href: "/admin", ikon: "beranda", peran: "semua" },
  {
    key: "kegiatan",
    label: "Kegiatan",
    href: "/admin/kegiatan",
    ikon: "kegiatan",
    peran: "semua",
  },
  {
    key: "konten",
    label: "Konten",
    href: "/admin/konten",
    ikon: "konten",
    peran: ["super_admin", "editor"],
  },
  {
    key: "pengurus",
    label: "Pengurus",
    href: "/admin/pengurus",
    ikon: "pengurus",
    peran: ["super_admin", "ketua", "wakil_ketua", "sekretaris"],
  },
  {
    key: "pengaturan",
    label: "Pengaturan",
    href: "/admin/pengaturan",
    ikon: "pengaturan",
    peran: ["super_admin"],
  },
  { key: "profil", label: "Profil", href: "/admin/profil", ikon: "profil", peran: "semua" },
];

/** Menu atas web publik — hanya 5. Unduhan & Kontak ada di footer. */
export const MENU_PUBLIK = [
  { label: "Beranda", href: "/" },
  { label: "Profil", href: "/profil" },
  { label: "Agenda", href: "/agenda" },
  { label: "Berita", href: "/berita" },
  { label: "Galeri", href: "/galeri" },
];

export function bolehAkses(item: MenuItem, peran: RoleKey[]): boolean {
  if (item.peran === "semua") return true;
  return peran.some((p) => (item.peran as RoleKey[]).includes(p));
}

export function labelPeran(peran: RoleKey[]): string {
  if (peran.length === 0) return "-";
  return peran
    .slice()
    .sort((a, b) => ROLES[a].urutan - ROLES[b].urutan)
    .map((p) => ROLES[p].label)
    .join(" · ");
}
