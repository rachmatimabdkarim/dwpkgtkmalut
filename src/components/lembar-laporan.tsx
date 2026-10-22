"use client";

import { useEffect, useState } from "react";
import type { DataLaporan } from "@/lib/laporan-data";

/**
 * LEMBAR LAPORAN — tampilan resmi pelaksanaan kegiatan.
 *
 * Satu komponen untuk DUA kegunaan: pratinjau di layar dan berkas cetak PDF.
 * Keduanya memakai kode ini, sehingga yang dilihat penyusun selalu sama dengan
 * yang dicetak.
 *
 * Susunan mengikuti laporan resmi:
 *   Judul → Identitas → A. Latar & tujuan → B. Kepanitiaan → C. Presensi
 *   → D. Anggaran & realisasi → E. Pelaksanaan & hasil → F. Dokumentasi
 *   → Penutup → Tanda tangan
 */
export function LembarLaporan({ data }: { data: DataLaporan }) {
  const { kegiatan, panitia, presensi, anggaran, dokumentasi, penandatangan, isian, logoUrl, kontak, validasi } = data;

  const tanggal = rentangTanggal(kegiatan.tanggalMulai, kegiatan.tanggalSelesai);
  const rupiah = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

  return (
    <article className="bg-n-0 text-n-900 mx-auto w-full max-w-[820px] p-6 sm:p-10 leading-relaxed">
      {/* ===== KOP SURAT =====
          Logo DWP di kiri (diambil dari logo aplikasi), nama lembaga di tengah,
          lalu GARIS GANDA sebagai batas kop — lazim pada surat resmi. */}
      <header className="pb-3">
        <div className="flex items-center gap-4">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Logo Dharma Wanita Persatuan"
              className="w-[86px] h-[86px] object-contain shrink-0"
            />
          )}
          <div className="flex-1 text-center">
            <p className="text-[13px] tracking-wide uppercase text-n-600">
              Dharma Wanita Persatuan
            </p>
            <p className="text-[15px] font-semibold uppercase leading-snug">
              Kantor Guru dan Tenaga Kependidikan Provinsi Maluku Utara
            </p>
            {/* Baris kontak — masih bagian kop surat, huruf lebih kecil & miring. */}
            <p className="mt-1 text-[10.5px] italic text-n-600 leading-snug">
              {[
                kontak.alamat,
                kontak.telepon ? `Telp. ${kontak.telepon}` : null,
                kontak.email ? `Email: ${kontak.email}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          {/* Penyeimbang agar teks tetap di tengah meski ada logo di kiri. */}
          {logoUrl && <div className="w-[86px] shrink-0" aria-hidden />}
        </div>

        {/* Garis kop surat: tebal di atas, tipis di bawah. */}
        <div className="mt-3 border-t-[3px] border-n-800" />
        <div className="mt-[2px] border-t border-n-800" />

        <h1 className="mt-4 text-[17px] font-bold uppercase text-center">
          Laporan Pelaksanaan Kegiatan
        </h1>
        {kegiatan.nomor && (
          <p className="text-[13px] text-n-600 mt-1 text-center">Nomor: {kegiatan.nomor}</p>
        )}
      </header>

      {/* ===== IDENTITAS ===== */}
      <Section judul="Identitas Kegiatan">
        <Tabel labelWidth="160px">
          <Baris label="Nama kegiatan" nilai={kegiatan.judul} />
          <Baris label="Bidang" nilai={kegiatan.bidang ?? "—"} />
          <Baris label="Hari/tanggal" nilai={tanggal} />
          <Baris label="Tempat" nilai={kegiatan.tempat ?? "—"} />
          <Baris label="Penanggung jawab" nilai={kegiatan.penanggungJawab} />
        </Tabel>
      </Section>

      {/* ===== A. LATAR & TUJUAN ===== */}
      {(kegiatan.uraian || kegiatan.tujuan) && (
        <Section judul="A. Latar Belakang dan Tujuan">
          {kegiatan.uraian && <Paragraf teks={kegiatan.uraian} />}
          {kegiatan.tujuan && (
            <>
              <p className="mt-2 font-semibold text-[13.5px]">Tujuan:</p>
              <Paragraf teks={kegiatan.tujuan} />
            </>
          )}
        </Section>
      )}

      {/* ===== B. KEPANITIAAN ===== */}
      <Section judul="B. Susunan Kepanitiaan">
        {panitia.length === 0 ? (
          <Kosong teks="Belum ada data kepanitiaan." />
        ) : (
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-n-100 text-left">
                <Th w="34px">No</Th>
                <Th>Nama</Th>
                <Th>Jabatan dalam Kepanitiaan</Th>
                <Th>Tugas</Th>
              </tr>
            </thead>
            <tbody>
              {panitia.map((p, i) => (
                <tr key={i} className="border-b border-n-200 align-top">
                  <Td>{i + 1}</Td>
                  <Td>{p.nama}</Td>
                  <Td>{p.jabatan}</Td>
                  <Td>
                    {p.tugas.length === 0 ? (
                      <span className="text-n-400">—</span>
                    ) : (
                      <ul className="list-none">
                        {p.tugas.map((t, j) => (
                          <li key={j}>
                            {t.selesai ? "✓" : "○"} {t.judul}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* ===== C. PRESENSI ===== */}
      <Section judul="C. Kehadiran Peserta">
        {/* Perbandingan sasaran vs kehadiran — diminta pemilik. */}
        <table className="w-full text-[13px] border-collapse mb-3">
          <thead>
            <tr className="bg-n-100 text-left">
              <Th>Sasaran Peserta</Th>
              <Th w="90px" align="right">
                Hadir
              </Th>
              <Th w="80px" align="right">
                Izin
              </Th>
              <Th w="80px" align="right">
                Sakit
              </Th>
              <Th w="120px" align="right">
                Persentase
              </Th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-n-200">
              <Td>
                {presensi.sasaranAngka !== null ? (
                  <>
                    {presensi.sasaranAngka} orang
                    {/* Keterangan tambahan hanya ditampilkan bila memang ada
                        keterangan di luar angkanya, supaya tidak dobel
                        menjadi "30 orang (30 orang anggota DWP)". */}
                    {presensi.sasaranTeks &&
                      presensi.sasaranTeks.replace(/[0-9]+/, "").replace(/orang/i, "").trim() !==
                        "" && (
                        <span className="text-n-600">
                          {" "}
                          ({presensi.sasaranTeks.replace(/^[0-9]+\s*(orang)?\s*/i, "")})
                        </span>
                      )}
                  </>
                ) : (
                  <span className="text-n-500 italic">
                    Sasaran belum diisi pada perencanaan
                  </span>
                )}
              </Td>
              <Td align="right">{presensi.hadir} orang</Td>
              <Td align="right">{presensi.izin} orang</Td>
              <Td align="right">{presensi.sakit} orang</Td>
              <Td align="right">
                {presensi.persentase !== null ? (
                  <strong>{presensi.persentase}%</strong>
                ) : (
                  <span className="text-n-400">—</span>
                )}
              </Td>
            </tr>
          </tbody>
        </table>

        {/* Rincian "Hadir / Izin / Sakit / Jumlah" DIHAPUS: isinya sudah
            tercakup tabel di atas. Dulu muncul dobel di sini. */}
        <p className="text-[12px] text-n-600 mb-1.5">
          Persentase = jumlah hadir dibanding sasaran peserta.
        </p>

        {presensi.daftar.length > 0 && (
          <div className="mt-3">
            <p className="text-[13px] font-semibold mb-1.5">Daftar hadir</p>
            <table className="w-full text-[12.5px] border-collapse">
              <thead>
                <tr className="bg-n-100 text-left">
                  <Th w="34px">No</Th>
                  <Th>Nama</Th>
                  <Th>Instansi</Th>
                  <Th w="90px">Keterangan</Th>
                </tr>
              </thead>
              <tbody>
                {presensi.daftar.map((a, i) => (
                  <tr key={i} className="border-b border-n-200">
                    <Td>{i + 1}</Td>
                    <Td>{a.nama}</Td>
                    <Td>{a.instansi ?? "—"}</Td>
                    <Td>{a.keterangan || "Hadir"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ===== D. ANGGARAN ===== */}
      <Section judul="D. Anggaran dan Realisasi">
        {anggaran.baris.length === 0 && anggaran.biayaLainJumlah === 0 ? (
          <Kosong teks="Tidak ada anggaran pada kegiatan ini." />
        ) : (
          <>
            <table className="w-full text-[12.5px] border-collapse">
              <thead>
                <tr className="bg-n-100 text-left">
                  <Th w="34px">No</Th>
                  <Th>Uraian</Th>
                  <Th w="60px">Vol</Th>
                  <Th w="70px">Satuan</Th>
                  <Th w="110px" align="right">
                    Rencana
                  </Th>
                  <Th w="110px" align="right">
                    Realisasi
                  </Th>
                </tr>
              </thead>
              <tbody>
                {anggaran.baris.map((b, i) => (
                  <tr key={b.id} className="border-b border-n-200">
                    <Td>{i + 1}</Td>
                    <Td>{b.uraian}</Td>
                    <Td>{b.jumlah}</Td>
                    <Td>{b.satuan ?? "—"}</Td>
                    <Td align="right">{rupiah(b.rencana)}</Td>
                    <Td align="right">{rupiah(b.realisasi)}</Td>
                  </tr>
                ))}
                {anggaran.biayaLainJumlah > 0 && (
                  <tr className="border-b border-n-200">
                    <Td>{anggaran.baris.length + 1}</Td>
                    <Td>{anggaran.biayaLainKeterangan || "Biaya lain-lain"}</Td>
                    <Td>1</Td>
                    <Td>paket</Td>
                    <Td align="right">—</Td>
                    <Td align="right">{rupiah(anggaran.biayaLainJumlah)}</Td>
                  </tr>
                )}
                <tr className="font-semibold bg-n-50">
                  <Td colSpan={4}>Jumlah</Td>
                  <Td align="right">{rupiah(anggaran.totalRencana)}</Td>
                  <Td align="right">{rupiah(anggaran.totalKeseluruhan)}</Td>
                </tr>
              </tbody>
            </table>

            {anggaran.totalRencana > 0 && (
              <p className="mt-2 text-[12.5px] text-n-600">
                Selisih terhadap rencana:{" "}
                <strong>
                  {rupiah(Math.abs(anggaran.totalRencana - anggaran.totalKeseluruhan))}
                </strong>{" "}
                ({anggaran.totalKeseluruhan > anggaran.totalRencana ? "melebihi" : "lebih hemat"}).
              </p>
            )}
          </>
        )}
      </Section>

      {/* ===== E. PELAKSANAAN ===== */}
      <Section judul="E. Pelaksanaan dan Hasil">
        {isian.ringkasan ? (
          <Paragraf teks={isian.ringkasan} />
        ) : (
          <Kosong teks="Ringkasan pelaksanaan belum diisi." />
        )}

        {isian.hasil && (
          <>
            <p className="mt-3 font-semibold text-[13.5px]">Hasil yang dicapai:</p>
            <Paragraf teks={isian.hasil} />
          </>
        )}

        {isian.kendala && (
          <>
            <p className="mt-3 font-semibold text-[13.5px]">Kendala:</p>
            <Paragraf teks={isian.kendala} />
          </>
        )}

        {isian.rekomendasi && (
          <>
            <p className="mt-3 font-semibold text-[13.5px]">Rekomendasi / tindak lanjut:</p>
            <Paragraf teks={isian.rekomendasi} />
          </>
        )}
      </Section>

      {/* ===== F. DOKUMENTASI ===== */}
      <Section judul="F. Dokumentasi">
        {dokumentasi.length === 0 ? (
          <Kosong teks="Belum ada foto yang dipilih untuk laporan. Pilih foto pada tab Dokumentasi." />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {dokumentasi.map((f, i) => (
              <figure key={i} className="break-inside-avoid">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.path}
                  alt={f.keterangan ?? `Dokumentasi ${i + 1}`}
                  className="w-full h-auto rounded border border-n-200"
                />
                <figcaption className="text-[11.5px] text-n-600 mt-1">
                  {f.keterangan || `Foto ${i + 1}`}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </Section>

      {/* ===== PENUTUP ===== */}
      <Section judul="Penutup">
        <Paragraf
          teks={
            isian.catatanPenutup ||
            "Demikian laporan pelaksanaan kegiatan ini disusun sebagai bahan evaluasi dan pertanggungjawaban."
          }
        />
      </Section>

      {/* ===== TANDA TANGAN + QR KEASLIAN =====
          Nama Ketua DWP selalu tercetak. Setelah Ketua memvalidasi, QR muncul
          di area tanda tangan — dipindai untuk membuktikan keaslian laporan. */}
      <div className="mt-10 flex justify-between items-end gap-6 break-inside-avoid">
        <div className="w-[190px] text-[11px] text-n-500">
          {validasi ? (
            <>
              <QrValidasi kode={validasi.kode} />
              <p className="mt-1.5 italic leading-snug">
                Pindai untuk memeriksa keaslian laporan ini.
              </p>
            </>
          ) : (
            <p className="italic leading-snug">
              Laporan ini belum divalidasi oleh Ketua Dharma Wanita Persatuan.
            </p>
          )}
        </div>

        <div className="text-center w-[240px] text-[13px]">
          <p>Ternate, {tanggalTandaTangan()}</p>
          <p className="font-semibold mt-1">{penandatangan.jabatan}</p>
          <div className="h-[64px]" />
          <p className="font-semibold underline">{penandatangan.nama}</p>
          {validasi && (
            <p className="text-[10.5px] text-n-500 mt-1">
              Divalidasi {new Date(validasi.divalidasiPada).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * QR KEASLIAN — dibuat di peramban supaya laporan tidak bergantung pada
 * layanan luar. Isinya menuju halaman pemeriksaan publik /validasi/<kode>.
 */
function QrValidasi({ kode }: { kode: string }) {
  const [gambar, setGambar] = useState<string | null>(null);

  useEffect(() => {
    const alamat = `${window.location.origin}/validasi/${kode}`;
    import("qrcode")
      .then((QR) => QR.toDataURL(alamat, { width: 260, margin: 1 }))
      .then(setGambar)
      .catch(() => setGambar(null));
  }, [kode]);

  if (!gambar) {
    return <div className="w-[92px] h-[92px] bg-n-100 rounded border border-n-200" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={gambar} alt={`QR validasi ${kode}`} className="w-[92px] h-[92px]" />
  );
}

/* ============ BAGIAN KECIL ============ */

function Section({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 break-inside-avoid">
      <h2 className="text-[14px] font-bold border-b border-n-300 pb-1 mb-2">{judul}</h2>
      {children}
    </section>
  );
}

function Tabel({
  children,
  labelWidth,
}: {
  children: React.ReactNode;
  labelWidth: string;
}) {
  return (
    <table className="text-[13px] border-collapse">
      <tbody>{children}</tbody>
    </table>
  );
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <tr className="align-top">
      <td className="py-0.5 pr-3 text-n-600 whitespace-nowrap">{label}</td>
      <td className="py-0.5 pr-2">:</td>
      <td className="py-0.5 font-medium">{nilai}</td>
    </tr>
  );
}

function Paragraf({ teks }: { teks: string }) {
  return (
    <div className="text-[13px] leading-relaxed whitespace-pre-wrap text-justify">{teks}</div>
  );
}

function Kosong({ teks }: { teks: string }) {
  return <p className="text-[12.5px] text-n-500 italic">{teks}</p>;
}

function Th({
  children,
  w,
  align,
}: {
  children: React.ReactNode;
  w?: string;
  align?: "right";
}) {
  return (
    <th
      style={w ? { width: w } : undefined}
      className={`border border-n-300 px-2 py-1 font-semibold ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  colSpan,
  align,
}: {
  children: React.ReactNode;
  colSpan?: number;
  align?: "right";
}) {
  return (
    <td
      colSpan={colSpan}
      className={`border border-n-300 px-2 py-1 ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </td>
  );
}

/* ============ TANGGAL ============ */

function rentangTanggal(mulai: string | null, selesai: string | null) {
  if (!mulai) return "—";
  const f = (t: string) =>
    new Date(`${t}T00:00:00`).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  if (!selesai || selesai === mulai) return f(mulai);
  return `${f(mulai)} s.d. ${f(selesai)}`;
}

function tanggalTandaTangan() {
  return new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
