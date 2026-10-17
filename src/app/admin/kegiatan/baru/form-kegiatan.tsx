"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Kartu, JudulSeksi, Lencana, TombolUtama, TombolSekunder, TombolHalus, Kolom, Isian, AreaTeks, Pilihan } from "@/components/dasar";
import { labelStatus, formatRupiah } from "@/lib/kegiatan";
import { buatKegiatan, ubahKegiatan } from "../aksi";

type BarisRab = { uraian: string; satuan: string; jumlah: number; hargaSatuan: number };

const LANGKAH = ["Data kegiatan", "Anggaran", "Tinjau & kirim"];

export function FormKegiatanBaru({
  bidang,
  pengurus,
  bidangSaya,
  pengurusHarian,
  sayaSendiri,
  kegiatan,
}: {
  bidang: { id: string; nama: string }[];
  pengurus: { id: string; nama: string; jabatan: string; bidang?: string | null }[];
  /** Bidang pengguna yang masuk. Kosong = Pengurus Harian (bebas memilih). */
  bidangSaya: string | null;
  /** Benar bila pengguna termasuk Pengurus Harian (bebas memilih bidang). */
  pengurusHarian: boolean;
  /** Data pengguna yang masuk, untuk batas penanggung jawab. */
  sayaSendiri: { id: string; nama: string };
  /** Bila diisi -> mode UBAH kegiatan yang sudah ada (termasuk RAB). */
  kegiatan?: {
    id: string;
    judul: string;
    tujuan: string | null;
    sasaran: string | null;
    tanggalMulai: string | null;
    tanggalSelesai: string | null;
    tempat: string | null;
    ringkasan: string | null;
    anggaran: { uraian: string; satuan: string | null; jumlah: number; hargaSatuan: number }[];
  };
}) {
  const router = useRouter();
  const [langkah, setLangkah] = useState(0);
  const [sedang, setSedang] = useState(false);
  const [galat, setGalat] = useState("");

  const modeUbah = !!kegiatan;
  const [judul, setJudul] = useState(kegiatan?.judul ?? "");
  const [tujuan, setTujuan] = useState(kegiatan?.tujuan ?? "");
  const [sasaran, setSasaran] = useState(kegiatan?.sasaran ?? "");
  const [tanggalMulai, setTanggalMulai] = useState(kegiatan?.tanggalMulai ?? "");
  const [tanggalSelesai, setTanggalSelesai] = useState(kegiatan?.tanggalSelesai ?? "");
  const [tempat, setTempat] = useState(kegiatan?.tempat ?? "");
  // Bidang terkunci bila pengguna terikat satu bidang (Ketua Bidang/anggota).
  // Pengurus Harian bebas memilih karena menangani lintas bidang.
  const bidangTerkunci = !pengurusHarian && !!bidangSaya;
  const sectionIdAwal = bidangTerkunci
    ? (bidang.find((b) => b.nama === bidangSaya)?.id ?? "")
    : "";
  const [sectionId, setSectionId] = useState(sectionIdAwal);
  const [penanggungJawab, setPenanggungJawab] = useState("");
  const [ringkasan, setRingkasan] = useState(kegiatan?.ringkasan ?? "");
  const [rab, setRab] = useState<BarisRab[]>(
    kegiatan && kegiatan.anggaran.length > 0
      ? kegiatan.anggaran.map((b) => ({
          uraian: b.uraian,
          satuan: b.satuan ?? "",
          jumlah: b.jumlah,
          hargaSatuan: b.hargaSatuan,
        }))
      : [{ uraian: "", satuan: "", jumlah: 1, hargaSatuan: 0 }],
  );

  // Penanggung jawab: diri sendiri + anggota bidang yang sama.
  // Pengurus Harian bebas menunjuk siapa saja.
  const daftarPenanggungJawab = useMemo(() => {
    if (pengurusHarian) return pengurus;
    return pengurus.filter(
      (p) => p.id === sayaSendiri.id || (!!p.bidang && p.bidang === bidangSaya),
    );
  }, [pengurus, pengurusHarian, bidangSaya, sayaSendiri.id]);

  const total = useMemo(
    () => rab.reduce((j, b) => j + (b.jumlah || 0) * (b.hargaSatuan || 0), 0),
    [rab],
  );

  function ubahBaris(i: number, ubah: Partial<BarisRab>) {
    setRab((lama) => lama.map((b, n) => (n === i ? { ...b, ...ubah } : b)));
  }

  function lanjut() {
    setGalat("");
    if (langkah === 0) {
      if (!judul.trim()) return setGalat("Nama kegiatan wajib diisi.");
      if (!tanggalMulai) return setGalat("Tanggal pelaksanaan wajib diisi.");
      if (!tempat.trim()) return setGalat("Tempat wajib diisi.");
    }
    setLangkah((l) => Math.min(l + 1, LANGKAH.length - 1));
  }

  async function kirim(ajukanSekarang: boolean) {
    setGalat("");
    setSedang(true);

    // MODE UBAH: simpan data + RAB, lalu kembali ke halaman kegiatan.
    // Tidak ada "ajukan sekarang" — pengajuan tetap lewat tombolnya sendiri,
    // supaya perubahan data dan pengajuan tidak tercampur.
    if (kegiatan) {
      const r = await ubahKegiatan(kegiatan.id, {
        judul, tujuan, sasaran, tanggalMulai, tanggalSelesai, tempat, ringkasan, anggaran: rab,
      });
      setSedang(false);
      if (r.galat) return setGalat(r.galat);
      router.push(`/admin/kegiatan/${kegiatan.id}`);
      router.refresh();
      return;
    }

    const hasil = await buatKegiatan({
      judul,
      tujuan,
      sasaran,
      tanggalMulai,
      tanggalSelesai,
      tempat,
      sectionId,
      penanggungJawab,
      namaBidang: bidangSaya ?? bidang.find((b) => b.id === sectionId)?.nama ?? "",
      ringkasan,
      ajukanSekarang,
      anggaran: rab,
    });
    setSedang(false);
    if (hasil.galat) return setGalat(hasil.galat);
    router.push(`/admin/kegiatan/${hasil.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-[720px]">
      {/* Penunjuk langkah */}
      <ol className="flex items-center gap-2 mb-6">
        {LANGKAH.map((n, i) => (
          <li key={n} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold ${
                i <= langkah ? "bg-brand-600 text-brand-contrast" : "bg-n-200 text-n-500"
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-[13px] ${i === langkah ? "text-n-800 font-medium" : "text-n-500"}`}>
              {n}
            </span>
            {i < LANGKAH.length - 1 && <span className="w-6 sm:w-10 h-px bg-n-300" />}
          </li>
        ))}
      </ol>

      <Kartu className="p-4 sm:p-5">
        {langkah === 0 && (
          <div className="flex flex-col gap-4">
            <JudulSeksi>{modeUbah ? "Ubah data kegiatan" : "Data kegiatan"}</JudulSeksi>
            <Kolom label="Nama kegiatan" galat={galat && !judul.trim() ? galat : undefined}>
              <Isian
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Pelatihan Literasi Digital Anggota DWP"
              />
            </Kolom>
            <Kolom label="Tujuan kegiatan" bantuan="Ditulis singkat; dipakai sebagai ringkasan di agenda publik.">
              <AreaTeks
                value={tujuan}
                onChange={(e) => setTujuan(e.target.value)}
                placeholder="Contoh: Meningkatkan kemampuan anggota menggunakan aplikasi perkantoran"
              />
            </Kolom>
            <Kolom label="Sasaran peserta">
              <Isian
                value={sasaran}
                onChange={(e) => setSasaran(e.target.value)}
                placeholder="Contoh: 30 anggota DWP"
              />
            </Kolom>
            <div className="grid sm:grid-cols-2 gap-4">
              <Kolom label="Tanggal mulai">
                <Isian type="date" value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)} />
              </Kolom>
              <Kolom label="Tanggal selesai" bantuan="Isi tanggal yang sama bila kegiatan hanya satu hari.">
                <Isian type="date" value={tanggalSelesai} onChange={(e) => setTanggalSelesai(e.target.value)} />
              </Kolom>
            </div>
            <Kolom label="Tempat">
              <Isian
                value={tempat}
                onChange={(e) => setTempat(e.target.value)}
                placeholder="Contoh: Aula Kantor GTK Malut, Tidore"
              />
            </Kolom>
            <div className="grid sm:grid-cols-2 gap-4">
              <Kolom
                label="Bidang pelaksana"
                bantuan={
                  bidangTerkunci
                    ? "Terisi otomatis dari akun Anda dan tidak dapat diubah."
                    : "Anda Pengurus Harian — bebas memilih bidang pelaksana."
                }
              >
                {bidangTerkunci ? (
                  // Terkunci: ditampilkan sebagai keterangan, bukan pilihan,
                  // supaya tidak bisa diubah dan jelas bukan kolom rusak.
                  <div
                    className="min-h-[44px] flex items-center rounded-token border px-3.5 text-[15px] font-medium"
                    style={{
                      backgroundColor: "var(--n-100)",
                      borderColor: "var(--n-200)",
                      color: "var(--dasar-700)",
                    }}
                  >
                    {bidangSaya}
                  </div>
                ) : (
                  <Pilihan value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                    <option value="">Pilih bidang</option>
                    {bidang.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nama}
                      </option>
                    ))}
                  </Pilihan>
                )}
              </Kolom>
              <Kolom
                label="Penanggung jawab"
                bantuan={
                  pengurusHarian
                    ? "Sebagai Pengurus Harian, Anda bebas menunjuk siapa saja."
                    : "Hanya diri Anda sendiri atau anggota bidang Anda."
                }
              >
                <Pilihan value={penanggungJawab} onChange={(e) => setPenanggungJawab(e.target.value)}>
                  <option value="">Saya sendiri — {sayaSendiri.nama}</option>
                  {daftarPenanggungJawab
                    .filter((p) => p.id !== sayaSendiri.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} — {p.jabatan}
                      </option>
                    ))}
                </Pilihan>
              </Kolom>
            </div>
            <Kolom label="Ringkasan untuk publik" bantuan="Muncul di halaman Agenda setelah disetujui. Boleh dikosongkan.">
              <AreaTeks
                value={ringkasan}
                onChange={(e) => setRingkasan(e.target.value)}
                placeholder="Satu sampai dua kalimat"
              />
            </Kolom>
          </div>
        )}

        {langkah === 1 && (
          <div>
            <JudulSeksi>Rincian anggaran (RAB)</JudulSeksi>
            <p className="teks-3 text-n-500 -mt-2 mb-4">
              Isi perkiraan biaya. Boleh dilewati bila kegiatan tanpa anggaran.
            </p>

            <div className="flex flex-col gap-3">
              {rab.map((b, i) => (
                <div key={i} className="rounded-token border border-n-200 p-3">
                  <div className="grid sm:grid-cols-[1fr_90px_80px_120px] gap-3">
                    <Kolom label="Uraian">
                      <Isian
                        value={b.uraian}
                        onChange={(e) => ubahBaris(i, { uraian: e.target.value })}
                        placeholder="Contoh: Konsumsi peserta"
                      />
                    </Kolom>
                    <Kolom label="Satuan">
                      <Isian value={b.satuan} onChange={(e) => ubahBaris(i, { satuan: e.target.value })} placeholder="box" />
                    </Kolom>
                    <Kolom label="Jumlah">
                      <Isian
                        type="number"
                        min={0}
                        value={b.jumlah}
                        onChange={(e) => ubahBaris(i, { jumlah: Number(e.target.value) })}
                      />
                    </Kolom>
                    <Kolom label="Harga satuan">
                      <Isian
                        type="number"
                        min={0}
                        value={b.hargaSatuan}
                        onChange={(e) => ubahBaris(i, { hargaSatuan: Number(e.target.value) })}
                      />
                    </Kolom>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="teks-3 text-n-500">
                      Jumlah: <span className="text-n-700">{formatRupiah(b.jumlah * b.hargaSatuan)}</span>
                    </span>
                    {rab.length > 1 && (
                      <TombolHalus ukuran="kecil" onClick={() => setRab(rab.filter((_, n) => n !== i))}>
                        Hapus baris
                      </TombolHalus>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <TombolSekunder
                ukuran="kecil"
                onClick={() => setRab([...rab, { uraian: "", satuan: "", jumlah: 1, hargaSatuan: 0 }])}
              >
                + Tambah baris
              </TombolSekunder>
              <span className="text-n-700 font-medium">Total: {formatRupiah(total)}</span>
            </div>
          </div>
        )}

        {langkah === 2 && (
          <div>
            <JudulSeksi>Tinjau sebelum dikirim</JudulSeksi>
            <dl className="grid sm:grid-cols-2 gap-3 teks-3">
              <div>
                <dt className="text-n-500">Nama kegiatan</dt>
                <dd className="text-n-800 text-[14px]">{judul || "—"}</dd>
              </div>
              <div>
                <dt className="text-n-500">Tempat</dt>
                <dd className="text-n-800 text-[14px]">{tempat || "—"}</dd>
              </div>
              <div>
                <dt className="text-n-500">Tanggal</dt>
                <dd className="text-n-800 text-[14px]">
                  {tanggalMulai || "—"} {tanggalSelesai ? `s.d. ${tanggalSelesai}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-n-500">Total anggaran</dt>
                <dd className="text-n-800 text-[14px]">{formatRupiah(total)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center gap-2">
              <Lencana nada={labelStatus("draf").nada}>Draf</Lencana>
              <span className="teks-3 text-n-500">
                Draf hanya terlihat pengurus. Ajukan untuk mulai persetujuan.
              </span>
            </div>
          </div>
        )}

        {galat && langkah !== 0 && (
          <p className="mt-4 rounded-token border border-bad-line bg-bad-bg px-3 py-2 text-[13px] text-bad-fg">
            {galat}
          </p>
        )}
      </Kartu>

      {/* Satu aksi utama yang jelas */}
      <div className="flex flex-wrap items-center gap-3 mt-5">
        {langkah > 0 && (
          <TombolSekunder onClick={() => setLangkah((l) => l - 1)} disabled={sedang}>
            Kembali
          </TombolSekunder>
        )}
        {langkah < LANGKAH.length - 1 ? (
          <TombolUtama onClick={lanjut} disabled={sedang}>
            Lanjut
          </TombolUtama>
        ) : modeUbah ? (
          // MODE UBAH: satu tombol saja. Pengajuan tetap lewat tombolnya
          // sendiri di halaman kegiatan, supaya simpan & ajukan tidak tercampur.
          <TombolUtama onClick={() => kirim(false)} disabled={sedang}>
            {sedang ? "Menyimpan…" : "Simpan Perubahan"}
          </TombolUtama>
        ) : (
          <>
            <TombolUtama onClick={() => kirim(true)} disabled={sedang}>
              {sedang ? "Mengirim…" : "Ajukan"}
            </TombolUtama>
            <TombolSekunder onClick={() => kirim(false)} disabled={sedang}>
              Simpan Draf
            </TombolSekunder>
          </>
        )}
      </div>
    </div>
  );
}
