"use client";

/* ============================================================
   KOMPONEN DASAR
   Dipakai di seluruh aplikasi. Semua warna berasal dari design
   tokens (kelas brand-*, n-*, ok-*, warn-*, bad-*) — tidak ada
   warna yang ditulis mati di sini.
   ============================================================ */

import { forwardRef } from "react";

type Ukuran = "kecil" | "sedang" | "besar";

const ukuranKelas: Record<Ukuran, string> = {
  kecil: "h-9 px-3 text-[13px]",
  sedang: "h-11 px-4 text-[15px]",
  besar: "h-12 px-5 text-[15px]",
};

const dasar =
  "inline-flex items-center justify-center gap-2 rounded-token font-medium whitespace-nowrap " +
  "transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none";

export function TombolUtama({
  ukuran = "sedang",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { ukuran?: Ukuran }) {
  return (
    <button
      {...props}
      className={`${dasar} ${ukuranKelas[ukuran]} bg-brand-600 text-brand-contrast hover:bg-brand-700 ${className}`}
    />
  );
}

export function TombolSekunder({
  ukuran = "sedang",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { ukuran?: Ukuran }) {
  return (
    <button
      {...props}
      className={`${dasar} ${ukuranKelas[ukuran]} bg-n-0 text-n-700 border border-n-300 hover:bg-n-50 ${className}`}
    />
  );
}

export function TombolHalus({
  ukuran = "sedang",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { ukuran?: Ukuran }) {
  return (
    <button
      {...props}
      className={`${dasar} ${ukuranKelas[ukuran]} bg-transparent text-brand-700 hover:bg-brand-50 ${className}`}
    />
  );
}

export function TombolBahaya({
  ukuran = "sedang",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { ukuran?: Ukuran }) {
  return (
    <button
      {...props}
      className={`${dasar} ${ukuranKelas[ukuran]} bg-bad-fg text-white hover:opacity-90 ${className}`}
    />
  );
}

/* ---------- Kartu ---------- */

export function Kartu({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-token-lg border border-n-200 bg-n-0 border-edge ${className}`}
      style={{ boxShadow: "var(--shadow-1)" }}
    >
      {children}
    </div>
  );
}

export function JudulSeksi({
  children,
  aksi,
}: {
  children: React.ReactNode;
  aksi?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="judul-2 text-n-800">{children}</h2>
      {aksi}
    </div>
  );
}

/* ---------- Lencana status (warna tetap) ---------- */

export type NadaStatus = "ok" | "warn" | "bad" | "netral" | "brand";

const nadaKelas: Record<NadaStatus, string> = {
  ok: "bg-ok-bg text-ok-fg border-ok-line",
  warn: "bg-warn-bg text-warn-fg border-warn-line",
  bad: "bg-bad-bg text-bad-fg border-bad-line",
  netral: "bg-n-100 text-n-600 border-n-200",
  brand: "bg-brand-50 text-brand-700 border-brand-200",
};

export function Lencana({
  nada = "netral",
  children,
}: {
  nada?: NadaStatus;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${nadaKelas[nada]}`}
    >
      {children}
    </span>
  );
}

/* ---------- Formulir ---------- */

export function Kolom({
  label,
  bantuan,
  galat,
  children,
}: {
  label: string;
  bantuan?: string;
  galat?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-n-700 mb-1.5">{label}</span>
      {children}
      {bantuan && !galat && <span className="block teks-3 text-n-500 mt-1">{bantuan}</span>}
      {galat && <span className="block teks-3 text-bad-fg mt-1">{galat}</span>}
    </label>
  );
}

const gayaIsian =
  "w-full h-11 rounded-token border border-n-300 bg-n-0 px-3 text-[15px] text-n-800 " +
  "placeholder:text-n-400 focus:border-brand-500";

export const Isian = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Isian({ className = "", ...props }, ref) {
    return <input ref={ref} {...props} className={`${gayaIsian} ${className}`} />;
  },
);

export function AreaTeks({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${gayaIsian} h-auto min-h-[88px] py-2.5 ${className}`} />;
}

export function Pilihan({
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${gayaIsian} pr-8 ${className}`} />;
}

/* ---------- Keadaan kosong ---------- */

export function Kosong({
  pesan,
  aksi,
}: {
  pesan: string;
  aksi?: React.ReactNode;
}) {
  return (
    <div className="rounded-token-lg border border-dashed border-n-300 bg-n-0 px-6 py-10 text-center">
      <p className="text-n-600">{pesan}</p>
      {aksi && <div className="mt-4 flex justify-center">{aksi}</div>}
    </div>
  );
}
