"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lencana } from "@/components/dasar";
import { aturSembunyi } from "../aksi";

/** Tombol "Sembunyikan dari publik" untuk kegiatan sensitif. */
export function SembunyikanToggle({
  activityId,
  tersembunyi,
  boleh,
}: {
  activityId: string;
  tersembunyi: boolean;
  boleh: boolean;
}) {
  const router = useRouter();
  const [sedang, setSedang] = useState(false);
  const [pesan, setPesan] = useState("");

  if (!boleh) {
    return tersembunyi ? <Lencana nada="netral">Tersembunyi</Lencana> : null;
  }

  async function ubah() {
    setSedang(true);
    setPesan("");
    const r = await aturSembunyi(activityId, !tersembunyi);
    setSedang(false);
    if (r.galat) return setPesan(r.galat);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {pesan && <span className="teks-3 text-bad-fg">{pesan}</span>}
      <button
        type="button"
        onClick={ubah}
        disabled={sedang}
        className={`inline-flex h-11 items-center rounded-token border px-3.5 text-[14px] ${
          tersembunyi
            ? "border-warn-line bg-warn-bg text-warn-fg"
            : "border-n-300 bg-n-0 text-n-700 hover:bg-n-50"
        }`}
      >
        {tersembunyi ? "Tampilkan ke publik" : "Sembunyikan dari publik"}
      </button>
    </div>
  );
}
