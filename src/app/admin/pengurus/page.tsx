import { KerangkaAdmin } from "@/components/kerangka-admin";
import { sesiWajibPeran } from "@/lib/sesi-server";
import { Kartu, JudulSeksi, Lencana, Kosong, TombolUtama } from "@/components/dasar";
import { klienServer } from "@/lib/supabase-server";

export const metadata = { title: "Pengurus" };
export const instant = false;

type BarisPengurus = {
  id: string;
  nama: string;
  bidang: string;
  jabatan: string;
  urutan: number;
  email: string | null;
  profile_id: string | null;
};

export default async function HalamanPengurus() {
  const pengguna = await sesiWajibPeran(["super_admin", "ketua", "wakil_ketua", "sekretaris"]);
  const sb = await klienServer();

  const { data: periode } = await sb
    .from("periods")
    .select("nama, mulai, selesai")
    .eq("aktif", true)
    .maybeSingle<{ nama: string; mulai: string; selesai: string | null }>();

  const { data } = await sb
    .from("officers")
    .select("id, nama, bidang, jabatan, urutan, email, profile_id")
    .order("urutan");
  const daftar: BarisPengurus[] = data ?? [];

  // kelompokkan per bidang, urut sesuai urutan
  const bidangUrut = Array.from(new Set(daftar.map((d) => d.bidang)));
  const perBidang = bidangUrut.map((b) => ({
    bidang: b,
    anggota: daftar.filter((d) => d.bidang === b),
  }));

  const jumlahBelumBerakun = daftar.filter((d) => !d.profile_id).length;

  return (
    <KerangkaAdmin
      pengguna={pengguna}
      judul="Pengurus"
      aksi={
        <TombolUtama ukuran="sedang" type="button">
          + Tambah Pengurus
        </TombolUtama>
      }
    >
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {periode && <Lencana nada="brand">Masa bakti {periode.nama}</Lencana>}
        <span className="text-n-500 teks-3">{daftar.length} orang tercatat</span>
        {jumlahBelumBerakun > 0 && (
          <span className="text-n-500 teks-3">· {jumlahBelumBerakun} belum punya akun</span>
        )}
      </div>

      {daftar.length === 0 ? (
        <Kosong pesan="Belum ada data pengurus. Mulai dengan menambahkan nama dan jabatan." />
      ) : (
        <div className="flex flex-col gap-6">
          {perBidang.map(({ bidang, anggota }) => (
            <section key={bidang}>
              <JudulSeksi>{bidang}</JudulSeksi>
              <Kartu>
                {anggota.map((o, i) => (
                  <div
                    key={o.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      i > 0 ? "border-t border-n-100" : ""
                    }`}
                  >
                    <div className="h-9 w-9 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-[13px] font-semibold shrink-0">
                      {o.nama.replace(/^Ny\.\s*/i, "").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-n-800 font-medium truncate">{o.nama}</p>
                      <p className="teks-3 text-n-500 truncate">{o.jabatan}</p>
                    </div>
                    <Lencana nada={o.profile_id ? "ok" : "netral"}>
                      {o.profile_id ? "Punya akun" : "Belum berakun"}
                    </Lencana>
                  </div>
                ))}
              </Kartu>
            </section>
          ))}
        </div>
      )}

      <p className="teks-3 text-n-500 mt-5">
        Catatan: “Ny. Nur” pada Bidang Pendidikan masih menunggu nama lengkap. Pembuatan akun
        pengurus dan pengaturan perannya menyusul.
      </p>
    </KerangkaAdmin>
  );
}
