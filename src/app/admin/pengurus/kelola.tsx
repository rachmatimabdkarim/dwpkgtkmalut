"use client";

/**
 * Panel kelola pengurus — SATU daftar saja.
 * Tiap baris punya satu tombol titik tiga berisi: Ubah data, Buatkan akun, Hapus.
 * Tidak ada informasi yang muncul dua kali di layar.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Kartu,
  Isian,
  Pilihan,
  Kolom,
  TombolUtama,
  TombolSekunder,
  Lencana,
  JudulSeksi,
} from "@/components/dasar";
import { KotakUnggah, RingkasanKompresi, type BerkasTerpilih } from "@/components/kotak-unggah";
import { kompresGambar, ukuranTerbaca } from "@/lib/berkas-kompres";
import { klienPeramban } from "@/lib/supabase-peramban";
import {
  tambahPengurus,
  ubahPengurus,
  hapusPengurus,
  buatkanAkun,
  aturUlangSandi,
  simpanFotoPengurus,
  aturPeranEditor,
} from "./aksi";

export type BarisPengurus = {
  id: string;
  nama: string;
  bidang: string;
  jabatan: string;
  urutan: number;
  email: string | null;
  profile_id: string | null;
  /** Path foto profil; kosong = tanpa foto, tampil inisial */
  foto_path?: string | null;
  /** Alamat foto yang siap ditampilkan */
  foto_url?: string | null;
  /** Semua peran akun ini, mis. ['sekretaris','editor'] */
  peran?: string[];
  sandi_diganti_pada?: string | null;
  sandi_diatur_ulang_pada?: string | null;
};

const BIDANG = [
  "Pengurus Harian",
  "Bidang Pendidikan",
  "Bidang Ekonomi",
  "Bidang Sosial Budaya",
];

const JABATAN = [
  "Ketua",
  "Wakil Ketua",
  "Sekretaris",
  "Wakil Sekretaris",
  "Bendahara",
  "Ketua Bidang",
  "Anggota",
];

const PERAN = [
  { key: "ketua", label: "Ketua" },
  { key: "wakil_ketua", label: "Wakil Ketua" },
  { key: "sekretaris", label: "Sekretaris" },
  { key: "bendahara", label: "Bendahara" },
  { key: "ketua_seksi", label: "Ketua Seksi/Bidang" },
  { key: "pengurus", label: "Pengurus/Anggota" },
  { key: "editor", label: "Editor Konten" },
];

type Mode =
  | { jenis: "tutup" }
  | { jenis: "tambah" }
  | { jenis: "ubah"; data: BarisPengurus }
  | { jenis: "akun"; data: BarisPengurus }
  | { jenis: "sandi"; data: BarisPengurus }
  | { jenis: "foto"; data: BarisPengurus }
  | { jenis: "sandiHasil"; data: BarisPengurus; sandi: string };

export function KelolaPengurus({
  daftar,
  bolehUbah,
  bolehResetSandi,
  bolehAturEditor,
}: {
  daftar: BarisPengurus[];
  bolehUbah: boolean;
  bolehResetSandi: boolean;
  /** Hanya Super Admin yang boleh menunjuk/melepas peran Editor */
  bolehAturEditor: boolean;
}) {
  const [mode, setMode] = useState<Mode>({ jenis: "tutup" });
  const [pesan, setPesan] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [sedang, mulai] = useTransition();
  const router = useRouter();

  // Keadaan unggah foto profil
  const [sedangFoto, setSedangFoto] = useState(false);
  const [ringkasanFoto, setRingkasanFoto] = useState<BerkasTerpilih[]>([]);
  const [pesanFoto, setPesanFoto] = useState<{ jenis: "ok" | "bad"; teks: string } | null>(null);

  function tutup() {
    setMode({ jenis: "tutup" });
    setMenu(null);
  }

  function kirim(form: FormData) {
    setPesan(null);
    setSukses(null);
    mulai(async () => {
      const masukan = {
        nama: String(form.get("nama") ?? ""),
        jabatan: String(form.get("jabatan") ?? ""),
        bidang: String(form.get("bidang") ?? ""),
        bidangBaru: String(form.get("bidangBaru") ?? ""),
        email: String(form.get("email") ?? ""),
        catatan: String(form.get("catatan") ?? ""),
      };
      const hasil =
        mode.jenis === "ubah"
          ? await ubahPengurus({ id: mode.data.id, ...masukan })
          : await tambahPengurus(masukan);

      if (hasil.galat) {
        setPesan(hasil.galat);
        return;
      }
      setSukses(
        hasil.pesan ??
          (mode.jenis === "ubah" ? "Data pengurus tersimpan." : "Pengurus baru ditambahkan."),
      );
      setMode({ jenis: "tutup" });
      router.refresh();
    });
  }

  function kirimAkun(form: FormData) {
    setPesan(null);
    setSukses(null);
    mulai(async () => {
      if (mode.jenis !== "akun") return;
      const hasil = await buatkanAkun({
        officerId: mode.data.id,
        email: String(form.get("email") ?? ""),
        peran: String(form.get("peran") ?? "pengurus"),
      });
      if (hasil.galat) {
        setPesan(hasil.galat);
        return;
      }
      setSukses(`Akun untuk ${mode.data.nama} berhasil dibuat.`);
      setMode({ jenis: "tutup" });
      router.refresh();
    });
  }

  function konfirmasiResetSandi(o: BarisPengurus) {
    setMenu(null);
    setPesan(null);
    setSukses(null);
    if (!o.profile_id) {
      setPesan(`${o.nama} belum punya akun. Buatkan akun dulu.`);
      return;
    }
    const lanjut = window.confirm(
      `Atur ulang kata sandi untuk ${o.nama}?\n\n` +
        `Sandi lama tidak akan berlaku lagi. Sandi baru akan ditampilkan SEKALI ` +
        `untuk Anda kirim ke yang bersangkutan.`,
    );
    if (!lanjut) return;
    mulai(async () => {
      const hasil = await aturUlangSandi(o.profile_id as string);
      if (hasil.galat) {
        setPesan(hasil.galat);
        return;
      }
      setMode({ jenis: "sandiHasil", data: o, sandi: hasil.sandi ?? "" });
      router.refresh();
    });
  }

  /** Mengunggah foto profil pengurus. Foto dipotong persegi, dikecilkan,
   *  lalu langsung tersambung ke beranda & struktur organisasi publik. */
  async function handlePilihFoto(daftar: File[]) {
    if (mode.jenis !== "foto") return;
    const berkas = daftar[0];
    if (!berkas) return;

    setSedangFoto(true);
    setPesanFoto(null);

    try {
      const hasil = await kompresGambar(berkas, "foto_profil");

      const sb = klienPeramban();
      const ekstensi = hasil.berkas.name.split(".").pop() || "jpg";
      const pathTujuan = `pengurus/${mode.data.id}-${Date.now()}.${ekstensi}`;

      const { error: gagalUnggah } = await sb.storage.from("publik").upload(pathTujuan, hasil.berkas, {
        upsert: true,
        contentType: hasil.berkas.type,
      });
      if (gagalUnggah) {
        throw new Error("Gagal mengunggah foto: " + gagalUnggah.message);
      }

      // Daftarkan ke tabel attachments (aturan aplikasi: setiap unggahan tercatat).
      await sb.from("attachments").insert({
        bucket: "publik",
        path: pathTujuan,
        nama_asli: berkas.name,
        tipe_mime: hasil.berkas.type,
        ukuran_byte: hasil.ukuranHasil,
        hash_sha256: hasil.hash,
        visibilitas: "publik",
        status: "resmi",
        entitas: "pengurus",
        entitas_id: mode.data.id,
        keterangan: `Foto profil pengurus: ${mode.data.nama}`,
      });

      const simpan = await simpanFotoPengurus({ id: mode.data.id, fotoPath: pathTujuan });
      if (simpan.galat) throw new Error(simpan.galat);

      const urlBaru = sb.storage.from("publik").getPublicUrl(pathTujuan).data.publicUrl;
      setRingkasanFoto([
        {
          id: pathTujuan,
          nama: berkas.name,
          ukuranAsli: berkas.size,
          ukuranHasil: hasil.ukuranHasil,
          url: urlBaru,
          bolehPublik: true,
        },
      ]);
      setPesanFoto({
        jenis: "ok",
        teks: `Foto ${mode.data.nama} tersimpan (${ukuranTerbaca(hasil.ukuranAsli)} → ${ukuranTerbaca(
          hasil.ukuranHasil,
        )}). Foto ini langsung tampil di beranda dan struktur organisasi.`,
      });
      router.refresh();
    } catch (e) {
      setPesanFoto({
        jenis: "bad",
        teks: e instanceof Error ? e.message : "Foto gagal diunggah.",
      });
    } finally {
      setSedangFoto(false);
    }
  }

  function konfirmasiHapusFoto(o: BarisPengurus) {
    const lanjut = window.confirm(
      `Hapus foto ${o.nama}?\n\nFoto akan hilang dari beranda dan struktur organisasi, ` +
        `lalu diganti inisial nama.`,
    );
    if (!lanjut) return;
    setSedangFoto(true);
    setPesanFoto(null);
    mulai(async () => {
      const hasil = await simpanFotoPengurus({ id: o.id, hapus: true });
      setSedangFoto(false);
      if (hasil.galat) {
        setPesanFoto({ jenis: "bad", teks: hasil.galat });
        return;
      }
      setRingkasanFoto([]);
      setPesanFoto({ jenis: "ok", teks: `Foto ${o.nama} sudah dihapus.` });
      router.refresh();
    });
  }

  /** Menunjuk atau melepas peran Editor Konten (khusus Super Admin).
   *
   * Peran lain milik orang itu tidak disentuh: Sekretaris yang ditunjuk tetap
   * Sekretaris, hanya bertambah hak meninjau berita.
   */
  function aturEditor(o: BarisPengurus, pasang: boolean) {
    setMenu(null);
    setPesan(null);
    setSukses(null);
    const akibat = pasang
      ? `Tunjuk ${o.nama} sebagai Editor Konten?\n\n` +
        `Ia akan bisa membuka menu Konten, meninjau, dan menerbitkan berita. ` +
        `Peran lainnya tetap seperti sekarang.`
      : `Lepas peran Editor Konten dari ${o.nama}?\n\n` +
        `Ia tidak lagi bisa membuka menu Konten. Peran lainnya tidak berubah.`;
    if (!window.confirm(akibat)) return;
    mulai(async () => {
      const hasil = await aturPeranEditor({ officerId: o.id, pasang });
      if (hasil.galat) {
        setPesan(hasil.galat);
        return;
      }
      setSukses(
        pasang
          ? `${o.nama} sekarang bisa meninjau dan menerbitkan berita.`
          : `Peran Editor ${o.nama} sudah dilepas.`,
      );
      router.refresh();
    });
  }

  function konfirmasiHapus(o: BarisPengurus) {
    setMenu(null);
    setPesan(null);
    setSukses(null);
    const lanjut = window.confirm(
      `Keluarkan ${o.nama} (${o.jabatan}) dari daftar pengurus?\n\n` +
        `Catatan: akunnya tidak ikut terhapus, hanya keluar dari daftar.`,
    );
    if (!lanjut) return;
    mulai(async () => {
      const hasil = await hapusPengurus(o.id);
      if (hasil.galat) {
        setPesan(hasil.galat);
        return;
      }
      setSukses(`${o.nama} sudah dikeluarkan dari daftar pengurus.`);
      router.refresh();
    });
  }

  const bidangUrut = Array.from(new Set(daftar.map((d) => d.bidang)));
  const belumBerakun = daftar.filter((d) => !d.profile_id).length;

  return (
    <div>
      {/* Satu tombol aksi utama */}
      {bolehUbah && mode.jenis === "tutup" && (
        <div className="mb-5">
          <TombolUtama
            ukuran="sedang"
            type="button"
            onClick={() => {
              setPesan(null);
              setSukses(null);
              setMode({ jenis: "tambah" });
            }}
          >
            + Tambah Pengurus
          </TombolUtama>
        </div>
      )}

      {/* Form tambah / ubah */}
      {bolehUbah && (mode.jenis === "tambah" || mode.jenis === "ubah") && (
        <Kartu className="p-5 mb-5">
          <h3 className="judul-3 text-n-900 mb-4">
            {mode.jenis === "tambah" ? "Tambah Pengurus" : "Ubah Data Pengurus"}
          </h3>
          <form action={kirim} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Kolom label="Nama lengkap">
              <Isian
                name="nama"
                defaultValue={mode.jenis === "ubah" ? mode.data.nama : ""}
                placeholder="Contoh: Ny. Siti Aminah"
                required
              />
            </Kolom>

            <Kolom label="Jabatan">
              <Pilihan
                name="jabatan"
                defaultValue={mode.jenis === "ubah" ? mode.data.jabatan : ""}
                required
              >
                <option value="">Pilih jabatan</option>
                {JABATAN.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </Pilihan>
            </Kolom>

            <Kolom label="Bidang">
              <Pilihan
                name="bidang"
                defaultValue={mode.jenis === "ubah" ? mode.data.bidang : ""}
                required
              >
                <option value="">Pilih bidang</option>
                {Array.from(new Set([...BIDANG, ...daftar.map((d) => d.bidang)])).map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Pilihan>
            </Kolom>

            <Kolom label="Bidang baru (bila belum ada daftarnya)">
              <Isian name="bidangBaru" placeholder="Contoh: Bidang Humas" />
            </Kolom>

            <Kolom label="Email pengurus">
              <Isian
                name="email"
                type="email"
                defaultValue={mode.jenis === "ubah" ? mode.data.email ?? "" : ""}
                placeholder="nama@dwpkgtkmalut.com"
              />
            </Kolom>

            <Kolom label="Catatan">
              <Isian name="catatan" placeholder="Contoh: menunggu nama lengkap" />
            </Kolom>

            {pesan && <PesanGalat teks={pesan} />}

            <div className="sm:col-span-2 flex flex-wrap gap-3">
              <TombolUtama type="submit" disabled={sedang}>
                {sedang ? "Menyimpan…" : "Simpan"}
              </TombolUtama>
              <TombolSekunder type="button" onClick={tutup}>
                Batal
              </TombolSekunder>
            </div>
          </form>
        </Kartu>
      )}

      {/* Form buatkan akun */}
      {bolehUbah && mode.jenis === "akun" && (
        <Kartu className="p-5 mb-5">
          <h3 className="judul-3 text-n-900 mb-1">Buatkan Akun</h3>
          <p className="teks-3 text-n-500 mb-4">
            Untuk {mode.data.nama} — {mode.data.jabatan}
          </p>
          <form action={kirimAkun} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Kolom label="Email untuk masuk">
              <Isian
                name="email"
                type="email"
                defaultValue={mode.data.email ?? ""}
                placeholder="nama@dwpkgtkmalut.com"
                required
              />
            </Kolom>

            <Kolom label="Peran dalam aplikasi">
              <Pilihan name="peran" defaultValue="pengurus" required>
                {PERAN.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </Pilihan>
            </Kolom>

            {pesan && <PesanGalat teks={pesan} />}

            <div className="sm:col-span-2 flex flex-wrap gap-3">
              <TombolUtama type="submit" disabled={sedang}>
                {sedang ? "Membuat akun…" : "Buatkan Akun"}
              </TombolUtama>
              <TombolSekunder type="button" onClick={tutup}>
                Batal
              </TombolSekunder>
            </div>
          </form>
        </Kartu>
      )}

      {/* Form foto profil */}
      {bolehUbah && mode.jenis === "foto" && (
        <Kartu className="p-5 mb-5">
          <h3 className="judul-3 text-n-900 mb-1">Foto Profil</h3>
          <p className="teks-3 text-n-500 mb-4">
            Untuk {mode.data.nama} — {mode.data.jabatan}
          </p>

          <div className="flex flex-wrap items-center gap-5 mb-4">
            {(ringkasanFoto[0]?.url ?? mode.data.foto_url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={(ringkasanFoto[0]?.url ?? mode.data.foto_url) as string}
                alt={`Foto ${mode.data.nama}`}
                className="h-24 w-24 rounded-full object-cover border border-n-200"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-[28px] font-semibold">
                {mode.data.nama.replace(/^Ny\.\s*/i, "").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-[240px]">
              <KotakUnggah
                label={mode.data.foto_path ? "Ganti foto" : "Pilih foto"}
                keterangan="Foto persegi paling rapi. Berkas dikecilkan otomatis sebelum diunggah."
                terima="image/*"
                onPilih={handlePilihFoto}
                sedang={sedangFoto}
              />
            </div>
          </div>

          <RingkasanKompresi daftar={ringkasanFoto} />

          {pesanFoto && (
            <p
              className={`mt-3 text-[14px] px-3 py-2 rounded-token border ${
                pesanFoto.jenis === "ok"
                  ? "text-ok-700 bg-ok-50 border-ok-200"
                  : "text-bahaya-700 bg-bahaya-50 border-bahaya-200"
              }`}
            >
              {pesanFoto.teks}
            </p>
          )}

          <div className="flex flex-wrap gap-3 mt-4">
            {mode.data.foto_path && (
              <TombolSekunder type="button" disabled={sedangFoto} onClick={() => konfirmasiHapusFoto(mode.data)}>
                Hapus foto
              </TombolSekunder>
            )}
            <TombolSekunder type="button" onClick={tutup}>
              Tutup
            </TombolSekunder>
          </div>
        </Kartu>
      )}

      {/* Hasil pengaturan ulang sandi — ditampilkan SEKALI */}
      {mode.jenis === "sandiHasil" && (
        <Kartu className="p-5 mb-5 border-brand-300">
          <h3 className="judul-3 text-n-900 mb-1">Sandi Baru Sudah Dibuat</h3>
          <p className="teks-3 text-n-500 mb-4">
            Untuk {mode.data.nama} ({mode.data.email})
          </p>

          <div className="rounded-token border border-brand-200 bg-brand-50 px-4 py-4 mb-4">
            <p className="teks-3 text-n-600 mb-1">Kata sandi baru</p>
            <p className="text-[22px] font-semibold text-n-900 tracking-wide select-all break-all">
              {mode.sandi}
            </p>
          </div>

          <p className="text-[14px] text-bahaya-700 bg-bahaya-50 border border-bahaya-200 rounded-token px-3 py-2 mb-4">
            Catat atau salin sekarang. Sandi ini tidak bisa ditampilkan lagi setelah jendela ini
            ditutup.
          </p>

          <p className="teks-3 text-n-600 mb-4">
            Kirimkan ke {mode.data.nama} lewat jalur pribadi (WhatsApp atau pesan langsung), lalu
            minta segera diganti sendiri di menu Profil.
          </p>

          <div className="flex flex-wrap gap-3">
            <TombolUtama
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(mode.sandi);
                setSukses("Sandi sudah disalin. Silakan tempel di pesan untuk yang bersangkutan.");
              }}
            >
              Salin sandi
            </TombolUtama>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Assalamualaikum ${mode.data.nama}, kata sandi akun DWP Anda sudah diatur ulang: ${mode.sandi}. Mohon segera diganti setelah masuk melalui menu Profil. Terima kasih.`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-token border border-n-200 text-n-700 text-[14px] hover:bg-n-50"
            >
              Kirim lewat WhatsApp
            </a>
            <TombolSekunder type="button" onClick={tutup}>
              Tutup
            </TombolSekunder>
          </div>
        </Kartu>
      )}

      {/* Pesan hasil */}
      {pesan && mode.jenis === "tutup" && <PesanGalat teks={pesan} />}
      {sukses && (
        <p className="mb-4 text-[14px] text-ok-700 bg-ok-50 border border-ok-200 rounded-token px-3 py-2">
          {sukses}
        </p>
      )}

      {/* Ringkasan jumlah — satu tempat saja */}
      <div className="mb-4">
        <span className="text-n-500 teks-3">
          {daftar.length} orang tercatat
          {belumBerakun > 0 && ` · ${belumBerakun} belum punya akun`}
        </span>
      </div>

      {/* SATU daftar, dikelompokkan per bidang */}
      <div className="flex flex-col gap-6">
        {bidangUrut.map((bidang) => (
          <section key={bidang}>
            <JudulSeksi>{bidang}</JudulSeksi>
            <Kartu>
              {daftar
                .filter((d) => d.bidang === bidang)
                .map((o, i) => (
                  <div
                    key={o.id}
                    className={`relative flex items-center gap-3 px-4 py-3 ${
                      i > 0 ? "border-t border-n-100" : ""
                    }`}
                  >
                    {o.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={o.foto_url}
                        alt={`Foto ${o.nama}`}
                        className="h-14 w-14 rounded-full object-cover object-top shrink-0 border border-n-200"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-[13px] font-semibold shrink-0">
                        {o.nama.replace(/^Ny\.\s*/i, "").slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-n-800 font-medium truncate">{o.nama}</p>
                      <p className="teks-3 text-n-500 truncate">{o.jabatan}</p>
                      {o.profile_id && !o.sandi_diganti_pada && (
                        <p className="text-[12px] text-warn-fg mt-0.5">
                          Belum pernah ganti sandi
                        </p>
                      )}
                    </div>

                    <Lencana nada={o.profile_id ? "ok" : "netral"}>
                      {o.profile_id ? "Punya akun" : "Belum berakun"}
                    </Lencana>

                    {(o.peran ?? []).includes("editor") && (
                      <Lencana nada="brand">Editor</Lencana>
                    )}

                    {bolehUbah && (
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          aria-label={`Aksi untuk ${o.nama}`}
                          aria-expanded={menu === o.id}
                          onClick={() => setMenu(menu === o.id ? null : o.id)}
                          className="h-11 w-11 inline-flex items-center justify-center rounded-token border border-n-200 bg-n-0 text-n-600 hover:bg-n-50 text-[18px] leading-none"
                        >
                          ⋯
                        </button>

                        {menu === o.id && (
                          <>
                            <button
                              type="button"
                              aria-label="Tutup menu"
                              className="fixed inset-0 z-10 cursor-default"
                              onClick={() => setMenu(null)}
                            />
                            <div className="absolute right-0 top-12 z-20 w-48 rounded-token border border-n-200 bg-n-0 shadow-md py-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setPesan(null);
                                  setSukses(null);
                                  setMenu(null);
                                  setMode({ jenis: "ubah", data: o });
                                }}
                                className="w-full text-left px-4 min-h-[44px] text-[14px] text-n-700 hover:bg-n-50"
                              >
                                Ubah data
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setPesan(null);
                                  setSukses(null);
                                  setPesanFoto(null);
                                  setRingkasanFoto([]);
                                  setMenu(null);
                                  setMode({ jenis: "foto", data: o });
                                }}
                                className="w-full text-left px-4 min-h-[44px] text-[14px] text-n-700 hover:bg-n-50"
                              >
                                {o.foto_path ? "Ubah foto" : "Unggah foto"}
                              </button>

                              {!o.profile_id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPesan(null);
                                    setSukses(null);
                                    setMenu(null);
                                    setMode({ jenis: "akun", data: o });
                                  }}
                                  className="w-full text-left px-4 min-h-[44px] text-[14px] text-n-700 hover:bg-n-50"
                                >
                                  Buatkan akun
                                </button>
                              )}

                              {/* Peran Editor: hanya muncul untuk Super Admin
                                  dan hanya bila orangnya sudah punya akun. */}
                              {bolehAturEditor && o.profile_id && (
                                <button
                                  type="button"
                                  onClick={() => aturEditor(o, !(o.peran ?? []).includes("editor"))}
                                  className="w-full text-left px-4 min-h-[44px] text-[14px] text-n-700 hover:bg-n-50"
                                >
                                  {(o.peran ?? []).includes("editor")
                                    ? "Lepas peran Editor"
                                    : "Jadikan Editor Konten"}
                                </button>
                              )}

                              {bolehResetSandi && o.profile_id && (
                                <button
                                  type="button"
                                  onClick={() => konfirmasiResetSandi(o)}
                                  className="w-full text-left px-4 min-h-[44px] text-[14px] text-n-700 hover:bg-n-50"
                                >
                                  Atur ulang sandi
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => konfirmasiHapus(o)}
                                className="w-full text-left px-4 min-h-[44px] text-[14px] text-bahaya-700 hover:bg-bahaya-50"
                              >
                                Hapus
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </Kartu>
          </section>
        ))}
      </div>
    </div>
  );
}

function PesanGalat({ teks }: { teks: string }) {
  return (
    <p className="text-[14px] text-bahaya-700 bg-bahaya-50 border border-bahaya-200 rounded-token px-3 py-2">
      {teks}
    </p>
  );
}
