import type { Metadata } from "next";
import { FormMasuk } from "@/components/form-masuk";

export const metadata: Metadata = { title: "Masuk" };

export default function HalamanMasuk() {
  return <FormMasuk />;
}
