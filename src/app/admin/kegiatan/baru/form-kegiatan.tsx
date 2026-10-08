"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Kartu, JudulSeksi, Lencana, TombolUtama, TombolSekunder, TombolHalus, Kolom, Isian, AreaTeks, Pilihan } from "@/components/dasar";
import { labelStatus, formatRupiah } from "@/lib/kegiatan";
import { buatKegiatan } from "../aksi";

type BarisRab = { uraian: string; satuan: string; jumlah: number; hargaSatuan: number };

const LANGKAH = ["Data kegiatan", "Anggaran", "Tinjau & kirim"];

export function FormKegiatanBaru({
  bidang,
  pengurus,
}: {
  bidang: { id: string; nama: string }[];
  pengurus: { id: string; nama: string; jabatan: string }[];
}) {
  const router = useRouter();
  const [langkah, setLangkah] = useState(0);
  const [sedang, setSedang] = useState(false);
  const [galat, setGalat] = useState("");

  const [judul, setJudul] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [sasaran, setSasaran] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [tempat, setTempat] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [penanggungJawab, setPenanggungJawab] = useState("");
  const [ringkasan, setRingkasan] = useState("");
  const [rab, setRab] = useState<BarisRab[]>([{ uraian: "", satuan: "", jumlah: 1, hargaSatuan: 0 }]);

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
    const hasil = await buatKegiatan({
      judul,
      tujuan,
      sasaran,
      tanggalMulai,
      tanggalSelesai,
      tempat,
      sectionId,
      penanggungJawab,
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
            <JudulSeksi>Data kegiatan</JudulSeksi>
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
              <Kolom label="Tanggal selesai" bantuan="Kosongkan bila satu hari.">
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
              <Kolom label="Bidang pelaksana">
                <Pilihan value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                  <option value="">Pilih bidang</option>
                  {bidang.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nama}
                    </option>
                  ))}
                </Pilihan>
              </Kolom>
              <Kolom label="Penanggung jawab">
                <Pilihan value={penanggungJawab} onChange={(e) => setPenanggungJawab(e.target.value)}>
                  <option value="">Saya sendiri</option>
                  {pengurus.map((p) => (
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
