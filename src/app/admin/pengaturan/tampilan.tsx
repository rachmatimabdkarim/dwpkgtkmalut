"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Kartu,
  JudulSeksi,
  Isian,
  Kolom,
  TombolUtama,
  TombolSekunder,
  TombolBahaya,
  Lencana,
  AreaTeks,
} from "@/components/dasar";
import { LambangTeks } from "@/components/ikon";
import { JudulAplikasi } from "@/components/judul-aplikasi";
import { KotakUnggah, RingkasanKompresi, type BerkasTerpilih } from "@/components/kotak-unggah";
import { TEMA_BAWAAN, rasioKontras, warnaTeksTerbaik, variabelTema, type TemaSitus } from "@/lib/tema";
import { kompresGambar, buatPersegi, ukuranTerbaca } from "@/lib/berkas-kompres";
import { klienPeramban } from "@/lib/supabase-peramban";
import {
  simpanIdentitas,
  simpanWarna,
  simpanBranding,
  kembalikanBawaan,
} from "./aksi";

export function FormPengaturanTampilan({ temaAwal }: { temaAwal: TemaSitus }) {
  const router = useRouter();

  /* ============================================================
     1. BAGIAN IDENTITAS
     ============================================================ */
  const [identitas, setIdentitas] = useState({
    namaAplikasi: temaAwal.namaAplikasi,
    namaUnit: temaAwal.namaUnit,
    namaOrganisasi: temaAwal.namaOrganisasi,
    alamat: temaAwal.alamat ?? TEMA_BAWAAN.alamat ?? "",
    telepon: temaAwal.telepon ?? TEMA_BAWAAN.telepon ?? "",
    email: temaAwal.email ?? TEMA_BAWAAN.email ?? "",
    sambutan: temaAwal.sambutan ?? TEMA_BAWAAN.sambutan ?? "",
    profilSingkat: temaAwal.profilSingkat ?? TEMA_BAWAAN.profilSingkat ?? "",
    subJudulAgenda: temaAwal.subJudulAgenda ?? TEMA_BAWAAN.subJudulAgenda ?? "",
    subJudulBerita: temaAwal.subJudulBerita ?? TEMA_BAWAAN.subJudulBerita ?? "",
    subJudulGaleri: temaAwal.subJudulGaleri ?? TEMA_BAWAAN.subJudulGaleri ?? "",
    subJudulUnduhan: temaAwal.subJudulUnduhan ?? TEMA_BAWAAN.subJudulUnduhan ?? "",
  });
  const [sedangIdentitas, setSedangIdentitas] = useState(false);
  const [pesanIdentitas, setPesanIdentitas] = useState<{ jenis: "ok" | "bad"; teks: string } | null>(null);

  async function handleSimpanIdentitas(e: React.FormEvent) {
    e.preventDefault();
    setSedangIdentitas(true);
    setPesanIdentitas(null);

    const hasil = await simpanIdentitas(identitas);
    setSedangIdentitas(false);
    setPesanIdentitas({
      jenis: hasil.sukses ? "ok" : "bad",
      teks: hasil.pesan,
    });
    if (hasil.sukses) {
      router.refresh();
    }
  }

  /* ============================================================
     2. BAGIAN WARNA
     ============================================================ */


  const [warna, setWarna] = useState(temaAwal.warnaUtama);
  const [sedangWarna, setSedangWarna] = useState(false);
  const [pesanWarna, setPesanWarna] = useState<{ jenis: "ok" | "bad"; teks: string } | null>(null);

  const warnaValid = useMemo(() => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(warna.trim()), [warna]);

  const teksTerbaik = useMemo(() => {
    if (!warnaValid) return "#ffffff";
    try {
      return warnaTeksTerbaik(warna.trim());
    } catch {
      return "#ffffff";
    }
  }, [warna, warnaValid]);

  // Warna utama dipakai sebagai LATAR TOMBOL, sehingga harus dibandingkan
  // terhadap PUTIH. Kalau rasio terhadap putih terlalu kecil, tombol akan
  // terlihat pucat dan tulisannya tidak nyaman dibaca.
  const rasioTerhadapPutih = useMemo(() => {
    if (!warnaValid) return 0;
    try {
      return rasioKontras("#ffffff", warna.trim());
    } catch {
      return 0;
    }
  }, [warna, warnaValid]);

  // Boleh disimpan hanya bila warna cukup kontras terhadap putih (tombol terbaca).
  const bolehSimpanWarna = warnaValid && rasioTerhadapPutih >= 3.0;

  // PRATINJAU LANGSUNG: begitu warna dipilih, seluruh halaman ikut berubah
  // (tanpa perlu disimpan) sehingga pengguna melihat hasilnya seketika.
  useEffect(() => {
    if (!warnaValid) return;
    const akar = document.documentElement;
    const nilai = variabelTema({
      ...temaAwal,
      warnaUtama: warna.trim(),
    } as TemaSitus);
    const sebelum: Record<string, string> = {};
    for (const [kunci, nilaiBaru] of Object.entries(nilai)) {
      sebelum[kunci] = akar.style.getPropertyValue(kunci);
      akar.style.setProperty(kunci, nilaiBaru);
    }
    return () => {
      // Kembalikan ke nilai tema tersimpan bila pengguna membatalkan.
      for (const [kunci, nilaiLama] of Object.entries(sebelum)) {
        if (nilaiLama) akar.style.setProperty(kunci, nilaiLama);
        else akar.style.removeProperty(kunci);
      }
    };
  }, [warna, warnaValid, temaAwal]);

  async function handleSimpanWarna() {
    if (!bolehSimpanWarna) return;
    setSedangWarna(true);
    setPesanWarna(null);

    const hasil = await simpanWarna(warna.trim());
    setSedangWarna(false);
    setPesanWarna({
      jenis: hasil.sukses ? "ok" : "bad",
      teks: hasil.pesan,
    });
    if (hasil.sukses) {
      router.refresh();
    }
  }

  async function handleKembalikanWarna() {
    setSedangWarna(true);
    setPesanWarna(null);

    const hasil = await kembalikanBawaan("warna");
    setSedangWarna(false);
    if (hasil.sukses) {
      setWarna(TEMA_BAWAAN.warnaUtama);
      setPesanWarna({ jenis: "ok", teks: "Warna berhasil dikembalikan ke bawaan." });
      router.refresh();
    } else {
      setPesanWarna({ jenis: "bad", teks: hasil.pesan });
    }
  }

  /* ============================================================
     3. BAGIAN LOGO & IKON SITUS (FAVICON)
     ============================================================ */
  const [logoPath, setLogoPath] = useState<string | null>(temaAwal.logoPath ?? null);
  const [logoUrl, setLogoUrl] = useState<string | null>(temaAwal.logoUrl ?? null);
  const [ringkasanLogo, setRingkasanLogo] = useState<BerkasTerpilih[]>([]);
  const [sedangUnggahLogo, setSedangUnggahLogo] = useState(false);

  const [faviconPath, setFaviconPath] = useState<string | null>(temaAwal.faviconPath ?? null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(temaAwal.faviconUrl ?? null);
  const [ringkasanFavicon, setRingkasanFavicon] = useState<BerkasTerpilih[]>([]);
  const [sedangUnggahFavicon, setSedangUnggahFavicon] = useState(false);

  const [sedangBranding, setSedangBranding] = useState(false);
  const [pesanBranding, setPesanBranding] = useState<{ jenis: "ok" | "bad"; teks: string } | null>(null);

  async function handlePilihLogo(daftar: File[]) {
    const berkas = daftar[0];
    if (!berkas) return;

    setSedangUnggahLogo(true);
    setPesanBranding(null);

    try {
      let berkasSiap: File;
      let ukuranHasil: number;

      if (berkas.type === "image/svg+xml") {
        if (berkas.size > 100 * 1024) {
          throw new Error("Berkas SVG logo terlalu besar. Maksimal 100 KB.");
        }
        berkasSiap = berkas;
        ukuranHasil = berkas.size;
      } else {
        const hasil = await kompresGambar(berkas, "logo");
        if (hasil.berkas.size > 100 * 1024) {
          throw new Error("Ukuran logo hasil kompresi masih melebihi 100 KB.");
        }
        berkasSiap = hasil.berkas;
        ukuranHasil = hasil.ukuranHasil;
      }

      const sb = klienPeramban();
      const ekstensi = berkasSiap.name.split(".").pop() || "png";
      const pathTujuan = `branding/logo-${Date.now()}.${ekstensi}`;

      const { error: gagalUnggah } = await sb.storage.from("publik").upload(pathTujuan, berkasSiap, {
        upsert: true,
        contentType: berkasSiap.type,
      });

      if (gagalUnggah) {
        throw new Error("Gagal mengunggah logo ke penyimpanan: " + gagalUnggah.message);
      }

      const urlPublikBaru = sb.storage.from("publik").getPublicUrl(pathTujuan).data.publicUrl;

      setLogoPath(pathTujuan);
      setLogoUrl(urlPublikBaru);
      setRingkasanLogo([
        {
          id: pathTujuan,
          nama: berkas.name,
          ukuranAsli: berkas.size,
          ukuranHasil,
          url: urlPublikBaru,
          bolehPublik: true,
        },
      ]);
    } catch (err) {
      setPesanBranding({
        jenis: "bad",
        teks: err instanceof Error ? err.message : "Gagal memproses berkas logo.",
      });
    } finally {
      setSedangUnggahLogo(false);
    }
  }

  async function handlePilihFavicon(daftar: File[]) {
    const berkas = daftar[0];
    if (!berkas) return;

    setSedangUnggahFavicon(true);
    setPesanBranding(null);

    try {
      let berkasSiap: File;
      let ukuranHasil: number;

      if (berkas.type === "image/svg+xml") {
        if (berkas.size > 50 * 1024) {
          throw new Error("Berkas SVG ikon situs terlalu besar. Maksimal 50 KB.");
        }
        berkasSiap = berkas;
        ukuranHasil = berkas.size;
      } else {
        const persegiBlob = await buatPersegi(berkas, 512, "image/png");
        const berkasPersegi = new File([persegiBlob], "favicon.png", { type: "image/png" });

        if (berkasPersegi.size > 50 * 1024) {
          const kompres = await kompresGambar(berkasPersegi, "favicon");
          berkasSiap = kompres.berkas;
          ukuranHasil = kompres.ukuranHasil;
        } else {
          berkasSiap = berkasPersegi;
          ukuranHasil = berkasPersegi.size;
        }
      }

      const sb = klienPeramban();
      const ekstensi = berkasSiap.name.split(".").pop() || "png";
      const pathTujuan = `branding/favicon-${Date.now()}.${ekstensi}`;

      const { error: gagalUnggah } = await sb.storage.from("publik").upload(pathTujuan, berkasSiap, {
        upsert: true,
        contentType: berkasSiap.type,
      });

      if (gagalUnggah) {
        throw new Error("Gagal mengunggah ikon situs: " + gagalUnggah.message);
      }

      const urlPublikBaru = sb.storage.from("publik").getPublicUrl(pathTujuan).data.publicUrl;

      setFaviconPath(pathTujuan);
      setFaviconUrl(urlPublikBaru);
      setRingkasanFavicon([
        {
          id: pathTujuan,
          nama: berkas.name,
          ukuranAsli: berkas.size,
          ukuranHasil,
          url: urlPublikBaru,
          bolehPublik: true,
        },
      ]);
    } catch (err) {
      setPesanBranding({
        jenis: "bad",
        teks: err instanceof Error ? err.message : "Gagal memproses ikon situs.",
      });
    } finally {
      setSedangUnggahFavicon(false);
    }
  }

  async function handleSimpanBranding() {
    setSedangBranding(true);
    setPesanBranding(null);

    const hasil = await simpanBranding({
      logoPath,
      faviconPath,
    });

    setSedangBranding(false);
    setPesanBranding({
      jenis: hasil.sukses ? "ok" : "bad",
      teks: hasil.pesan,
    });
    if (hasil.sukses) {
      router.refresh();
    }
  }

  async function handleHapusLogo() {
    if (!confirm("Hapus logo situs dan kembali ke lambang teks?")) return;
    setSedangBranding(true);
    setPesanBranding(null);

    const hasil = await simpanBranding({
      hapusLogo: true,
      faviconPath,
    });

    setSedangBranding(false);
    if (hasil.sukses) {
      setLogoPath(null);
      setLogoUrl(null);
      setRingkasanLogo([]);
      setPesanBranding({ jenis: "ok", teks: "Logo berhasil dihapus." });
      router.refresh();
    } else {
      setPesanBranding({ jenis: "bad", teks: hasil.pesan });
    }
  }

  async function handleHapusFavicon() {
    if (!confirm("Hapus ikon situs?")) return;
    setSedangBranding(true);
    setPesanBranding(null);

    const hasil = await simpanBranding({
      logoPath,
      hapusFavicon: true,
    });

    setSedangBranding(false);
    if (hasil.sukses) {
      setFaviconPath(null);
      setFaviconUrl(null);
      setRingkasanFavicon([]);
      setPesanBranding({ jenis: "ok", teks: "Ikon situs berhasil dihapus." });
      router.refresh();
    } else {
      setPesanBranding({ jenis: "bad", teks: hasil.pesan });
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <p className="text-n-500 -mt-2">
        Atur identitas, warna tema, logo, dan favicon aplikasi dari satu halaman. Perubahan berlaku
        di seluruh aplikasi (panel, situs publik, halaman masuk, dan ikon tab peramban).
      </p>

      {/* ============================================================
          1. SEKSI IDENTITAS
          ============================================================ */}
      <section aria-labelledby="judul-identitas">
        <JudulSeksi>Identitas</JudulSeksi>
        <Kartu className="p-5 flex flex-col gap-4">
          <form onSubmit={handleSimpanIdentitas} className="flex flex-col gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Kolom
                label="Baris 1 — nama sistem"
                bantuan="Tampil di baris atas header dan judul situs, contoh: Sistem Informasi DWP."
              >
                <Isian
                  required
                  value={identitas.namaAplikasi}
                  onChange={(e) => setIdentitas({ ...identitas, namaAplikasi: e.target.value })}
                />
              </Kolom>

              <Kolom
                label="Baris 2 — nama unit"
                bantuan="Tampil di baris bawah header, contoh: Kantor GTK Malut."
              >
                <Isian
                  required
                  value={identitas.namaUnit}
                  onChange={(e) => setIdentitas({ ...identitas, namaUnit: e.target.value })}
                />
              </Kolom>
            </div>

            <Kolom
              label="Nama organisasi lengkap"
              bantuan="Dipakai pada kop berkas PDF, deskripsi halaman, dan footer situs."
            >
              <Isian
                required
                value={identitas.namaOrganisasi}
                onChange={(e) => setIdentitas({ ...identitas, namaOrganisasi: e.target.value })}
              />
            </Kolom>

            <Kolom label="Alamat sekretariat" bantuan="Tampil di bagian kontak footer situs publik.">
              <Isian
                value={identitas.alamat}
                onChange={(e) => setIdentitas({ ...identitas, alamat: e.target.value })}
                placeholder="Jl. Ki Hajar Dewantara, Kota Ternate..."
              />
            </Kolom>

            <div className="grid sm:grid-cols-2 gap-4">
              <Kolom label="Nomor telepon" bantuan="Nomor telepon resmi organisasi.">
                <Isian
                  value={identitas.telepon}
                  onChange={(e) => setIdentitas({ ...identitas, telepon: e.target.value })}
                  placeholder="(0921) 3123456"
                />
              </Kolom>

              <Kolom label="Alamat email" bantuan="Alamat surat elektronik resmi.">
                <Isian
                  type="email"
                  value={identitas.email}
                  onChange={(e) => setIdentitas({ ...identitas, email: e.target.value })}
                  placeholder="dwp.gtkmalut@kemdikbud.go.id"
                />
              </Kolom>
            </div>

            <Kolom
              label="Kalimat sambutan (tampil di beranda & footer)"
              bantuan="Ditulis singkat, satu sampai dua kalimat."
            >
              <AreaTeks
                rows={2}
                value={identitas.sambutan}
                onChange={(e) => setIdentitas({ ...identitas, sambutan: e.target.value })}
                placeholder="Contoh: Mewujudkan kebersamaan dan ketahanan keluarga di lingkungan pendidikan Maluku Utara."
              />
            </Kolom>

            <Kolom
              label="Keterangan halaman Agenda"
              bantuan="Kalimat kecil di bawah judul halaman Agenda."
            >
              <Isian
                value={identitas.subJudulAgenda}
                onChange={(e) => setIdentitas({ ...identitas, subJudulAgenda: e.target.value })}
              />
            </Kolom>

            <Kolom
              label="Keterangan halaman Berita"
              bantuan="Kalimat kecil di bawah judul halaman Berita."
            >
              <Isian
                value={identitas.subJudulBerita}
                onChange={(e) => setIdentitas({ ...identitas, subJudulBerita: e.target.value })}
              />
            </Kolom>

            <Kolom
              label="Keterangan halaman Galeri"
              bantuan="Kalimat kecil di bawah judul halaman Galeri."
            >
              <Isian
                value={identitas.subJudulGaleri}
                onChange={(e) => setIdentitas({ ...identitas, subJudulGaleri: e.target.value })}
              />
            </Kolom>

            <Kolom
              label="Keterangan halaman Unduhan"
              bantuan="Kalimat kecil di bawah judul halaman Unduhan."
            >
              <Isian
                value={identitas.subJudulUnduhan}
                onChange={(e) => setIdentitas({ ...identitas, subJudulUnduhan: e.target.value })}
              />
            </Kolom>

            <Kolom
              label="Profil singkat organisasi (tampil di halaman Profil)"
              bantuan="Pisahkan antar paragraf dengan menekan Enter."
            >
              <AreaTeks
                rows={5}
                value={identitas.profilSingkat}
                onChange={(e) => setIdentitas({ ...identitas, profilSingkat: e.target.value })}
                placeholder="Ceritakan singkat tentang organisasi..."
              />
            </Kolom>

            {pesanIdentitas && (
              <div
                className={`rounded-token border px-3 py-2 text-[13px] ${
                  pesanIdentitas.jenis === "ok"
                    ? "border-ok-line bg-ok-bg text-ok-fg"
                    : "border-bad-line bg-bad-bg text-bad-fg"
                }`}
              >
                {pesanIdentitas.teks}
              </div>
            )}

            <div className="pt-2 flex justify-start">
              <TombolUtama type="submit" disabled={sedangIdentitas}>
                {sedangIdentitas ? "Menyimpan…" : "Simpan identitas"}
              </TombolUtama>
            </div>
          </form>
        </Kartu>
      </section>

      {/* ============================================================
          2. SEKSI WARNA
          ============================================================ */}
      <section aria-labelledby="judul-warna">
        <JudulSeksi>Warna utama</JudulSeksi>
        <Kartu className="p-5 flex flex-col gap-5">
          <p className="teks-3 text-n-600">
            Pilih warna utama institusi. Seluruh turunan warna skala 50–900 dan warna teks
            keterbacaan dihitung otomatis dari warna ini.
          </p>

          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div>
              <span className="block text-[13px] font-medium text-n-700 mb-1.5">Pilih warna</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Pemilih warna utama"
                  value={warnaValid ? warna.trim() : "#0f766e"}
                  onChange={(e) => setWarna(e.target.value)}
                  className="h-11 w-16 rounded-token border border-n-300 p-1 cursor-pointer bg-n-0"
                />
              </div>
            </div>

            <div className="w-[150px]">
              <Kolom label="Kode hex" bantuan="Format: #0f766e">
                <Isian
                  value={warna}
                  onChange={(e) => setWarna(e.target.value)}
                  placeholder="#0f766e"
                  className="font-mono uppercase"
                />
              </Kolom>
            </div>

            <TombolSekunder
              type="button"
              onClick={handleKembalikanWarna}
              disabled={sedangWarna}
            >
              Kembalikan ke bawaan
            </TombolSekunder>
          </div>

          {/* Kotak Pemeriksaan & Peringatan Kontras */}
          {warnaValid && (
            <div>
              {rasioTerhadapPutih < 3.0 ? (
                <div className="rounded-token border border-bad-line bg-bad-bg px-3.5 py-2.5 text-[13px] text-bad-fg">
                  <strong>Warna Terlalu Terang ({rasioTerhadapPutih.toFixed(2)}:1 terhadap putih):</strong>{" "}
                  Warna ini terlalu pucat untuk dipakai sebagai warna utama — tombol dan menu akan
                  terlihat pudar serta sulit dibaca. Warna ini tidak dapat disimpan. Silakan pilih
                  warna yang lebih tua atau lebih pekat.
                </div>
              ) : rasioTerhadapPutih < 4.5 ? (
                <div className="rounded-token border border-warn-line bg-warn-bg px-3.5 py-2.5 text-[13px] text-warn-fg">
                  <strong>Perhatian Kontras ({rasioTerhadapPutih.toFixed(2)}:1):</strong> Warna ini
                  cukup terbaca tetapi masih di bawah rekomendasi WCAG AA (4.5:1). Warna teks di atas
                  tombol otomatis disesuaikan ke{" "}
                  <strong>{teksTerbaik === "#ffffff" ? "putih" : "gelap"}</strong> agar tetap jelas.
                </div>
              ) : (
                <div className="rounded-token border border-ok-line bg-ok-bg px-3.5 py-2.5 text-[13px] text-ok-fg">
                  <strong>Keterbacaan Sangat Baik ({rasioTerhadapPutih.toFixed(2)}:1):</strong> Memenuhi
                  standar aksesibilitas WCAG AA (≥ 4.5:1). Teks otomatis menggunakan warna{" "}
                  <strong>{teksTerbaik === "#ffffff" ? "putih" : "gelap"}</strong>.
                </div>
              )}
            </div>
          )}

          {/* Pratinjau Komponen Langsung */}
          <div>
            <span className="block text-[13px] font-medium text-n-700 mb-2.5">
              Pratinjau langsung elemen:
            </span>
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Kartu Pratinjau Interaktif */}
              <div className="rounded-token border border-n-200 bg-n-0 p-4 flex flex-col gap-3">
                <span className="teks-3 text-n-500 font-medium">Tombol, lencana & tautan:</span>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    style={{ backgroundColor: warnaValid ? warna : "var(--brand-600)", color: teksTerbaik }}
                    className="inline-flex items-center justify-center h-11 px-4 rounded-token font-medium text-[15px] select-none min-h-[44px]"
                  >
                    Tombol Utama
                  </button>
                  <Lencana nada="brand">Status Aktif</Lencana>
                  <a
                    href="#pratinjau"
                    onClick={(e) => e.preventDefault()}
                    style={{ color: warnaValid ? warna : "var(--brand-600)" }}
                    className="underline underline-offset-2 text-[14px] font-medium min-h-[44px] inline-flex items-center"
                  >
                    Tautan contoh
                  </a>
                </div>
              </div>

              {/* Kartu Aksen */}
              <div
                className="rounded-token p-4 border border-n-200 bg-n-0 flex flex-col justify-between"
                style={{ borderLeftWidth: "4px", borderLeftColor: warnaValid ? warna : "var(--brand-600)" }}
              >
                <div>
                  <p className="text-[14px] font-semibold text-n-800">Kartu Aksen Brand</p>
                  <p className="teks-3 text-n-500 mt-1">
                    Garis tepi dan sorotan komponen secara otomatis selaras dengan warna utama yang Anda tetapkan.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {pesanWarna && (
            <div
              className={`rounded-token border px-3 py-2 text-[13px] ${
                pesanWarna.jenis === "ok"
                  ? "border-ok-line bg-ok-bg text-ok-fg"
                  : "border-bad-line bg-bad-bg text-bad-fg"
              }`}
            >
              {pesanWarna.teks}
            </div>
          )}

          <div className="pt-2 flex justify-start">
            <TombolUtama
              type="button"
              disabled={!bolehSimpanWarna || sedangWarna}
              onClick={handleSimpanWarna}
            >
              {sedangWarna ? "Menyimpan…" : "Simpan warna"}
            </TombolUtama>
          </div>
        </Kartu>
      </section>

      {/* ============================================================
          3. SEKSI LOGO & IKON SITUS (FAVICON)
          ============================================================ */}
      <section aria-labelledby="judul-logo-favicon">
        <JudulSeksi>Logo dan ikon situs</JudulSeksi>
        <Kartu className="p-5 flex flex-col gap-6">
          <p className="teks-3 text-n-600">
            Satu berkas logo dipakai secara konsisten di seluruh tempat (header publik, sidebar
            panel, dan halaman masuk). Berkas dikompres otomatis di peramban sebelum diunggah.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Kolom Logo */}
            <div className="flex flex-col gap-3">
              <KotakUnggah
                label="Unggah logo"
                keterangan="PNG, WebP, atau SVG · raster diperkecil ke 400 px · maksimal 100 KB"
                terima="image/png,image/webp,image/svg+xml,image/jpeg"
                sedang={sedangUnggahLogo}
                onPilih={handlePilihLogo}
              />
              <RingkasanKompresi daftar={ringkasanLogo} />

              {/* Pratinjau Logo */}
              <div className="rounded-token border border-n-200 bg-n-50 p-3 flex flex-col gap-2">
                <span className="text-[12px] font-medium text-n-600">Pratinjau logo saat ini:</span>
                <div className="flex items-center gap-3 bg-n-0 p-3 rounded-token border border-n-200">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt="Pratinjau Logo"
                      className="h-9 w-9 object-contain rounded-token shrink-0"
                    />
                  ) : (
                    <LambangTeks teks="DWP" ukuran={36} />
                  )}
                  <JudulAplikasi baris1={identitas.namaAplikasi} baris2={identitas.namaUnit} />
                </div>
                {logoUrl && (
                  <div className="flex justify-end pt-1">
                    <TombolBahaya ukuran="kecil" type="button" onClick={handleHapusLogo} disabled={sedangBranding}>
                      Hapus logo
                    </TombolBahaya>
                  </div>
                )}
              </div>
            </div>

            {/* Kolom Favicon */}
            <div className="flex flex-col gap-3">
              <KotakUnggah
                label="Unggah ikon situs (favicon)"
                keterangan="PNG, WebP, atau SVG · dipangkas persegi 512 px · maksimal 50 KB"
                terima="image/png,image/webp,image/svg+xml,image/jpeg"
                sedang={sedangUnggahFavicon}
                onPilih={handlePilihFavicon}
              />
              <RingkasanFaviconDisplay daftar={ringkasanFavicon} />

              {/* Pratinjau Tab Peramban Favicon */}
              <div className="rounded-token border border-n-200 bg-n-50 p-3 flex flex-col gap-2">
                <span className="text-[12px] font-medium text-n-600">Pratinjau tab peramban:</span>
                <div className="bg-n-200/70 p-2 rounded-t-lg border-b border-n-300">
                  <div className="flex items-center gap-2 bg-n-0 px-3 py-1.5 rounded-token shadow-sm max-w-[280px]">
                    <div className="h-4 w-4 shrink-0 rounded flex items-center justify-center overflow-hidden">
                      {faviconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={faviconUrl}
                          alt="Favicon"
                          className="h-4 w-4 object-contain"
                        />
                      ) : (
                        <div className="h-3.5 w-3.5 rounded bg-brand-600 text-brand-contrast flex items-center justify-center text-[8px] font-bold">
                          D
                        </div>
                      )}
                    </div>
                    <span className="text-[12px] text-n-800 font-medium truncate flex-1">
                      {identitas.namaAplikasi} — {identitas.namaUnit}
                    </span>
                    <span className="text-[12px] text-n-400 select-none">×</span>
                  </div>
                </div>
                {faviconUrl && (
                  <div className="flex justify-end pt-1">
                    <TombolBahaya ukuran="kecil" type="button" onClick={handleHapusFavicon} disabled={sedangBranding}>
                      Hapus ikon situs
                    </TombolBahaya>
                  </div>
                )}
              </div>
            </div>
          </div>

          {pesanBranding && (
            <div
              className={`rounded-token border px-3 py-2 text-[13px] ${
                pesanBranding.jenis === "ok"
                  ? "border-ok-line bg-ok-bg text-ok-fg"
                  : "border-bad-line bg-bad-bg text-bad-fg"
              }`}
            >
              {pesanBranding.teks}
            </div>
          )}

          <div className="pt-2 flex justify-start">
            <TombolUtama
              type="button"
              disabled={sedangBranding || sedangUnggahLogo || sedangUnggahFavicon}
              onClick={handleSimpanBranding}
            >
              {sedangBranding ? "Menyimpan…" : "Simpan logo & ikon situs"}
            </TombolUtama>
          </div>
        </Kartu>
      </section>
    </div>
  );
}

function RingkasanFaviconDisplay({ daftar }: { daftar: BerkasTerpilih[] }) {
  if (daftar.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {daftar.map((b) => (
        <div
          key={b.id}
          className="flex items-center gap-3 rounded-token border border-n-200 bg-n-0 px-3 py-2"
        >
          <div className="h-8 w-8 rounded-token bg-n-100 shrink-0 flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.url} alt="" className="h-6 w-6 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-n-800 truncate">{b.nama}</p>
            <p className="teks-3 text-n-500">
              {ukuranTerbaca(b.ukuranAsli)} → <span className="text-ok-fg">{ukuranTerbaca(b.ukuranHasil)}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
