import { NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb, PDFFont } from "pdf-lib";
import { penggunaSaatIni, klienServer } from "@/lib/supabase-server";
import { formatTanggal, formatRupiah } from "@/lib/kegiatan";

function potongTeks(teks: string, lebarMaks: number, font: PDFFont, ukuran: number): string[] {
  if (!teks) return ["—"];
  const paragraf = teks.split("\n");
  const baris: string[] = [];

  for (const p of paragraf) {
    if (!p.trim()) {
      baris.push("");
      continue;
    }
    const kata = p.split(/\s+/);
    let barisSaatIni = "";

    for (const k of kata) {
      const tes = barisSaatIni ? `${barisSaatIni} ${k}` : k;
      const lebar = font.widthOfTextAtSize(tes, ukuran);
      if (lebar <= lebarMaks) {
        barisSaatIni = tes;
      } else {
        if (barisSaatIni) baris.push(barisSaatIni);
        barisSaatIni = k;
      }
    }
    if (barisSaatIni) baris.push(barisSaatIni);
  }

  return baris;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // 1. Periksa sesi pengguna (hanya pengurus masuk)
  const pengguna = await penggunaSaatIni();
  if (!pengguna) {
    return new Response("Akses ditolak. Silakan masuk terlebih dahulu.", { status: 401 });
  }

  const { id } = await params;
  const sb = await klienServer();

  // 2. Ambil data kegiatan, pengaturan situs, laporan, RAB, dan foto
  const { data: keg } = await sb
    .from("activities")
    .select(
      "id, kode, judul, tujuan, sasaran, ringkasan, tanggal_mulai, tanggal_selesai, tempat, status, section_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (!keg) {
    return new Response("Data kegiatan tidak ditemukan.", { status: 404 });
  }

  const { data: settings } = await sb
    .from("site_settings")
    .select("nama_aplikasi, nama_unit, nama_organisasi, alamat, telepon, email, logo_path")
    .eq("id", 1)
    .maybeSingle();

  const { data: bagian } = keg.section_id
    ? await sb.from("sections").select("nama").eq("id", keg.section_id).maybeSingle()
    : { data: null };

  const { data: laporan } = await sb
    .from("activity_reports")
    .select("ringkasan, hasil, kendala, rekomendasi, jumlah_hadir, total_anggaran, total_realisasi")
    .eq("activity_id", id)
    .maybeSingle();

  const { data: rab } = await sb
    .from("budget_items")
    .select("uraian, satuan, jumlah, harga_satuan, realisasi")
    .eq("activity_id", id)
    .order("urutan", { ascending: true });

  const { data: foto } = await sb
    .from("attachments")
    .select("nama_asli, keterangan, path")
    .eq("entitas_id", id)
    .eq("bucket", "publik")
    .eq("status", "resmi")
    .order("diunggah_pada", { ascending: true });

  // 3. Susun dokumen PDF dengan pdf-lib
  const pdfDoc = await PDFDocument.create();
  const fontBiasa = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontTebal = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMiring = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const PAGE_WIDTH = 595.28; // A4
  const PAGE_HEIGHT = 841.89;
  const MARGIN_LEFT = 50;
  const MARGIN_RIGHT = 50;
  const MARGIN_BOTTOM = 55;
  const LEBAR_KONTEN = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 45;

  function buatHalamanBaru() {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - 45;
  }

  function pastikanRuang(tinggiDibutuhkan: number) {
    if (y - tinggiDibutuhkan < MARGIN_BOTTOM) {
      buatHalamanBaru();
    }
  }

  // Coba muat logo dari bucket publik
  let logoEmbedded = null;
  if (settings?.logo_path) {
    try {
      const { data: logoData } = await sb.storage.from("publik").download(settings.logo_path);
      if (logoData) {
        const arr = new Uint8Array(await logoData.arrayBuffer());
        if (settings.logo_path.toLowerCase().endsWith(".png")) {
          logoEmbedded = await pdfDoc.embedPng(arr);
        } else if (
          settings.logo_path.toLowerCase().endsWith(".jpg") ||
          settings.logo_path.toLowerCase().endsWith(".jpeg")
        ) {
          logoEmbedded = await pdfDoc.embedJpg(arr);
        }
      }
    } catch {
      // Abaikan jika gagal memuat logo
    }
  }

  // ===== KOP SURAT =====
  const kopTinggi = 65;
  const logoUkuran = 48;
  const logoX = MARGIN_LEFT;
  const teksKopX = logoEmbedded ? MARGIN_LEFT + logoUkuran + 12 : MARGIN_LEFT;

  if (logoEmbedded) {
    page.drawImage(logoEmbedded, {
      x: logoX,
      y: y - logoUkuran + 5,
      width: logoUkuran,
      height: logoUkuran,
    });
  }

  const teksNamaOrg = "DHARMA WANITA PERSATUAN";
  const teksUnit = (settings?.nama_unit || "KANTOR GTK PROVINSI MALUKU UTARA").toUpperCase();
  const teksAlamat = settings?.alamat || "Jl. Ki Hajar Dewantara, Kota Ternate, Provinsi Maluku Utara";
  const teksKontak = `Telp: ${settings?.telepon || "—"} | Email: ${settings?.email || "—"}`;

  page.drawText(teksNamaOrg, {
    x: teksKopX,
    y: y,
    size: 13,
    font: fontTebal,
    color: rgb(0.06, 0.46, 0.43), // brand-700
  });

  page.drawText(teksUnit, {
    x: teksKopX,
    y: y - 14,
    size: 11,
    font: fontTebal,
    color: rgb(0.15, 0.23, 0.28), // n-800
  });

  page.drawText(teksAlamat, {
    x: teksKopX,
    y: y - 27,
    size: 8,
    font: fontBiasa,
    color: rgb(0.4, 0.45, 0.5), // n-500
  });

  page.drawText(teksKontak, {
    x: teksKopX,
    y: y - 38,
    size: 8,
    font: fontBiasa,
    color: rgb(0.4, 0.45, 0.5),
  });

  y -= kopTinggi;

  // Garis ganda kop surat
  page.drawLine({
    start: { x: MARGIN_LEFT, y },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
    thickness: 1.5,
    color: rgb(0.06, 0.46, 0.43),
  });
  page.drawLine({
    start: { x: MARGIN_LEFT, y: y - 2.5 },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: y - 2.5 },
    thickness: 0.5,
    color: rgb(0.06, 0.46, 0.43),
  });

  y -= 22;

  // ===== JUDUL LAPORAN =====
  const judulLaporan = "LAPORAN PELAKSANAAN KEGIATAN";
  const lebarJudul = fontTebal.widthOfTextAtSize(judulLaporan, 13);
  page.drawText(judulLaporan, {
    x: (PAGE_WIDTH - lebarJudul) / 2,
    y,
    size: 13,
    font: fontTebal,
    color: rgb(0.1, 0.15, 0.2),
  });

  y -= 14;
  const kodeTeks = `Nomor Kode: ${keg.kode || keg.id.slice(0, 8).toUpperCase()}`;
  const lebarKode = fontBiasa.widthOfTextAtSize(kodeTeks, 9);
  page.drawText(kodeTeks, {
    x: (PAGE_WIDTH - lebarKode) / 2,
    y,
    size: 9,
    font: fontBiasa,
    color: rgb(0.3, 0.35, 0.4),
  });

  y -= 22;

  // Helper untuk menggambar judul bagian
  function gambarJudulBagian(judul: string) {
    pastikanRuang(28);
    page.drawRectangle({
      x: MARGIN_LEFT,
      y: y - 4,
      width: LEBAR_KONTEN,
      height: 18,
      color: rgb(0.94, 0.96, 0.96),
    });
    page.drawText(judul, {
      x: MARGIN_LEFT + 6,
      y: y + 1,
      size: 9.5,
      font: fontTebal,
      color: rgb(0.06, 0.46, 0.43),
    });
    y -= 18;
  }

  // ===== 1. INFORMASI KEGIATAN =====
  gambarJudulBagian("I. INFORMASI KEGIATAN");

  const infoItems = [
    { label: "Nama Kegiatan", nilai: keg.judul },
    { label: "Bidang / Seksi", nilai: bagian?.nama || "Umum / Pengurus" },
    {
      label: "Tanggal Pelaksanaan",
      nilai:
        formatTanggal(keg.tanggal_mulai) +
        (keg.tanggal_selesai && keg.tanggal_selesai !== keg.tanggal_mulai
          ? ` s.d. ${formatTanggal(keg.tanggal_selesai)}`
          : ""),
    },
    { label: "Tempat", nilai: keg.tempat || "—" },
    { label: "Jumlah Peserta Hadir", nilai: `${laporan?.jumlah_hadir ?? 0} orang` },
  ];

  for (const item of infoItems) {
    pastikanRuang(16);
    page.drawText(item.label, {
      x: MARGIN_LEFT + 6,
      y,
      size: 8.5,
      font: fontTebal,
      color: rgb(0.2, 0.25, 0.3),
    });
    page.drawText(":", {
      x: MARGIN_LEFT + 130,
      y,
      size: 8.5,
      font: fontBiasa,
      color: rgb(0.2, 0.25, 0.3),
    });

    const barisNilai = potongTeks(item.nilai, LEBAR_KONTEN - 140, fontBiasa, 8.5);
    for (let i = 0; i < barisNilai.length; i++) {
      if (i > 0) {
        pastikanRuang(12);
      }
      page.drawText(barisNilai[i], {
        x: MARGIN_LEFT + 140,
        y,
        size: 8.5,
        font: fontBiasa,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 12;
    }
  }

  y -= 6;

  // ===== 2. RINGKASAN PELAKSANAAN =====
  gambarJudulBagian("II. RINGKASAN PELAKSANAAN");
  const teksRingkasan = laporan?.ringkasan || keg.ringkasan || "Tidak ada ringkasan tertulis.";
  const barisRingkasan = potongTeks(teksRingkasan, LEBAR_KONTEN - 12, fontBiasa, 8.5);
  for (const b of barisRingkasan) {
    pastikanRuang(12);
    page.drawText(b, {
      x: MARGIN_LEFT + 6,
      y,
      size: 8.5,
      font: fontBiasa,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 12;
  }
  y -= 6;

  // ===== 3. HASIL YANG DICAPAI =====
  gambarJudulBagian("III. HASIL YANG DICAPAI");
  const teksHasil = laporan?.hasil || "Tidak ada hasil pelaksanaan yang dicatat.";
  const barisHasil = potongTeks(teksHasil, LEBAR_KONTEN - 12, fontBiasa, 8.5);
  for (const b of barisHasil) {
    pastikanRuang(12);
    page.drawText(b, {
      x: MARGIN_LEFT + 6,
      y,
      size: 8.5,
      font: fontBiasa,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 12;
  }
  y -= 6;

  // ===== 4. KENDALA & REKOMENDASI =====
  gambarJudulBagian("IV. KENDALA DAN REKOMENDASI");

  pastikanRuang(14);
  page.drawText("A. Kendala:", {
    x: MARGIN_LEFT + 6,
    y,
    size: 8.5,
    font: fontTebal,
    color: rgb(0.2, 0.25, 0.3),
  });
  y -= 12;

  const barisKendala = potongTeks(laporan?.kendala || "—", LEBAR_KONTEN - 20, fontBiasa, 8.5);
  for (const b of barisKendala) {
    pastikanRuang(12);
    page.drawText(b, {
      x: MARGIN_LEFT + 14,
      y,
      size: 8.5,
      font: fontBiasa,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 12;
  }

  y -= 4;
  pastikanRuang(14);
  page.drawText("B. Rekomendasi:", {
    x: MARGIN_LEFT + 6,
    y,
    size: 8.5,
    font: fontTebal,
    color: rgb(0.2, 0.25, 0.3),
  });
  y -= 12;

  const barisRekomendasi = potongTeks(
    laporan?.rekomendasi || "—",
    LEBAR_KONTEN - 20,
    fontBiasa,
    8.5,
  );
  for (const b of barisRekomendasi) {
    pastikanRuang(12);
    page.drawText(b, {
      x: MARGIN_LEFT + 14,
      y,
      size: 8.5,
      font: fontBiasa,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 12;
  }
  y -= 6;

  // ===== 5. RINCIAN ANGGARAN & REALISASI (INTERNAL) =====
  gambarJudulBagian("V. REALISASI ANGGARAN BIAYA (RAB VS REALISASI)");

  pastikanRuang(14);
  page.drawText("* Bagian ini memuat data keuangan internal organisasi DWP.", {
    x: MARGIN_LEFT + 6,
    y,
    size: 7.5,
    font: fontMiring,
    color: rgb(0.5, 0.4, 0.1),
  });
  y -= 12;

  if (!rab || rab.length === 0) {
    pastikanRuang(14);
    page.drawText("Tidak ada rincian anggaran yang tercatat.", {
      x: MARGIN_LEFT + 6,
      y,
      size: 8.5,
      font: fontMiring,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= 12;
  } else {
    // Header tabel RAB
    pastikanRuang(18);
    const tblY = y;
    page.drawRectangle({
      x: MARGIN_LEFT,
      y: tblY - 4,
      width: LEBAR_KONTEN,
      height: 16,
      color: rgb(0.9, 0.92, 0.94),
    });

    const colX = {
      no: MARGIN_LEFT + 4,
      uraian: MARGIN_LEFT + 24,
      satuan: MARGIN_LEFT + 175,
      vol: MARGIN_LEFT + 225,
      rencana: MARGIN_LEFT + 270,
      realisasi: MARGIN_LEFT + 380,
    };

    page.drawText("No", { x: colX.no, y: tblY, size: 7.5, font: fontTebal });
    page.drawText("Uraian", { x: colX.uraian, y: tblY, size: 7.5, font: fontTebal });
    page.drawText("Satuan", { x: colX.satuan, y: tblY, size: 7.5, font: fontTebal });
    page.drawText("Vol", { x: colX.vol, y: tblY, size: 7.5, font: fontTebal });
    page.drawText("Rencana (RAB)", { x: colX.rencana, y: tblY, size: 7.5, font: fontTebal });
    page.drawText("Realisasi", { x: colX.realisasi, y: tblY, size: 7.5, font: fontTebal });
    y -= 14;

    let totRencana = 0;
    let totRealisasi = 0;

    for (let i = 0; i < rab.length; i++) {
      pastikanRuang(14);
      const b = rab[i];
      const subtotalRencana = Number(b.jumlah || 0) * Number(b.harga_satuan || 0);
      const subtotalRealisasi = Number(b.realisasi ?? subtotalRencana);
      totRencana += subtotalRencana;
      totRealisasi += subtotalRealisasi;

      const barisBg = i % 2 === 1;
      if (barisBg) {
        page.drawRectangle({
          x: MARGIN_LEFT,
          y: y - 3,
          width: LEBAR_KONTEN,
          height: 13,
          color: rgb(0.97, 0.98, 0.99),
        });
      }

      page.drawText(String(i + 1), { x: colX.no, y, size: 7.5, font: fontBiasa });

      const uraianSingkat =
        b.uraian.length > 30 ? b.uraian.slice(0, 29) + "…" : b.uraian;
      page.drawText(uraianSingkat, { x: colX.uraian, y, size: 7.5, font: fontBiasa });
      page.drawText(b.satuan || "—", { x: colX.satuan, y, size: 7.5, font: fontBiasa });
      page.drawText(String(b.jumlah), { x: colX.vol, y, size: 7.5, font: fontBiasa });
      page.drawText(formatRupiah(subtotalRencana), {
        x: colX.rencana,
        y,
        size: 7.5,
        font: fontBiasa,
      });
      page.drawText(formatRupiah(subtotalRealisasi), {
        x: colX.realisasi,
        y,
        size: 7.5,
        font: fontBiasa,
      });

      y -= 13;
    }

    // Baris Total
    pastikanRuang(16);
    page.drawLine({
      start: { x: MARGIN_LEFT, y: y + 2 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: y + 2 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });
    page.drawText("TOTAL", {
      x: colX.uraian,
      y: y - 8,
      size: 8,
      font: fontTebal,
    });
    page.drawText(formatRupiah(totRencana), {
      x: colX.rencana,
      y: y - 8,
      size: 8,
      font: fontTebal,
    });
    page.drawText(formatRupiah(totRealisasi), {
      x: colX.realisasi,
      y: y - 8,
      size: 8,
      font: fontTebal,
      color:
        totRealisasi > totRencana
          ? rgb(0.7, 0.1, 0.1)
          : rgb(0.06, 0.46, 0.43),
    });
    y -= 20;
  }

  y -= 4;

  // ===== 6. DAFTAR DOKUMENTASI PUBLIK =====
  gambarJudulBagian("VI. DOKUMENTASI KEGIATAN");

  if (!foto || foto.length === 0) {
    pastikanRuang(14);
    page.drawText("Belum ada foto dokumentasi resmi yang diunggah.", {
      x: MARGIN_LEFT + 6,
      y,
      size: 8.5,
      font: fontMiring,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= 12;
  } else {
    pastikanRuang(14);
    page.drawText(`Tercatat ${foto.length} foto dokumentasi resmi:`, {
      x: MARGIN_LEFT + 6,
      y,
      size: 8.5,
      font: fontBiasa,
    });
    y -= 12;

    for (let i = 0; i < foto.length; i++) {
      pastikanRuang(12);
      const f = foto[i];
      const ket = f.keterangan ? `${f.keterangan} (${f.nama_asli})` : f.nama_asli;
      const barisKet = potongTeks(`• ${ket}`, LEBAR_KONTEN - 20, fontBiasa, 8);
      for (const bk of barisKet) {
        pastikanRuang(11);
        page.drawText(bk, {
          x: MARGIN_LEFT + 12,
          y,
          size: 8,
          font: fontBiasa,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 11;
      }
    }
  }

  // ===== NOMOR HALAMAN PADA SEMUA HALAMAN =====
  const totalHalaman = pdfDoc.getPageCount();
  const pages = pdfDoc.getPages();
  for (let i = 0; i < totalHalaman; i++) {
    const p = pages[i];
    // Garis pemisah footer
    p.drawLine({
      start: { x: MARGIN_LEFT, y: 40 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: 40 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });

    const infoKiri = "Sistem Informasi DWP Kantor GTK Malut — Dokumen Internal";
    p.drawText(infoKiri, {
      x: MARGIN_LEFT,
      y: 28,
      size: 7.5,
      font: fontBiasa,
      color: rgb(0.45, 0.5, 0.55),
    });

    const infoKanan = `Halaman ${i + 1} dari ${totalHalaman}`;
    const lebarKanan = fontBiasa.widthOfTextAtSize(infoKanan, 7.5);
    p.drawText(infoKanan, {
      x: PAGE_WIDTH - MARGIN_RIGHT - lebarKanan,
      y: 28,
      size: 7.5,
      font: fontBiasa,
      color: rgb(0.45, 0.5, 0.55),
    });
  }

  // 4. Konversi ke Uint8Array dan kirim sebagai berkas unduhan
  const pdfBytes = await pdfDoc.save();
  const kodeBersih = keg.kode
    ? keg.kode.replace(/[^a-zA-Z0-9_-]/g, "-")
    : keg.id.slice(0, 8);
  const namaBerkas = `Laporan-${kodeBersih}.pdf`;

  return new Response(pdfBytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${namaBerkas}"`,
      "Content-Length": String(pdfBytes.byteLength),
      "Cache-Control": "private, no-cache",
    },
  });
}
