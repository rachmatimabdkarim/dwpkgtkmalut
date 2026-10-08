import type { NadaStatus } from "@/components/dasar";
import type { RoleKey } from "./peran";

/**
 * DATA CONTOH — hanya untuk melihat tampilan sebelum database tersambung.
 * Seluruh isi berkas ini dihapus saat data diambil dari database.
 */

export type PerluTindakan = {
  id: string;
  judul: string;
  tahap: string;
  keterangan: string;
  statusLencana: string;
  nada: NadaStatus;
  aksi: string;
  untukPeran: RoleKey[];
};

export function daftarPerluTindakan(peran: RoleKey[]): PerluTindakan[] {
  const semua: PerluTindakan[] = [
    {
      id: "t1",
      judul: "Pelatihan Literasi Digital bagi Anggota DWP",
      tahap: "Perencanaan",
      keterangan: "Menunggu persetujuan Sekretaris",
      statusLencana: "Menunggu",
      nada: "warn",
      aksi: "Tinjau",
      untukPeran: ["sekretaris", "super_admin"],
    },
    {
      id: "t2",
      judul: "Pelatihan Literasi Digital bagi Anggota DWP",
      tahap: "Perencanaan",
      keterangan: "Menunggu pemeriksaan anggaran oleh Bendahara",
      statusLencana: "Menunggu",
      nada: "warn",
      aksi: "Tinjau",
      untukPeran: ["bendahara", "super_admin", "ketua_seksi"],
    },
    {
      id: "t3",
      judul: "Berita: Peringatan Hari Ibu DWP GTK Malut",
      tahap: "Konten",
      keterangan: "Menunggu tinjauan Editor sebelum terbit",
      statusLencana: "Antrean",
      nada: "brand",
      aksi: "Tinjau",
      untukPeran: ["editor", "super_admin", "pengurus"],
    },
  ];
  return semua.filter((s) => s.untukPeran.some((p) => peran.includes(p))).slice(0, 3);
}

export type KegiatanRingkas = {
  id: string;
  judul: string;
  tanggal: string;
  tempat: string;
  status: string;
  nada: NadaStatus;
  tahap: "Perencanaan" | "Pelaksanaan" | "Pelaporan";
};

export function kegiatanMendatang(): KegiatanRingkas[] {
  return daftarKegiatanContoh().slice(0, 3);
}

export function daftarKegiatanContoh(): KegiatanRingkas[] {
  return [
    {
      id: "k1",
      judul: "Rapat Rutin Pengurus DWP",
      tanggal: "Rabu, 14 Okt 2026",
      tempat: "Aula Kantor GTK Malut, Tidore",
      status: "Berjalan",
      nada: "brand",
      tahap: "Pelaksanaan",
    },
    {
      id: "k2",
      judul: "Pelatihan Literasi Digital bagi Anggota DWP",
      tanggal: "Selasa, 20 Okt 2026",
      tempat: "Ternate",
      status: "Menunggu review",
      nada: "warn",
      tahap: "Perencanaan",
    },
    {
      id: "k3",
      judul: "Bakti Sosial Bulan Peduli",
      tanggal: "Kamis, 05 Nov 2026",
      tempat: "Kel. Rum, Tidore Utara",
      status: "Draf",
      nada: "netral",
      tahap: "Perencanaan",
    },
    {
      id: "k4",
      judul: "Peringatan Hari Ibu DWP GTK Malut",
      tanggal: "Senin, 22 Des 2026",
      tempat: "Ternate",
      status: "Selesai",
      nada: "ok",
      tahap: "Pelaporan",
    },
    {
      id: "k5",
      judul: "Pembinaan Kelompok Wanita Tani",
      tanggal: "Selasa, 06 Okt 2026",
      tempat: "Tidore",
      status: "Ditolak",
      nada: "bad",
      tahap: "Perencanaan",
    },
  ];
}
