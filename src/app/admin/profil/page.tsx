import Link from "next/link";
import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajib } from "@/lib/sesi-server";
import { Kartu, JudulSeksi, Lencana } from "@/components/dasar";
import { FormKataSandi } from "@/components/form-kata-sandi";
import { labelPeran } from "@/lib/peran";

export const metadata = { title: "Profil" };

// Halaman panel: selalu dirender saat diminta (bergantung sesi pengguna).
export const instant = false;

export default async function HalamanProfil() {
  const pengguna = await sesiWajib();

  return (
    <KerangkaAdmin
      pengguna={pengguna}
      judul="Profil"
      aksi={
        <Link
          href="/keluar"
          className="inline-flex h-11 items-center rounded-token border border-n-300 bg-n-0 px-4 text-n-700 hover:bg-n-50"
        >
          Keluar
        </Link>
      }
    >
      <Kartu className="p-4 sm:p-5">
        <JudulSeksi>Akun saya</JudulSeksi>
        <dl className="grid sm:grid-cols-2 gap-4">
          <div>
            <dt className="teks-3 text-n-500">Nama</dt>
            <dd className="text-n-800 font-medium">{pengguna.nama}</dd>
          </div>
          <div>
            <dt className="teks-3 text-n-500">Email</dt>
            <dd className="text-n-800">{pengguna.email}</dd>
          </div>
          <div>
            <dt className="teks-3 text-n-500">Jabatan</dt>
            <dd className="text-n-800">{pengguna.jabatan}</dd>
          </div>
          <div>
            <dt className="teks-3 text-n-500">Peran</dt>
            <dd className="mt-1">
              <Lencana nada="brand">{labelPeran(pengguna.peran)}</Lencana>
            </dd>
          </div>
        </dl>
      </Kartu>

      <p className="teks-3 text-n-500 mt-4">
        Catatan: penggantian foto profil menyusul setelah modul berkas dibangun.
      </p>

      <div className="mt-7">
        <Kartu className="p-4 sm:p-5">
          <JudulSeksi>Ganti kata sandi</JudulSeksi>
          <FormKataSandi />
        </Kartu>
      </div>
    </KerangkaAdmin>
  );
}
